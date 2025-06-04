const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Presupuesto = require('../models/Presupuesto');
const Soporte = require('../models/Soporte'); // si tienes este modelo

// Obtener todos los usuarios
router.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.json(usuarios);
  } catch (err) {
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
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener soporte' });
  }
});

module.exports = router;
