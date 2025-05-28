const mongoose = require('mongoose');

const componenteSchema = new mongoose.Schema({
  categoria: String,
  nombre: String,
  precio: Number,
});

const presupuestoSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  componentes: [componenteSchema],
  incluyeMontaje: Boolean,
  total: Number,
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Presupuesto', presupuestoSchema);

