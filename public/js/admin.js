let usuariosData = []
let presupuestosData = []
// ----- DATOS DE PRUEBA SIMULADOS -----
async function cargarDatos() {
    try {
    const [usuariosRes, presupuestosRes, soporteRes] = await Promise.all([
        fetch('/api/admin/usuarios'),
        fetch('/api/admin/presupuestos'),
        fetch('/api/admin/soporte')
    ]);

    usuariosData = await usuariosRes.json();
    presupuestosData = await presupuestosRes.json();
    soporteData = await soporteRes.json();

    renderDashboard();
    renderUsuarios();
    renderPresupuestos();
    renderSoporte();
    } catch (error) {
    console.error("Error al cargar datos:", error);
    alert("Error al cargar datos del servidor.");
    }
}

window.addEventListener('DOMContentLoaded', cargarDatos);

// ----- FUNCIONES DE NAVEGACION ENTRE TABS -----
const tabs = document.querySelectorAll(".tab");
const sections = document.querySelectorAll(".section");

tabs.forEach((tab) =>
    tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    sections.forEach((sec) => {
        sec.classList.remove("active");
        if (sec.id === tab.dataset.target) {
        sec.classList.add("active");
        }
    });
    })
);

// ----- RENDERIZADO USUARIOS -----
const tbodyUsuarios = document.querySelector("#tablaUsuarios tbody");
function renderUsuarios() {
    let filtroText = document.getElementById("filtroUsuario").value.toLowerCase();
    let filtroRol = document.getElementById("filtroRol").value;
    let filtroEstado = document.getElementById("filtroEstado").value;

    tbodyUsuarios.innerHTML = "";

    let filtrados = usuariosData.filter((u) => {
    let matchesText =
        u.username.toLowerCase().includes(filtroText) ||
        u.email.toLowerCase().includes(filtroText);
    let matchesRol = filtroRol ? (u.roles && u.roles.includes(filtroRol)) : true;
    let matchesEstado = filtroEstado ? u.estado === filtroEstado : true;
    return matchesText && matchesRol && matchesEstado;
    });

    // ---- ESTADISTICAS DE ROLES ----
    const resumenContainer = document.getElementById("resumenRoles");
    resumenContainer.innerHTML = ""; // Limpiar

    if (filtrados.length > 0) {
    const rolesCount = { admin: 0, moderador: 0, usuario: 0 };
    filtrados.forEach((u) => {
        if (Array.isArray(u.roles)) {
        u.roles.forEach(r => {
            if (rolesCount[r] !== undefined) rolesCount[r]++;
        });
        }
    });


    let resumenHTML = `
        <div class="resumen-box">
        <strong>Resumen de Roles:</strong>
        <ul>
            <li>🛡️ Admins: ${rolesCount.admin}</li>
            <li>🎯 Moderadores: ${rolesCount.moderador}</li>
            <li>👤 Usuarios: ${rolesCount.usuario}</li>
        </ul>
        </div>
    `;
    resumenContainer.innerHTML = resumenHTML;
    }

    // ---- TABLA DE USUARIOS ----
    if (filtrados.length === 0) {
    tbodyUsuarios.innerHTML =
        '<tr><td colspan="5" style="text-align:center;">No se encontraron usuarios.</td></tr>';
    return;
    }

    filtrados.forEach((u) => {
    let tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td>${Array.isArray(u.roles) ? u.roles.join(', ') : u.roles}</td>
        <td>${u.estado}</td>
        <td>
        <button onclick="editarUsuario('${u._id}')">Editar</button>
        <button class="danger" onclick="eliminarUsuario('${u._id}')">Eliminar</button>
        </td>`;
    tbodyUsuarios.appendChild(tr);
    });
}


document.getElementById("filtroUsuario").addEventListener("input", renderUsuarios);
document.getElementById("filtroRol").addEventListener("change", renderUsuarios);
document.getElementById("filtroEstado").addEventListener("change", renderUsuarios);

// ----- FUNCIONES DE USUARIOS -----

let usuarioEditandoId = null;

function editarUsuario(id) {
    const usuario = usuariosData.find((u) => (u.id || u._id) === id);
    if (!usuario) return alert("Usuario no encontrado");

    document.getElementById("editUserId").value = id;
    document.getElementById("editUserEstado").value = usuario.estado;

    // Roles disponibles con sus íconos
    const rolesDisponibles = [
    { rol: 'admin', icono: '🛡️' },
    { rol: 'moderador', icono: '🎯' },
    { rol: 'vendedor', icono: '💰' },
    { rol: 'tecnico', icono: '🔧' },
    { rol: 'soporte', icono: '💬' },
    { rol: 'usuario', icono: '👤' },
    ];

    const container = document.getElementById("checkboxRolesContainer");
    container.innerHTML = ''; // Limpiar

    rolesDisponibles.forEach(({ rol, icono }) => {
    const checked = usuario.roles?.includes(rol) ? 'checked' : '';
    container.innerHTML += `
        <label class="checkbox-tag">
        <input type="checkbox" name="roles" value="${rol}" ${checked}>
        <span class="icon">${icono}</span> ${rol}
        </label>
    `;
    });

    document.getElementById("modalEditarUsuario").classList.remove("hidden");

    const form = document.getElementById("formEditarUsuario");
    form.onsubmit = function (e) {
    e.preventDefault();

    const id = document.getElementById("editUserId").value;
    const nuevosRoles = Array.from(document.querySelectorAll('input[name="roles"]:checked'))
        .map(cb => cb.value);

    const nuevoEstado = document.getElementById("editUserEstado").value;

    console.log("Datos a enviar:", { roles: nuevosRoles, estado: nuevoEstado });

    fetch(`/api/admin/usuarios/${id}`, {
        method: "PUT",
        headers: {
        "Content-Type": "application/json"
        },
        body: JSON.stringify({ roles: nuevosRoles, estado: nuevoEstado })
    })
        .then(res => {
        if (!res.ok) throw new Error("Error al actualizar usuario");
        return res.json();
        })
        .then(() => {
        alert("Usuario actualizado correctamente.");
        cerrarModal();
        renderUsuarios();
        })
        .catch((err) => {
        console.error(err);
        alert("Error al actualizar en la base de datos.");
        });
    };
}

function cerrarModal() {
    document.getElementById("modalEditarUsuario").classList.add("hidden");
}

function eliminarUsuario(id) {
    if (confirm("¿Estás seguro de eliminar este usuario?")) {
    usuariosData = usuariosData.filter((u) => u.id !== id);
    alert("Usuario eliminado.");
    renderUsuarios();
    }
}

function exportarUsuariosExcel() {
    let wb = XLSX.utils.book_new();
    let data = usuariosData.map((u) => ({
    Usuario: u.username,
    Email: u.email,
    Rol: u.rol,
    Estado: u.estado,
    }));
    let ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios");
    XLSX.writeFile(wb, "usuarios.xlsx");
}

// ----- RENDERIZADO PRESUPUESTOS -----
const contenedorPresupuestos = document.getElementById("contenedor-presupuestos");
function renderPresupuestos() {
    let filtroUsuario = document.getElementById("filtroUsuarioPresupuesto").value.toLowerCase();
    let minTotal = parseFloat(document.getElementById("minTotal").value) || 0;
    let maxTotal = parseFloat(document.getElementById("maxTotal").value) || Infinity;
    let filtroComp = document.getElementById("filtroComponente").value.toLowerCase();

    contenedorPresupuestos.innerHTML = "";

    let filtrados = presupuestosData.filter((p) => {
    let userMatch =
        p.usuarioId.username.toLowerCase().includes(filtroUsuario) ||
        p.usuarioId.email.toLowerCase().includes(filtroUsuario);
    let totalMatch = p.total >= minTotal && p.total <= maxTotal;
    let compMatch =
        filtroComp === "" ||
        p.componentes.some((c) => c.nombre.toLowerCase().includes(filtroComp));
    return userMatch && totalMatch && compMatch;
    });

    if (filtrados.length === 0) {
    contenedorPresupuestos.innerHTML =
        '<p style="text-align:center;">No se encontraron presupuestos.</p>';
    return;
    }

    filtrados.forEach((p) => {
    let card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
        <h3>Presupuesto ID: ${p._id}</h3>
        <p><strong>Usuario:</strong> ${p.usuarioId.username} (${p.usuarioId.email})</p>
        <p><strong>Componentes:</strong></p>
        <ul>
        ${p.componentes
            .map((c) => `<li>${c.categoria}: ${c.nombre} - S/ ${c.precio}</li>`)
            .join("")}
        </ul>
        <p><strong>Incluye montaje:</strong> ${p.incluyeMontaje ? "Sí" : "No"}</p>
        <p><strong>Total:</strong> S/ ${p.total}</p>
        <div class="card-actions">
        <button onclick="verDetallePresupuesto('${p._id}')">Ver detalle</button>
        <button class="danger" onclick="eliminarPresupuesto('${p._id}')">Eliminar</button>
        </div>
    `;
    contenedorPresupuestos.appendChild(card);
    });
}

