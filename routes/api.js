const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const { isAuthenticated } = require('../middlewares/auth');

router.put('/user', isAuthenticated, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Nombre de usuario es obligatorio' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    user.username = username;
    await user.save();

    res.json({ message: 'Nombre de usuario actualizado con éxito.' });
  } catch (error) {
    console.error('❌ Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.get('/productos', async (req, res) => {
  try {
    const productos = await Product.find();
    res.json(productos);
  } catch (err) {
    res.status(500).send('Error al obtener productos');
  }
});

module.exports = router;
