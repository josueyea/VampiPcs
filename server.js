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
const solicitudesPendientes = [];

require('./passport');
const { isAuthenticated, isAdmin } = require('./middlewares/auth');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const Message = require('./models/Message');


const techSockets = new Map();  // userID => socket
const userSockets = new Map();  // userID => socket

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


async function getRoomMessages(room) {
  const messages = await Message.find({ room })
    .sort({ timestamp: 1 })
    .limit(100)
    .populate('sender', 'username profilePhoto');

  // Filtrar mensajes sin sender válido
  return messages
    .filter(msg => msg.sender && msg.sender.username)
    .map(msg => ({
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


async function getActiveTechRooms() {
  const sockets = await io.fetchSockets(); // obtener todos los sockets conectados
  const techUserIds = [];

  sockets.forEach(s => {
    if (s.user && s.user.roles && s.user.roles.includes('tecnico')) {
      techUserIds.push(s.user._id.toString()); // guardamos solo el ID
    }
  });

  return techUserIds;
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

    console.log('Roles del usuario en socket:', socket.user.roles); // <-- Aquí

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

    const history = await Message.find({ room }).sort({ timestamp: 1 }).limit(100).populate('sender', 'username profilePhoto');

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

    if (defaultMessages[room]) {
      socket.emit('message', {
        sender: { username: 'Sistema', profilePhoto: '/img/toji.jpg' },
        message: defaultMessages[room],
        timestamp: new Date(),
        room
      });
    }
  });

  if (socket.user.roles && socket.user.roles.includes('tecnico')) {
    socket.join('tecnico');
    // Enviar solicitudes pendientes al técnico que se conecta
    socket.emit('actualizarSolicitudes', solicitudesPendientes);
  }

  socket.on('joinSupportRoom', async (roomType) => {
    const validTypes = ['soporte-general', 'tecnico', 'chat-general', 'intercambios', 'vendedores', 'moderadores', 'admins'];
    if (!validTypes.includes(roomType)) {
      return socket.emit('errorMessage', 'Tipo de soporte no válido');
    }

    if (roomType === 'tecnico') {
      socket.join('tecnico');
      socket.emit('joinedPrivateRoom', { room: 'tecnico', type: 'tecnico' });
      const messages = await getRoomMessages('tecnico');
      socket.emit('roomMessages', messages);
      return;
    }

    // Para otras salas
    roomName = roomType;
    socket.join(roomName);
    socket.emit('joinedPrivateRoom', { room: roomName, type: roomType });

    const messages = await getRoomMessages(roomName);
    socket.emit('roomMessages', messages);
  });

  socket.on('solicitarSoporte', async () => {
    const roomName = `tecnico-${socket.user._id}`;
    socket.join(roomName);

    // Agrega la solicitud si aún no está
    const yaExiste = solicitudesPendientes.find(s => s.userId === socket.user._id.toString());
    if (!yaExiste) {
      const nuevaSolicitud = {
        userId: socket.user._id.toString(),
        username: socket.user.username,
        profilePhoto: socket.user.profilePhoto || '/img/default-user.png'
      };
      solicitudesPendientes.push(nuevaSolicitud);

      // Notifica a todos los técnicos en la sala 'tecnico'
      io.to('tecnico').emit('actualizarSolicitudes', solicitudesPendientes);

      // Notifica específicamente de esta nueva solicitud
      io.to('tecnico').emit('notificacionSoporte', {
        room: roomName,
        username: nuevaSolicitud.username,
        userId: nuevaSolicitud.userId,
      });
    }

    const messages = await getRoomMessages(roomName);
    socket.emit('roomMessages', messages);
  });

  socket.on('chatMessage', async ({ room, message }) => {
    if (!room || typeof room !== 'string') return socket.emit('errorMessage', 'Sala no válida');

    const newMsg = new Message({
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
    try {
      const ids = [socket.user._id.toString(), withUserID].sort();
      const room = `private-${ids[0]}-${ids[1]}`;

      socket.join(room);

      const withUser = await User.findById(withUserID).select('username profilePhoto');
      if (!withUser) {
        return socket.emit('errorMessage', 'Usuario no encontrado');
      }

      socket.emit('joinedPrivateRoom', { room, type: 'private', withUser });

      const messages = await Message.find({ room }).sort({ timestamp: 1 }).populate('sender', 'username profilePhoto').lean();
      socket.emit('roomMessages', messages);

    } catch (error) {
      console.error('Error uniendo a sala privada:', error);
      socket.emit('errorMessage', 'No se pudo unir a la sala privada.');
    }
  });

  // Escuchar mensajes y reenviarlos a todos los que están en la sala
  socket.on('chatMessage', async ({ room, message }) => {
    if (!room || !message) return;

    const newMessage = new Message({
      room,
      message,
      sender: socket.user._id,
      timestamp: new Date()
    });

    await newMessage.save();

    // Populamos sender para enviar info completa a los clientes
    await newMessage.populate('sender', 'username profilePhoto');

    io.to(room).emit('message', {
      room,
      message: newMessage.message,
      sender: {
        _id: newMessage.sender._id,
        username: newMessage.sender.username,
        profilePhoto: newMessage.sender.profilePhoto || null
      },
      timestamp: newMessage.timestamp
    });
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

      // CORRECCIÓN: Verificar roles como array, y si incluye 'usuario' para mostrar mensajes
      if (defaultMessages[room] && socket.user.roles && socket.user.roles.includes('usuario')) {
        socket.emit('message', {
          sender: { username: 'Sistema', profilePhoto: '/img/toji.jpg' },
          message: defaultMessages[room],
          timestamp: new Date(),
          room
        });
      }

      const history = await Message.find({ room })
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

    const newMsg = new Message({
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
