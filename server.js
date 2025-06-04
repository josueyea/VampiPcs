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
const server = http.createServer(app);
const io = socketio(server);

io.on('connection', socket => {
  console.log('Usuario conectado');

  socket.on('joinRoom', room => {
    socket.join(room);
  });

  socket.on('chatMessage', async ({ room, message, sender }) => {
    const msg = new Message({ sender, room, message });
    await msg.save();
    io.to(room).emit('message', { sender, message, timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
});

require('./passport');
const { isAuthenticated, isAdmin } = require('./middlewares/auth');
const User = require('./models/User');

const app = express();


// --- CORS ---
const corsOptions = {
  origin: 'https://vampipcs.onrender.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,  // importantísimo que sea false
  optionsSuccessStatus: 204  // para que OPTIONS responda con 204 sin problema
};
app.use(cors(corsOptions));


const PORT = process.env.PORT || 3000;
const mongoURI = process.env.MONGODB_URI;

// Carpeta para subir fotos de perfil
const uploadDir = path.join(__dirname, '/uploads/profile_photos');

// Crear la carpeta si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


const upload = multer({ storage });


// --- Conexión a MongoDB ---
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// --- Session y Passport ---
const mongoStore = MongoStore.create({
  mongoUrl: mongoURI,
  ttl: 14 * 24 * 60 * 60
});

app.set('trust proxy', 1); // 🔒 Requerido para cookies secure detrás de proxy (como Render)

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

// --- Middleware adicional ---
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

  if (
    !req.isAuthenticated() &&
    req.method === 'GET' &&
    !isAuthRoute &&
    !isApiRoute &&
    !req.xhr
  ) {
    req.session.returnTo = req.originalUrl;
    console.log('📌 Guardando returnTo:', req.session.returnTo);
  }

  next();
});

// --- Rutas de autenticación ---
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// --- Rutas de presupuesto y API ---
const presupuestoRoutes = require('./routes/presupuesto');
const apiRoutes = require('./routes/api');
app.use('/presupuesto', presupuestoRoutes);
app.use('/api', apiRoutes);
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);



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
  console.log('🧠 req.isAuthenticated():', req.isAuthenticated());
  console.log('🧠 req.user:', req.user);
  console.log('🧠 req.session:', req.session);
  if (!req.isAuthenticated()) return res.status(401).send('No autorizado');

  try {
    const user = await User.findById(req.user._id).select('username email isAdmin profilePhoto');
    res.json(user);
  } catch (error) {
    res.status(500).send('Error en el servidor');
  }
});

const forgotPasswordRouter = require('./routes/auth');
app.use('/', forgotPasswordRouter);

// --- Contraseña: Olvido y Cambio ---
app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
});

app.get('/reset-password/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.send('Token inválido o expirado');

    res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
  } catch (error) {
    res.status(500).send('Error en el servidor');
  }
});

app.post('/reset-password', async (req, res) => {
  if (!req.isAuthenticated() || !req.user) return res.status(401).send('No autorizado');

  try {
    const user = await User.findById(req.user._id);
    const bcrypt = require('bcrypt');
    if (!user) return res.status(404).send('Usuario no encontrado');

    user.password = await bcrypt.hash(req.body.newPassword, 10);
    await user.save();

    res.send('Contraseña actualizada correctamente');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error en el servidor');
  }
});

app.get('/change-password', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'change-password.html'));
});

app.post('/admin/make-admin', isAuthenticated, isAdmin, async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).send('Usuario no encontrado');

    user.isAdmin = true;
    await user.save();

    res.send(`Usuario ${user.username} ahora es administrador.`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error en el servidor');
  }
});

// Ruta para subir foto de perfil
app.post('/profile/upload-photo', isAuthenticated, upload.single('profilePic'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No se subió ninguna imagen.');

    // ⚠️ Cloudinary devuelve la URL en req.file.path
    const user = await User.findById(req.user._id);
    user.profilePhoto = req.file.path; // esta es la URL de Cloudinary
    await user.save();

    res.send({ message: 'Foto de perfil actualizada.', photoUrl: user.profilePhoto });
  } catch (error) {
    console.error('❌ Error al subir la foto:', error);
    res.status(500).send('Error al subir la foto.');
  }
});


// --- Iniciar servidor ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});