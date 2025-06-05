const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Definir esquema de usuario con timestamps y validaciones
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    trim: true,
    match: [/^[a-zA-Z0-9_-]{3,30}$/, 'Username inválido. Solo letras, números, guiones y guion bajo. 3-30 caracteres.']
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  password: { 
    type: String, 
    required: function () {
      return !this.googleId; // Solo se requiere si no es usuario de Google
    }
  },
  googleId: { // <-- NUEVO campo para soporte OAuth
    type: String,
    unique: true,
    sparse: true // Permite múltiples usuarios sin googleId
  },

  isAdmin: {
    type: Boolean,
    default: false
  },

  profilePhoto: {
    type: String,
    default: '/uploads/usuario.png' // o la ruta a una imagen por defecto
  },

  roles: {
    type: String,
    enum: ['usuario', 'admin', 'vendedor', 'moderador', 'soporte', 'tecnico'],
    default: 'usuario'
  },
  estado: {
    type: String,
    enum: ['activo', 'suspendido'],
    default: 'activo'
  },

}, { timestamps: true });

// Middleware para convertir email a minúsculas antes de guardar (por si no usas lowercase)
userSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// Middleware para hashear contraseña antes de guardar
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Método para comparar contraseña al hacer login
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Campos para recuperación de contraseña
userSchema.add({
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});

// Campos para verificación de correo
userSchema.add({
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String
});

module.exports = mongoose.model('User', userSchema);