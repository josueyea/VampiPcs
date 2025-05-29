const categorias = [
  'Procesador',
  'Tarjeta gráfica',
  'Placa base',
  'Memoria (RAM)',
  'Almacenamiento',
  'Fuente de alimentación (PSU)',
  'Refrigeración del sistema'
];

const toggleBtn = document.getElementById('toggleMode');
let darkMode = false;

// Ver si el usuario tenía un modo guardado
const modoGuardado = localStorage.getItem('modo') || 'claro';
if (modoGuardado === 'oscuro') {
  document.body.classList.add('dark-mode');
  toggleBtn.textContent = '☀️';
} else {
  toggleBtn.textContent = '🌙';
}

toggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const esOscuro = document.body.classList.contains('dark-mode');
  toggleBtn.textContent = esOscuro ? '☀️' : '🌙';
  localStorage.setItem('modo', esOscuro ? 'oscuro' : 'claro');
});

async function cargarProductos() {
  try {
    const res = await fetch('/presupuesto/productos', {
      credentials: 'include'
    });

    const productos = await res.json();

    const contenedor = document.getElementById('selectors-productos');
    contenedor.innerHTML = '';

    categorias.forEach(categoria => {
      const productosCategoria = productos.filter(p => p.categoria === categoria);
      const div = document.createElement('div');

      let optionsHTML = '<option value="0">-- Selecciona --</option>';
      productosCategoria.forEach(p => {
        optionsHTML += `<option value="${p.precio}">${p.nombre} - S/ ${p.precio}</option>`;
      });

      div.innerHTML = `
        <label for="${categoria.toLowerCase().replace(/\s|\(|\)/g, '')}">${categoria}:</label>
        <select id="${categoria.toLowerCase().replace(/\s|\(|\)/g, '')}" name="${categoria.toLowerCase().replace(/\s|\(|\)/g, '')}">
          ${optionsHTML}
        </select>
      `;

      contenedor.appendChild(div);
    });

    // Limpiar mensaje y resumen al cargar
    mostrarMensaje('');
    ocultarResumen();
  } catch (error) {
    console.error('Error cargando productos:', error);
    mostrarMensaje('Error cargando productos', true);
  }
}

document.getElementById('formPresupuesto').addEventListener('submit', async (e) => {
  e.preventDefault();

  let total = 0;
  const componentes = [];

  categorias.forEach(categoria => {
    const select = document.getElementById(categoria.toLowerCase().replace(/\s|\(|\)/g, ''));
    const selectedOption = select.options[select.selectedIndex];
    const precio = parseFloat(select.value);
    if (!isNaN(precio) && precio > 0) {
      componentes.push({
        categoria,
        nombre: selectedOption.textContent.split(' - ')[0],
        precio
      });
      total += precio;
    }
  });

  const incluyeMontaje = document.getElementById('montaje').value === 'si';
  if (incluyeMontaje) total += 50;

  try {
    const res = await fetch('/presupuesto/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ componentes, incluyeMontaje, total })
    });


    const data = await res.json();

    if (data.mensaje) {
      mostrarMensaje('Presupuesto guardado correctamente');
      mostrarResumen(componentes, incluyeMontaje, total);
    } else {
      mostrarMensaje('Presupuesto enviado');
      ocultarResumen();
    }
  } catch (error) {
    console.error('Error al guardar presupuesto:', error);
    mostrarMensaje('Error al guardar el presupuesto', true);
  }
});

// Función para mostrar mensaje (verde o rojo)
function mostrarMensaje(texto, esError = false) {
  const mensaje = document.getElementById('mensaje');
  mensaje.textContent = texto;
  mensaje.style.color = esError ? '#e74c3c' : '#27ae60';
  if (texto) {
    mensaje.classList.add('visible');
  } else {
    mensaje.classList.remove('visible');
  }
}

// Función para mostrar resumen con animación
function mostrarResumen(componentes, incluyeMontaje, total) {
  let resumenDiv = document.getElementById('resumen');
  if (!resumenDiv) {
    resumenDiv = document.createElement('div');
    resumenDiv.id = 'resumen';
    document.body.appendChild(resumenDiv);
  }

  let html = '<h2>Resumen del Presupuesto</h2><ul>';
  componentes.forEach(c => {
    html += `<li><strong>${c.categoria}:</strong> ${c.nombre} - S/ ${c.precio.toFixed(2)}</li>`;
  });

  if (incluyeMontaje) {
    html += `<li><strong>Servicio de armado:</strong> S/ 50.00</li>`;
  }
  html += `</ul><p><strong>Total: S/ ${total.toFixed(2)}</strong></p>`;

  resumenDiv.innerHTML = html;
  resumenDiv.classList.add('visible');
}

// Función para ocultar resumen
function ocultarResumen() {
  const resumenDiv = document.getElementById('resumen');
  if (resumenDiv) {
    resumenDiv.classList.remove('visible');
  }
}

// Botón descargar PDF
document.getElementById('btnDescargarPDF').addEventListener('click', async () => {
  let total = 0;
  const componentes = [];

  categorias.forEach(categoria => {
    const select = document.getElementById(categoria.toLowerCase().replace(/\s|\(|\)/g, ''));
    const selectedOption = select.options[select.selectedIndex];
    const precio = parseFloat(select.value);
    if (!isNaN(precio) && precio > 0) {
      componentes.push({
        categoria,
        nombre: selectedOption.textContent.split(' - ')[0],
        precio
      });
      total += precio;
    }
  });

  const incluyeMontaje = document.getElementById('montaje').value === 'si';
  if (incluyeMontaje) total += 50;

  try {
    const response = await fetch('/presupuesto/generar-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ componentes, incluyeMontaje, total })
    });


    if (!response.ok) {
      alert('❌ Error al generar el PDF');
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presupuesto.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (error) {
    console.error('Error al descargar PDF:', error);
    alert('❌ Error al generar el PDF');
  }
});

// Botón enviar presupuesto por correo
document.getElementById('btnEnviarCorreo').addEventListener('click', async () => {
  try {
    let total = 0;
    const componentes = [];

    categorias.forEach(categoria => {
      const select = document.getElementById(categoria.toLowerCase().replace(/\s|\(|\)/g, ''));
      const selectedOption = select.options[select.selectedIndex];
      const precio = parseFloat(select.value);
      if (!isNaN(precio) && precio > 0) {
        componentes.push({
          categoria,
          nombre: selectedOption.textContent.split(' - ')[0],
          precio
        });
        total += precio;
      }
    });

    const incluyeMontaje = document.getElementById('montaje').value === 'si';
    if (incluyeMontaje) total += 50;

    const presupuesto = { componentes, incluyeMontaje, total };

    const res = await fetch('/presupuesto/enviar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(presupuesto)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.mensaje || 'Error al enviar el correo');
    }

    mostrarMensaje('📨 Presupuesto enviado por correo con éxito');
  } catch (error) {
    console.error('❌ Error al enviar correo:', error);
    mostrarMensaje('Error al enviar el presupuesto por correo', true);
  }
});

// Cargar productos al inicio
window.onload = cargarProductos;
