const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  nombre: String,
  precio: Number,
  descripcion: String,
  categoria: String, 
});

module.exports = mongoose.model('Product', ProductSchema);
