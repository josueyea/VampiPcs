const PDFDocument = require('pdfkit');

function generarPDFStream(presupuesto) {
  const doc = new PDFDocument();
  doc.fontSize(18).text('Resumen del Presupuesto', { align: 'center' });
  doc.moveDown();

  presupuesto.componentes.forEach(c => {
    doc.fontSize(12).text(`${c.categoria}: ${c.nombre} - S/ ${c.precio.toFixed(2)}`);
  });

  if (presupuesto.incluyeMontaje) {
    doc.text('Servicio de armado: S/ 50.00');
  }

  doc.moveDown();
  doc.fontSize(14).text(`Total: S/ ${presupuesto.total.toFixed(2)}`, { bold: true });

  doc.end();
  return doc;
}
