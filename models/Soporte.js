const mongoose = require('mongoose');

const soporteSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Asegúrate de que coincida con el nombre del modelo de usuario
    required: true
  },
  asunto: {
    type: String,
    required: true
  },
  mensaje: {
    type: String,
    required: true
  },
  estado: {
    type: String,
    enum: ['pendiente', 'resuelto'],
    default: 'pendiente'
  },
  fecha: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Soporte', soporteSchema);