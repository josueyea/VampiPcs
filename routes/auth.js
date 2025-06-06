const express = require('express');
const User = require('../models/User');
const passport = require('passport');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

// ✅ Confirmación de carga del módulo
console.log('🚦 Cargando rutas de autenticación...');

// Iniciar login con Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Callback de Google
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    console.log('✅ Autenticación exitosa con Google:', req.user);
    res.redirect('https://vampipcs.onrender.com/index.html');
  }
);

router.get('/success', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  res.json({
    user: {
      _id: req.user._id,
      username: req.user.username || req.user.displayName,
      email: req.user.email,
      profilePhoto: req.user.profilePhoto || (req.user.photos && req.user.photos[0]?.value) || '',
    }
  });
});

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

// Configurar nodemailer
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- Registro ---
router.post('/register', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: '⚠️ Todos los campos son obligatorios' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: '⚠️ Las contraseñas no coinciden' });
  }

  try {
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
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

    const verificationUrl = `https://vampipcs.onrender.com/auth/verify/${token}`;
    const mailOptions = {
      to: newUser.email,
      subject: 'Verificación de cuenta',
      text: `Hola ${newUser.username},\n\nVerifica tu cuenta haciendo clic en el siguiente enlace:\n\n${verificationUrl}`
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: '✅ Registro exitoso. Verifica tu correo electrónico.' });
  } catch (err) {
    console.error('Error en registro:', err);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

// --- Verificar cuenta ---
router.get('/verify/:token', async (req, res) => {
  const token = req.params.token;

  try {
    const user = await User.findOne({ emailVerificationToken: token });

    if (!user) {
      return res.status(400).send('Token de verificación inválido o expirado');
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.redirect('/login.html');
  } catch (err) {
    console.error('Error al verificar cuenta:', err);
    res.status(500).send('Error del servidor');
  }
});

// --- Login ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: '⚠️ Todos los campos son obligatorios' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({ message: '⚠️ Credenciales incorrectas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: '⚠️ Credenciales incorrectas' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: '⚠️ Verifica tu correo electrónico primero' });
    }

    req.login(user, (err) => {
      if (err) {
        console.error('Error en req.login:', err);
        return res.status(500).json({ message: 'Error iniciando sesión' });
      }
      return res.status(200).json({
        message: '✅ Inicio de sesión exitoso',
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          profilePhoto: user.profilePhoto || '',
          isAdmin: user.isAdmin,
          estado: user.estado
        }
      });
    });

  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

// --- Enviar correo para restablecer contraseña ---
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: '⚠️ El correo no está registrado' });

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;

    await user.save();

    const resetUrl = `https://vampipcs.onrender.com/reset-password.html?token=${token}`;
    const mailOptions = {
      to: user.email,
      subject: 'Restablecer contraseña',
      text: `Hola ${user.username},\n\nHaz clic en el siguiente enlace para restablecer tu contraseña:\n\n${resetUrl}`
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: '✅ Revisa tu correo para restablecer tu contraseña' });
  } catch (err) {
    console.error('Error en forgot-password:', err);
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

// --- Restablecer contraseña ---
router.post('/reset-password/:token', async (req, res) => {
  const { password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: '⚠️ Las contraseñas no coinciden' });
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: '⚠️ Token inválido o expirado' });
    }

    user.password = password; // ⚠️ Ya no usar bcrypt aquí
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save(); // El pre('save') lo encripta correctamente

    return res.status(200).json({ message: '✅ Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error en reset-password:', err);
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
