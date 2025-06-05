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
let currentRoomType = null; // Nuevo para mensajes predeterminados

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

// Limpiar mensajes anteriores
function clearMessages() {
  if (chatBox) {
    chatBox.innerHTML = '';
  }
}

// Unirse a sala
subChatItems.forEach(item => {
  item.addEventListener('click', () => {
    const roomType = item.getAttribute('data-room');
    if (!roomType || roomType === currentRoomType) return;

    socket.emit('joinSupportRoom', roomType);
  });
});

// Al unirse a sala privada
socket.on('joinedPrivateRoom', ({ room, type }) => {
  currentRoom = room;
  currentRoomType = type;

  console.log(`Unido a sala privada: ${room} (Soporte: ${type})`);
  
  clearMessages();
  document.getElementById('roomName').textContent = `Soporte: ${type}`;
});

// Mostrar mensajes recibidos
socket.on('message', msg => {
  if (msg.room === currentRoom && msg.sender._id !== userID) {
    appendMessage(msg);
  }
});

// Mostrar errores
socket.on('errorMessage', msg => {
  alert(msg);
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

// Cargar historial de mensajes
socket.on('roomMessages', messages => {
  console.log('Historial recibido:', messages);
  clearMessages();

  if (messages.length === 0) {
    appendMessage({
      sender: { username: 'Sistema', profilePhoto: '/img/toji.jpg' },
      message: defaultMessages[currentRoomType] || 'Bienvenido al chat.',
      timestamp: new Date()
    });
  } else {
    messages.forEach(msg => {
      appendMessage(msg, msg.sender._id === userID);
    });
  }
});

// Cargar primer chat automáticamente
window.addEventListener('DOMContentLoaded', () => {
  const firstRoom = document.querySelector('.sub-chat-list li');
  if (firstRoom) firstRoom.click();
});
