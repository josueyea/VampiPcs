// routes/api.js o routes/user.js (lo que uses para las rutas API)

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isAuthenticated } = require('../middlewares/auth');

router.put('/user', isAuthenticated, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Nombre de usuario es obligatorio' });

    // Actualizar el username
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    user.username = username;
    await user.save();

    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;