// Eventos filtros presupuestos
document
    .getElementById("filtroUsuarioPresupuesto")
    .addEventListener("input", renderPresupuestos);
document.getElementById("minTotal").addEventListener("input", renderPresupuestos);
document.getElementById("maxTotal").addEventListener("input", renderPresupuestos);
document.getElementById("filtroComponente").addEventListener("input", renderPresupuestos);

function verDetallePresupuesto(id) {
    alert("Función para mostrar detalle extendido aún no implementada");
}
function eliminarPresupuesto(id) {
    if (confirm("¿Eliminar este presupuesto?")) {
    presupuestosData = presupuestosData.filter((p) => p._id !== id);
    alert("Presupuesto eliminado.");
    renderPresupuestos();
    }
}

function exportarPresupuestosExcel() {
    let wb = XLSX.utils.book_new();
    let data = presupuestosData.map((p) => ({
    ID: p._id,
    Usuario: p.usuarioId.username,
    Total: p.total,
    Montaje: p.incluyeMontaje ? "Sí" : "No",
    Componentes: p.componentes
        .map((c) => `${c.categoria}: ${c.nombre} (${c.precio} S/)`)
        .join(", "),
    }));
    let ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Presupuestos");
    XLSX.writeFile(wb, "presupuestos.xlsx");
}

function exportarPresupuestosPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 10;
    doc.setFontSize(16);
    doc.text("Reporte de Presupuestos", 10, y);
    y += 10;
    presupuestosData.forEach((p) => {
    doc.setFontSize(12);
    doc.text(`ID: ${p._id}`, 10, y);
    y += 6;
    doc.text(`Usuario: ${p.usuarioId.username} (${p.usuarioId.email})`, 10, y);
    y += 6;
    doc.text(`Total: S/ ${p.total}`, 10, y);
    y += 6;
    doc.text(`Componentes:`, 10, y);
    y += 6;
    p.componentes.forEach((c) => {
        doc.text(`- ${c.categoria}: ${c.nombre} - S/ ${c.precio}`, 14, y);
        y += 6;
        if (y > 270) {
        doc.addPage();
        y = 10;
        }
    });
    y += 4;
    if (y > 270) {
        doc.addPage();
        y = 10;
    }
    });
    doc.save("presupuestos.pdf");
}

// ----- RENDERIZADO SOPORTE -----
const tbodySoporte = document.querySelector("#tablaSoporte tbody");
function renderSoporte() {
    let filtroUsuario = document.getElementById("filtroSoporteUsuario").value.toLowerCase();
    let filtroEstado = document.getElementById("filtroEstadoSoporte").value;

    tbodySoporte.innerHTML = "";

    let filtrados = soporteData.filter((t) => {
    let userMatch = t.usuario.username.toLowerCase().includes(filtroUsuario);
    let estadoMatch = filtroEstado ? t.estado === filtroEstado : true;
    return userMatch && estadoMatch;
    });

    if (filtrados.length === 0) {
    tbodySoporte.innerHTML =
        '<tr><td colspan="4" style="text-align:center;">No hay tickets.</td></tr>';
    return;
    }

    filtrados.forEach((t) => {
    let tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${t.usuario.username}</td>
        <td>${t.mensaje}</td>
        <td>${t.estado}</td>
        <td>
        <button onclick="cerrarTicket('${t.id}')">Cerrar</button>
        <button class="danger" onclick="eliminarTicket('${t.id}')">Eliminar</button>
        </td>`;
    tbodySoporte.appendChild(tr);
    });
}

document.getElementById("filtroSoporteUsuario").addEventListener("input", renderSoporte);
document.getElementById("filtroEstadoSoporte").addEventListener("change", renderSoporte);

function cerrarTicket(id) {
    let ticket = soporteData.find((t) => t.id === id);
    if (ticket) {
    ticket.estado = "cerrado";
    alert("Ticket cerrado.");
    renderSoporte();
    }
}
function eliminarTicket(id) {
    if (confirm("¿Eliminar este ticket?")) {
    soporteData = soporteData.filter((t) => t.id !== id);
    alert("Ticket eliminado.");
    renderSoporte();
    }
}

function exportarSoporteExcel() {
    let wb = XLSX.utils.book_new();
    let data = soporteData.map((t) => ({
    Usuario: t.usuario.username,
    Mensaje: t.mensaje,
    Estado: t.estado,
    }));
    let ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Soporte");
    XLSX.writeFile(wb, "soporte.xlsx");
}

// ----- DASHBOARD -----
function renderDashboard() {
    const statsGrid = document.getElementById("statsGrid");
    statsGrid.innerHTML = "";

    let totalUsuarios = usuariosData.length;
    let activos = usuariosData.filter((u) => u.estado === "activo").length;
    let inactivos = totalUsuarios - activos;

    let totalPresupuestos = presupuestosData.length;
    let totalMontaje = presupuestosData.filter((p) => p.incluyeMontaje).length;

    let ticketsAbiertos = soporteData.filter((t) => t.estado === "abierto").length;
    let ticketsCerrados = soporteData.length - ticketsAbiertos;

    let stats = [
    { label: "Usuarios totales", value: totalUsuarios },
    { label: "Usuarios activos", value: activos },
    { label: "Usuarios inactivos", value: inactivos },
    { label: "Presupuestos totales", value: totalPresupuestos },
    { label: "Presupuestos con montaje", value: totalMontaje },
    { label: "Tickets abiertos", value: ticketsAbiertos },
    { label: "Tickets cerrados", value: ticketsCerrados },
    ];

    stats.forEach((s) => {
    let div = document.createElement("div");
    div.className = "stat-card";
    div.innerHTML = `<h3>${s.value}</h3><p>${s.label}</p>`;
    statsGrid.appendChild(div);
    });
}

// ---- Cambio de tema -----
function toggleTema() {
    if (document.body.style.background.includes("#121212")) {
    document.body.style.background = "#f0f0f0";
    document.body.style.color = "#121212";
    } else {
    document.body.style.background = "linear-gradient(135deg, #121212, #1e1e1e)";
    document.body.style.color = "#eee";
    }
}

// Inicialización
function initApp() {
    renderUsuarios();
    renderPresupuestos();
    renderSoporte();
    renderDashboard();
}

document.addEventListener("DOMContentLoaded", initApp);