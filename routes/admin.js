const express = require('express');
const router = express.Router();
const Usuario = require('../models/User');
const Presupuesto = require('../models/Presupuesto');
const Soporte = require('../models/Soporte'); // si tienes este modelo

// Obtener todos los usuarios
router.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    console.log('Usuarios cargados:', usuarios);
    res.json(usuarios);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);   
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Obtener todos los presupuestos (con datos del usuario)
router.get('/presupuestos', async (req, res) => {
  try {
    const presupuestos = await Presupuesto.find().populate('usuarioId');
    res.json(presupuestos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener presupuestos' });
  }
});

// Obtener todos los tickets de soporte (si aplica)
router.get('/soporte', async (req, res) => {
  try {
    const tickets = await Soporte.find().populate('usuario');
    console.log("Tickets soporte:", tickets);
    res.json(tickets);
  } catch (err) {
    console.error("Error al obtener soporte:", err);
    res.status(500).json({ error: 'Error al obtener soporte' });
  }
});

// Actualizar rol de usuario
// Actualizar tanto rol como estado del usuario
router.put('/usuarios/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { rol, estado } = req.body;

    console.log('ID recibido:', id);
    console.log('Datos recibidos:', { rol, estado });

    const usuario = await Usuario.findById(id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualiza los campos si vienen
    if (rol !== undefined) usuario.rol = rol;
    if (estado !== undefined) usuario.estado = estado;

    await usuario.save();

    res.json({ mensaje: 'Usuario actualizado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});




module.exports = router;
