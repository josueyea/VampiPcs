require('dotenv').config();

console.log('🚨 El servidor está arrancando...');

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { storage } = require('./config/cloudinary');
const multer = require('multer');
const fs = require('fs');

require('./passport');
const { isAuthenticated, isAdmin } = require('./middlewares/auth');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// --- CORS ---
const corsOptions = {
  origin: 'https://vampipcs.onrender.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

const PORT = process.env.PORT || 3000;
const mongoURI = process.env.MONGODB_URI;

// --- Crear carpeta de subida si no existe ---
const uploadDir = path.join(__dirname, '/uploads/profile_photos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ storage });

// --- Conexión a MongoDB ---
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// --- Sesiones y Passport ---
const mongoStore = MongoStore.create({
  mongoUrl: mongoURI,
  ttl: 14 * 24 * 60 * 60
});

app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'secretosecreto',
  resave: false,
  saveUninitialized: false,
  store: mongoStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 14
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// --- Middlewares ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

app.use((req, res, next) => {
  const isAuthRoute = req.path.startsWith('/auth') || req.path === '/login' || req.path === '/register';
  const isApiRoute = req.path.startsWith('/api');
  if (!req.isAuthenticated() && req.method === 'GET' && !isAuthRoute && !isApiRoute && !req.xhr) {
    req.session.returnTo = req.originalUrl;
    console.log('📌 Guardando returnTo:', req.session.returnTo);
  }
  next();
});

// --- Rutas ---
app.use('/auth', require('./routes/auth'));
app.use('/presupuesto', require('./routes/presupuesto'));
app.use('/api', require('./routes/api'));
app.use('/api/admin', require('./routes/admin'));

// --- Modelo de mensajes ---
const messageSchema = new mongoose.Schema({
  room: String,
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: String,
  timestamp: { type: Date, default: Date.now }
});
const MessageModel = mongoose.model('Message', messageSchema);

async function getRoomMessages(room) {
  const messages = await MessageModel.find({ room })
    .sort({ timestamp: 1 })
    .limit(100)
    .populate('sender', 'username profilePhoto');
  return messages.map(msg => ({
    message: msg.message,
    sender: {
      _id: msg.sender._id,
      username: msg.sender.username,
      profilePhoto: msg.sender.profilePhoto || null
    },
    timestamp: msg.timestamp,
    room: msg.room
  }));
}

// --- Socket.IO ---
const defaultMessages = {
  'soporte-general': 'Hola, bienvenido al soporte general. ¿En qué podemos ayudarte?',
  'tecnico': 'Hola, soy del soporte técnico. ¿Cuál es tu problema?',
  'vendedores': 'Hola, estás en contacto con un vendedor. ¿Qué deseas saber?',
  'moderadores': 'Hola, soy un moderador. ¿En qué te puedo ayudar?',
  'admins': 'Hola, estás hablando con un administrador.'
};

const publicRooms = [
  'soporte-general', 'tecnico', 'chat-general', 'intercambios',
  'vendedores', 'moderadores', 'admins'
];

const staffRoleMap = {
  'soporte-general': 'soporte',
  'tecnico': 'tecnico',
  'vendedores': 'vendedor',
  'moderadores': 'moderador',
  'admins': 'admin'
};

io.use(async (socket, next) => {
  const userID = socket.handshake.query.userID;
  if (!userID) return next(new Error('No userID'));
  try {
    const user = await User.findById(userID);
    if (!user) return next(new Error('Usuario no encontrado'));
    socket.user = user;
    next();
  } catch (err) {
    console.error('Error de autenticación socket:', err);
    next(new Error('Error de autenticación'));
  }
});

io.on('connection', socket => {
  console.log('✅ Usuario conectado:', socket.user.username);

  socket.on('joinRoom', async (room) => {
    if (!publicRooms.includes(room)) return socket.emit('errorMessage', 'Sala no válida');

    publicRooms.forEach(r => {
      if (r !== room && socket.rooms.has(r)) socket.leave(r);
    });

    socket.join(room);
    console.log(`${socket.user.username} se unió a ${room}`);

    const history = await MessageModel.find({ room })
      .sort({ timestamp: 1 })
      .limit(100)
      .populate('sender', 'username profilePhoto');
    console.log('👉 Enviando mensaje del sistema a', socket.user.username);
    socket.emit('roomMessages', history.map(msg => ({
      message: msg.message,
      sender: {
        _id: msg.sender._id,
        username: msg.sender.username,
        profilePhoto: msg.sender.profilePhoto || null
      },
      timestamp: msg.timestamp,
      room: msg.room
    })));

    // ✅ Ahora enviamos el mensaje predeterminado DESPUÉS del historial
    if (defaultMessages[room]) {
      console.log('Enviando mensaje predeterminado:', defaultMessages[room]);
      socket.emit('message', {
        sender: { username: 'Sistema', profilePhoto: '/img/toji.jpg' },
        message: defaultMessages[room],
        timestamp: new Date(),
        room
      });
    }
  });

  socket.on('joinSupportRoom', async (roomType) => {
    const validTypes = ['soporte-general', 'tecnico', 'chat-general', 'intercambios', 'vendedores', 'moderadores', 'admins'];
    if (!validTypes.includes(roomType)) {
      return socket.emit('errorMessage', 'Tipo de soporte no válido');
    }

    let roomName;

    // ✅ Si es sala de técnico
    if (roomType === 'tecnico') {
      if (socket.userRole === 'tecnico') {
        // Un técnico se une a todas las salas activas
        const activeUsers = await getActiveTechRooms(); // debes implementarlo
        activeUsers.forEach(userID => {
          socket.join(`tecnico-${userID}`);
        });
        return socket.emit('joinedPrivateRoom', { room: null, type: 'tecnico' }); // o mostrar lista
      } else {
        roomName = `tecnico-${socket.userID}`;
        socket.join(roomName);
        socket.emit('joinedPrivateRoom', { room: roomName, type: 'tecnico' });

        // Buscar sockets de técnicos conectados y unirlos a esta sala
        const sockets = await io.fetchSockets();
        sockets.forEach(s => {
          if (s.userRole === 'tecnico') {
            s.join(roomName);
            s.emit('notificacionSoporte', {
              room: roomName,
              username: socket.username
            });
          }
        });

        const messages = await getRoomMessages(roomName);
        socket.emit('roomMessages', messages);
      }
    } else {
      // Otras salas normales
      roomName = roomType;
      socket.join(roomName);
      socket.emit('joinedPrivateRoom', { room: roomName, type: roomType });

      const messages = await getRoomMessages(roomName);
      socket.emit('roomMessages', messages);
    }
  });

  socket.on('chatMessage', async ({ room, message }) => {
    if (!room || typeof room !== 'string') return socket.emit('errorMessage', 'Sala no válida');

    const newMsg = new MessageModel({
      room,
      sender: socket.user._id,
      message
    });

    await newMsg.save();

    const populatedMsg = await newMsg.populate('sender', 'username profilePhoto');

    io.to(room).emit('message', {
      message: populatedMsg.message,
      sender: {
        _id: populatedMsg.sender._id,
        username: populatedMsg.sender.username,
        profilePhoto: populatedMsg.sender.profilePhoto || null
      },
      timestamp: populatedMsg.timestamp,
      room: populatedMsg.room
    });
  });

  socket.on('joinPrivateRoom', async ({ withUserID }) => {
    const roomName = [socket.user._id.toString(), withUserID].sort().join('_');
    socket.join(roomName);

    const lastMessages = await MessageModel.find({ room: roomName })
      .sort({ timestamp: 1 })
      .limit(50)
      .populate('sender', 'username profilePhoto');

    socket.emit('chatHistory', lastMessages.map(msg => ({
      message: msg.message,
      sender: {
        _id: msg.sender._id,
        username: msg.sender.username,
        profilePhoto: msg.sender.profilePhoto || null
      },
      timestamp: msg.timestamp,
      room: msg.room
    })));
  });

  socket.on('joinPublicRoom', async (room) => {
    try {
      if (!publicRooms.includes(room)) {
        return socket.emit('errorMessage', 'Sala pública no válida');
      }

      publicRooms.forEach(r => {
        if (r !== room && socket.rooms.has(r)) socket.leave(r);
      });

      socket.join(room);
      console.log(`${socket.user.username} se unió a sala pública: ${room}`);

      // Enviar mensaje predeterminado solo a usuarios normales
      if (defaultMessages[room] && socket.user.roles.includes('usuario')) {
        socket.emit('message', {
          sender: { username: 'Sistema', profilePhoto: '/img/toji.jpg' },
          message: defaultMessages[room],
          timestamp: new Date(),
          room
        });
      }

      const history = await MessageModel.find({ room })
        .sort({ timestamp: 1 })
        .limit(100)
        .populate('sender', 'username profilePhoto');

      socket.emit('roomMessages', history.map(msg => ({
        message: msg.message,
        sender: {
          _id: msg.sender._id,
          username: msg.sender.username,
          profilePhoto: msg.sender.profilePhoto || null
        },
        timestamp: msg.timestamp,
        room: msg.room
      })));
    } catch (error) {
      console.error('Error en joinPublicRoom:', error);
      socket.emit('errorMessage', 'Error al unirse a la sala pública');
    }
  });

  socket.on('privateMessage', async ({ toUserID, message }) => {
    const roomName = [socket.user._id.toString(), toUserID].sort().join('_');

    const newMsg = new MessageModel({
      room: roomName,
      sender: socket.user._id,
      message
    });

    await newMsg.save();

    const populatedMsg = await newMsg.populate('sender', 'username profilePhoto');

    io.to(roomName).emit('message', {
      message: populatedMsg.message,
      sender: {
        _id: populatedMsg.sender._id,
        username: populatedMsg.sender.username,
        profilePhoto: populatedMsg.sender.profilePhoto || null
      },
      timestamp: populatedMsg.timestamp,
      room: populatedMsg.room
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Usuario desconectado: ${socket.user.username}`);
  });

  function findSocketsByUserId(userId) {
    const sockets = [];
    for (const [id, s] of io.of("/").sockets) {
      if (s.user && s.user._id.toString() === userId) {
        sockets.push(s);
      }
    }
    return sockets;
  }
});

// --- Nodemailer ---
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- Rutas específicas ---
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({ emailVerificationToken: req.params.token });
    if (!user) return res.send('Token inválido');
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();
    res.send('✅ Tu cuenta ha sido verificada correctamente. Ya puedes iniciar sesión.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error en la verificación');
  }
});

app.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/api/user', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).send('No autorizado');
  try {
    const user = await User.findById(req.user._id).select('username email isAdmin profilePhoto');
    res.json(user);
  } catch (error) {
    res.status(500).send('Error en el servidor');
  }
});

app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
});

// --- Arrancar servidor ---
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
