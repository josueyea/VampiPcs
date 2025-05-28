const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

router.get('/productos', async (req, res) => {
  try {
    const productos = await Product.find();
    res.json(productos);
  } catch (err) {
    res.status(500).send('Error al obtener productos');
  }
});

module.exports = router;
