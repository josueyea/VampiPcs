const path = require('path');
const express = require('express');
const router = express.Router();

const PDFDocument = require('pdfkit');

const Product = require('../models/Product');
const Presupuesto = require('../models/Presupuesto');

const { isAuthenticated, isAdmin } = require('../middlewares/auth');

const { createTransporter } = require('../utils/mailer');

const saveOriginalUrl = require('../middlewares/saveOriginalUrl');

// Ruta protegida con middleware para guardar URL
router.get('/nuevo', saveOriginalUrl, isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'nuevo-presupuesto.html'));
});

function generarPDFStream({ componentes, incluyeMontaje, total }) {
  const doc = new PDFDocument();

  doc.fontSize(18).text('Resumen del Presupuesto', { align: 'center' });
  doc.moveDown();

  componentes.forEach(c => {
    doc.fontSize(12).text(`${c.categoria}: ${c.nombre} - S/ ${c.precio.toFixed(2)}`);
  });

  if (incluyeMontaje) {
    doc.text('Servicio de armado: S/ 50.00');
  }

  doc.moveDown();
  doc.fontSize(14).text(`Total: S/ ${total.toFixed(2)}`, { bold: true });

  doc.end();
  return doc;
}

router.post('/enviar-email', isAuthenticated, async (req, res) => {
  try {
    const { componentes, incluyeMontaje, total } = req.body;
    const usuario = req.user;

    const presupuesto = { componentes, incluyeMontaje, total };

    const pdfDoc = generarPDFStream(presupuesto);

    const buffers = [];
    pdfDoc.on('data', buffers.push.bind(buffers));
    pdfDoc.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffers);

      try {
        const transporter = await createTransporter();

        await transporter.sendMail({
          from: `"Tu App de Presupuestos" <${process.env.EMAIL_USER}>`,
          to: usuario.email,
          subject: 'Tu presupuesto en PDF',
          text: 'Adjunto encontrarás tu presupuesto en PDF.',
          attachments: [
            {
              filename: 'presupuesto.pdf',
              content: pdfBuffer,
            },
          ],
        });

        res.json({ mensaje: 'Correo enviado correctamente' });
      } catch (error) {
        console.error('❌ Error al enviar el correo:', error);
        res.status(500).json({ mensaje: 'Error al enviar el correo' });
      }
    });
  } catch (error) {
    console.error('❌ Error general:', error);
    res.status(500).json({ mensaje: 'Error al procesar el envío de correo' });
  }
});


// Guardar un presupuesto (usuarios autenticados)
router.post('/guardar', isAuthenticated, async (req, res) => {
  const { componentes, incluyeMontaje, total } = req.body;


  try {
    const nuevoPresupuesto = new Presupuesto({
      usuarioId: req.user._id,
      componentes,
      incluyeMontaje,
      total
    });

    await nuevoPresupuesto.save();
    res.status(200).json({ mensaje: 'Presupuesto guardado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al guardar el presupuesto' });
  }
});

// 📌 Ruta protegida solo para administradores
router.get('/admin', isAdmin, async (req, res) => {

  console.log('✅ Entrando a /admin');
  console.log('Usuario:', req.user);

  try {
    console.log('Usuario admin accediendo:', req.user.email);
    const presupuestos = await Presupuesto.find().populate('usuarioId', 'username email');
    res.json(presupuestos);
  } catch (err) {
    console.error('Error en /admin:', err);
    res.status(500).json({ message: 'Error al obtener los presupuestos' });
  }
});

// Mostrar la página del formulario
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/presupuesto.html'));
});

// API para obtener productos en JSON
router.get('/productos', async (req, res) => {
  try {
    const productos = await Product.find();
    res.json(productos);
  } catch (err) {
    console.error('Error al cargar productos:', err);
    res.status(500).json({ error: 'Error al cargar los productos' });
  }
});

// Ruta para insertar productos de prueba
router.post('/insertar-productos-prueba', isAdmin, async (req, res) => {
  try {
    const productosPrueba = [
      { nombre: 'Intel Core i7', precio: 1200, categoria: 'Procesador', descripcion: 'Intel 10ª Gen' },
      { nombre: 'AMD Ryzen 5', precio: 1000, categoria: 'Procesador', descripcion: 'AMD Ryzen 5000' },
      { nombre: 'NVIDIA RTX 3060', precio: 1500, categoria: 'Tarjeta gráfica', descripcion: 'RTX 3060 12GB' },
      { nombre: 'AMD Radeon RX 6600', precio: 1400, categoria: 'Tarjeta gráfica', descripcion: 'RX 6600 XT' },
      { nombre: 'ASUS Prime Z590', precio: 800, categoria: 'Placa base', descripcion: 'Placa base ASUS' },
      { nombre: 'MSI B450', precio: 600, categoria: 'Placa base', descripcion: 'Placa base MSI' },
      { nombre: 'Corsair Vengeance 16GB', precio: 400, categoria: 'Memoria (RAM)', descripcion: 'DDR4 3200MHz' },
      { nombre: 'G.Skill Ripjaws 16GB', precio: 350, categoria: 'Memoria (RAM)', descripcion: 'DDR4 3000MHz' },
      { nombre: 'Samsung SSD 1TB', precio: 450, categoria: 'Almacenamiento', descripcion: 'SSD NVMe 1TB' },
      { nombre: 'WD HDD 2TB', precio: 300, categoria: 'Almacenamiento', descripcion: 'Disco duro 2TB' },
      { nombre: 'Corsair 650W', precio: 350, categoria: 'Fuente de alimentación (PSU)', descripcion: 'PSU 650W' },
      { nombre: 'EVGA 550W', precio: 280, categoria: 'Fuente de alimentación (PSU)', descripcion: 'PSU 550W' },
      { nombre: 'Cooler Master', precio: 150, categoria: 'Refrigeración del sistema', descripcion: 'Ventilador CPU' },
      { nombre: 'NZXT Kraken', precio: 350, categoria: 'Refrigeración del sistema', descripcion: 'Refrigeración líquida' },
    ];

    await Product.insertMany(productosPrueba);

    res.json({ mensaje: 'Productos de prueba insertados correctamente' });
  } catch (error) {
    console.error('Error al insertar productos de prueba:', error);
    res.status(500).json({ error: 'Error al insertar productos de prueba' });
  }
});

router.post('/generar-pdf', async (req, res) => {
  try {
    const { componentes, incluyeMontaje, total } = req.body;

    const doc = new PDFDocument();

    // Encabezados para enviar PDF al cliente
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=presupuesto.pdf');

    doc.pipe(res);

    // Contenido del PDF
    doc.fontSize(18).text('Resumen del Presupuesto', { align: 'center' });
    doc.moveDown();

    componentes.forEach(c => {
      doc.fontSize(12).text(`${c.categoria}: ${c.nombre} - S/ ${c.precio.toFixed(2)}`);
    });

    if (incluyeMontaje) {
      doc.text('Servicio de armado: S/ 50.00');
    }

    doc.moveDown();
    doc.fontSize(14).text(`Total: S/ ${total.toFixed(2)}`, { bold: true });

    doc.end();

  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ error: 'Error generando PDF' });
  }
});


module.exports = router;
