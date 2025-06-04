const userID = localStorage.getItem('userID');
const username = localStorage.getItem('username');
const profilePhoto = localStorage.getItem('profilePhoto') || '/public/img/default.jpg';

if (!userID) {
  alert('Sesión expirada. Por favor inicia sesión nuevamente.');
  window.location.href = '/login.html';
}

const socket = io('https://vampipcs.onrender.com', {
  query: { userID }
});

const chatBox = document.getElementById('chatBox');
const msgInput = document.getElementById('msgInput');
const chatForm = document.getElementById('chatForm');
const chatTitle = document.getElementById('chatTitle');
const chatAvatar = document.querySelector('.chat-avatar');
const subChatItems = document.querySelectorAll('.sub-chat-list li');

let currentRoom = null;

const defaultMessages = {
  'soporte-general': '👋 Bienvenido al Soporte General. ¿En qué podemos ayudarte?',
  'tecnico': '🔧 Bienvenido al Soporte Técnico. Describe tu problema.',
  'chat-general': '💬 Este es el chat general entre usuarios.',
  'intercambios': '🔁 Zona de intercambios. Respeta las reglas.',
  'vendedores': '🧑‍💼 Aquí puedes hablar con nuestros vendedores.',
  'moderadores': '🔵 Asistencia de moderadores.',
  'admins': '🔴 Asistencia directa de administración.'
};

// Mostrar mensajes
function appendMessage({ sender, message, timestamp }, isOwn = false) {
  const msg = document.createElement('div');
  msg.classList.add('message');
  if (isOwn) msg.classList.add('you');

  msg.innerHTML = `
    <img src="${sender.profilePhoto || '/img/toji.jpg'}" class="msg-avatar" />
    <div class="msg-content">
      <div class="msg-header">
        <span>${sender.username}</span>
        <span class="msg-time">${new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <p>${message}</p>
    </div>
  `;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Unirse a sala
subChatItems.forEach(item => {
  item.addEventListener('click', () => {
    const roomType = item.getAttribute('data-room'); // ej: soporte-general, tecnico, vendedores...
    if (!roomType) return;

    if (roomType === currentRoom) return;
    
    // Emitir evento para unirse a sala privada de soporte
    socket.emit('joinSupportRoom', roomType);
  });
});

// Cuando el backend confirma la unión a la sala privada
socket.on('joinedPrivateRoom', ({ room, type }) => {
  currentRoom = room;
  console.log(`Unido a sala privada: ${room} (Soporte: ${type})`);
  
  // Limpiar chat o actualizar vista
  clearMessages(); // <-- función que borra el chat anterior si tienes una

  // Mostrar que está en una sala privada (opcional)
  document.getElementById('roomName').textContent = `Soporte: ${type}`;

  // También podrías cargar historial si se envía después
});

// Mostrar mensajes recibidos
socket.on('message', (msg) => {
  if (msg.room === currentRoom) {
    displayMessage(msg); // función para renderizar en pantalla
  }
});

// Mostrar errores
socket.on('errorMessage', (msg) => {
  alert(msg); // o mostrar en la interfaz
});

// Submenús
document.querySelectorAll('.chat-category').forEach(category => {
  category.addEventListener('click', () => {
    const submenu = category.querySelector('.sub-chat-list');
    if (submenu) submenu.classList.toggle('open');
  });
});

// Enviar mensaje
chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const message = msgInput.value.trim();
  if (!message || !currentRoom) return;

  socket.emit('chatMessage', { room: currentRoom, message });

  appendMessage({
    sender: { username: 'Tú', profilePhoto },
    message,
    timestamp: new Date()
  }, true);

  msgInput.value = '';
});

// Recibir mensajes nuevos en la sala actual
socket.on('message', data => {
  console.log('Mensaje nuevo recibido:', data);
  if (data.room === currentRoom && data.sender._id !== userID) {
    appendMessage(data);
  }
});

// Recibir historial de mensajes al unirse a sala
socket.on('roomMessages', messages => { 
  console.log('Historial recibido:', messages);
  chatBox.innerHTML = ''; // Limpiar chat antes de cargar historial

  if (messages.length === 0) {
    // Mostrar mensaje predeterminado solo si no hay mensajes previos
    appendMessage({
      sender: { username: 'Sistema', profilePhoto: '/img/toji.jpg' },
      message: defaultMessages[currentRoom] || 'Bienvenido al chat.',
      timestamp: new Date()
    });
  } else {
    messages.forEach(msg => {
      appendMessage(msg, msg.sender._id === userID);
    });
  }
});

// Auto-cargar primer chat al iniciar
window.addEventListener('DOMContentLoaded', () => {
  const firstRoom = document.querySelector('.sub-chat-list li');
  if (firstRoom) firstRoom.click();
});