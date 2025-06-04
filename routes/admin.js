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
router.put('/usuarios/:id/rol', async (req, res) => {
  try {
    const { rol } = req.body;
    await Usuario.findByIdAndUpdate(req.params.id, { rol });
    res.json({ mensaje: 'Rol actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
});

// Actualizar estado de usuario
router.put('/usuarios/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    await Usuario.findByIdAndUpdate(req.params.id, { estado });
    res.json({ mensaje: 'Estado actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});


module.exports = router;
