require('dotenv').config();


console.log('🚨 El servidor está arrancando...');

const PORT = process.env.PORT || 3000;


const mongoURI = process.env.MONGODB_URI;

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const cors = require('cors');  // <---- IMPORTAR CORS AQUÍ
require('./passport');
const { isAuthenticated, isAdmin } = require('./middlewares/auth');

const User = require('./models/User');

const app = express();

const corsOptions = {
  origin: 'https://vampipcs.onrender.com',  // Cambia esto si tu frontend corre en otro puerto o dominio
  credentials: true,                 // Necesario para enviar cookies y sesiones
};

// --- Configurar CORS ---
app.use(cors(corsOptions));

// --- Conexión a MongoDB ---
mongoose.connect(mongoURI)
  .then(() => {
    console.log('✅ MongoDB conectado');

    const mongoStore = MongoStore.create({
      client: mongoose.connection.getClient(),
      ttl: 14 * 24 * 60 * 60
    });

    // Middleware que depende de la base de datos
    app.use(session({
      secret: process.env.SESSION_SECRET || 'secretosecreto',
      resave: false,
      saveUninitialized: false,
      store: mongoStore,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 14
      }
    }));

    // Iniciar servidor solo después de que todo esté listo
    app.listen(PORT, () => {
      console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
  });

// --- Middleware ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  console.log('👤 Usuario autenticado:', req.user);
  next();
});

app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

app.use((req, res, next) => {
  const isAuthRoute = req.path.startsWith('/auth') || req.path === '/login' || req.path === '/register';
  const isApiRoute = req.path.startsWith('/api'); // ← Agregado

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


// --- Rutas de autenticación (login, registro, logout) ---
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// --- NUEVAS RUTAS DE PRESUPUESTO Y API ---
const presupuestoRoutes = require('./routes/presupuesto');
const apiRoutes = require('./routes/api');
app.use('/presupuesto', presupuestoRoutes);
app.use('/api', apiRoutes);

// --- Nodemailer configuración ---
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
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
// --- Rutas protegidas ---
app.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/api/user', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).send('No autorizado');

  try {
    const user = await User.findById(req.user._id).select('username email isAdmin');
    res.json(user);
  } catch (error) {
    res.status(500).send('Error en el servidor');
  }
});


// --- Logout ---
app.get('/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// --- Resto de rutas: olvido y cambio de contraseña (sin cambios) ---

// GET formulario forgot-password
app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
});
// GET reset-password con token
app.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.send('Token inválido o expirado');

    res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
  } catch (error) {
    res.status(500).send('Error en el servidor');
  }
});

// POST cambio de contraseña para usuarios logueados
app.post('/reset-password', async (req, res) => {
  if (!req.isAuthenticated() || !req.user) return res.status(401).send('No autorizado');

  const { newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).send('Usuario no encontrado');

    user.password = newPassword;
    await user.save();

    res.send('Contraseña actualizada correctamente');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error en el servidor');
  }
});

// GET change-password (formulario protegido con Passport)
app.get('/change-password', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'change-password.html'));
});

app.post('/admin/make-admin', isAuthenticated, isAdmin, async (req, res) => {
  if (!req.isAuthenticated() || !req.user.isAdmin) {
    return res.status(403).send('No autorizado');
  }

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
