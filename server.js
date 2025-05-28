console.log('🚨 El servidor está arrancando...');

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const cors = require('cors');  // <---- IMPORTAR CORS AQUÍ
require('./passport');
const { isAuthenticated, isAdmin } = require('./middlewares/auth');


const User = require('./models/User');

const app = express();

const corsOptions = {
  origin: 'http://localhost:3000',  // Cambia esto si tu frontend corre en otro puerto o dominio
  credentials: true,                 // Necesario para enviar cookies y sesiones
};

// --- Configurar CORS ---
app.use(cors({
  origin: 'http://localhost:3000',  // Cambia al URL de tu frontend si es diferente
  credentials: true
}));

// --- Conexión a MongoDB ---
mongoose.connect('mongodb://localhost:27017/loginApp')
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.log('❌ Error de conexión:', err));

// --- Middleware ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'un-secreto-muy-seguro',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 3600000,
    sameSite: 'lax',  // <-- ayuda a mantener sesión en SPA
    secure: false     // <-- solo en producción con HTTPS va true
  }

}));
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
    user: 'apolinarioelman@gmail.com',
    pass: 'ndiy jtum omwf ikxj'
  }
});

app.post('/register', async (req, res) => {

  console.log('Datos recibidos:', req.body);

  const { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: '⚠️ Todos los campos son obligatorios' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: '⚠️ Las contraseñas no coinciden' });
  }

  try {
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ message: '⚠️ Ya existe un usuario con ese email o username' });
    }

    const token = crypto.randomBytes(20).toString('hex');

    const newUser = new User({
      username,
      email: email.toLowerCase(),
      password,
      emailVerificationToken: token,
      isVerified: false
    });

    await newUser.save();

    const verificationUrl = `http://localhost:3000/verify/${token}`;
    const mailOptions = {
      to: newUser.email,
      subject: 'Verificación de cuenta',
      text: `Hola ${newUser.username},\n\nPor favor verifica tu cuenta haciendo clic en el siguiente enlace:\n\n${verificationUrl}`
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: '✅ Registro exitoso. Verifica tu correo electrónico.' });
  } catch (err) {
    console.error('Error en registro:', err);

    // Captura errores de validación de Mongoose para que el cliente los vea
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: errors.join(', ') });
    }

    return res.status(500).json({ message: 'Error en el servidor' });
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

// --- Login tradicional usando Passport ---
app.post('/login', async (req, res, next) => {
  const loginInput = req.body.email.trim().toLowerCase();
  const password = req.body.password;

  try {
    const user = await User.findOne({
      $or: [
        { email: loginInput },
        { username: loginInput }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Debes verificar tu email antes de iniciar sesión.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    req.login(user, (err) => {
      if (err) return next(err);

      req.session.userId = user._id;

      const redirectTo = req.session.returnTo || '/index.html';
      delete req.session.returnTo;

      return res.status(200).json({
        message: 'Inicio de sesión exitoso',
        redirectTo,
        user: {
          username: user.username,
          email: user.email
        }
      });
    });
  } catch (error) {
    console.error(error);
    next(error);
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

// POST para enviar correo de recuperación
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).send('Usuario no encontrado');

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `http://localhost:3000/reset-password/${token}`;

    const mailOptions = {
      to: user.email,
      from: 'no-reply@tusitio.com',
      subject: 'Recuperación de contraseña',
      text: `Hola,\n\nPara restablecer tu contraseña haz clic en este enlace:\n\n${resetUrl}\n\nSi no solicitaste esto, ignora este mensaje.`
    };

    await transporter.sendMail(mailOptions);
    res.redirect('/email-enviado.html');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error en el servidor');
  }
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

// POST reset-password con token
app.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.send('Token inválido o expirado');

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.send('Contraseña actualizada correctamente');
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

// GET change-password (formulario)
app.get('/change-password', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
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



const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});