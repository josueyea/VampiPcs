// Simula usuario actual (en app real, obténlo del backend o sesión)
const currentUser = {
  _id: 'user123',
  username: 'Mi Usuario',
  profilePhoto: 'https://i.pravatar.cc/150?img=5'
};

// Define las salas disponibles con nombre y avatar para mostrar
const chatRooms = {
  soporte: {
    name: "Soporte VampiPCs",
    avatar: "/public/img/toji.jpg"
  },
  usuarios: {
    name: "Chat Entre Usuarios",
    avatar: "https://i.pravatar.cc/150?img=7"
  },
  vendedores: {
    name: "Chat Vendedores",
    avatar: "https://i.pravatar.cc/150?img=8"
  },
  asesoria: {
    name: "Chat Asesoría",
    avatar: "https://i.pravatar.cc/150?img=9"
  }
};

const socket = io();

// Referencias DOM
const chatList = document.querySelectorAll('.chat-list li');
const chatTitle = document.getElementById('chatTitle');
const chatAvatar = document.querySelector('.chat-avatar');
const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');
const msgInput = document.getElementById('msgInput');

let currentRoom = 'soporte';

// Cambiar sala y actualizar UI
function joinRoom(room) {
  if (room === currentRoom) return; // ya en esa sala
  socket.emit('leaveRoom', currentRoom);
  currentRoom = room;
  socket.emit('joinRoom', currentRoom);

  // Actualiza título y avatar
  chatTitle.textContent = chatRooms[room].name;
  chatAvatar.src = chatRooms[room].avatar;

  chatBox.innerHTML = ''; // Limpia chat al cambiar sala
}

// Renderizar un mensaje en el chat
function renderMessage(msg) {
  const div = document.createElement('div');
  div.classList.add('message');
  if (msg.sender._id === currentUser._id) div.classList.add('you');

  div.innerHTML = `
    <img class="msg-avatar" src="${msg.sender.profilePhoto}" alt="${msg.sender.username}" />
    <div class="msg-content">
      <div class="msg-header">
        <span class="msg-username">${msg.sender.username}</span>
        <span class="msg-time">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>
      <p>${msg.message}</p>
    </div>
  `;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Eventos para cambiar de sala al hacer click
chatList.forEach(li => {
  li.addEventListener('click', () => {
    joinRoom(li.getAttribute('data-room'));
  });
});

// Al conectarse, unirse a la sala inicial
socket.on('connect', () => {
  socket.emit('joinRoom', currentRoom);
});

// Recibir historial de mensajes de la sala
socket.on('roomMessages', (messages) => {
  chatBox.innerHTML = '';
  messages.forEach(renderMessage);
});

// Recibir mensaje nuevo
socket.on('message', (msg) => {
  if (msg.room === currentRoom) {
    renderMessage(msg);
  }
});

// Enviar mensaje
chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit('chatMessage', {
    room: currentRoom,
    message: text,
    sender: currentUser
  });
  msgInput.value = '';
});
