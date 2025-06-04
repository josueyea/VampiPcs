const socket = io({
  query: {
    userID: localStorage.getItem('userID') // Asegúrate de setear esto al loguear
  }
});

const chatBox = document.getElementById('chatBox');
const msgInput = document.getElementById('msgInput');
const chatForm = document.getElementById('chatForm');
const chatTitle = document.getElementById('chatTitle');
const chatListItems = document.querySelectorAll('.chat-list li');
const avatar = document.querySelector('.chat-avatar');

const avatars = {
  soporte: '/public/img/soporte.png',
  usuarios: '/public/img/usuarios.png',
  vendedores: '/public/img/vendedor.png',
  asesoria: '/public/img/asesoria.png'
};

const defaultMessages = {
  soporte: '¡Hola! ¿En qué podemos ayudarte hoy? 😊',
  usuarios: 'Puedes chatear con otros usuarios aquí 🧑‍🤝‍🧑',
  vendedores: 'Habla directamente con nuestros vendedores 🧑‍💻',
  asesoria: 'Bienvenido al área de asesoría técnica 📘'
};

let currentRoom = 'soporte';
socket.emit('joinRoom', currentRoom);
loadRoomUI(currentRoom);

// --- Eventos de interfaz ---
chatListItems.forEach(item => {
  item.addEventListener('click', () => {
    const room = item.dataset.room;
    if (room !== currentRoom) {
      currentRoom = room;
      socket.emit('joinRoom', currentRoom);
      chatBox.innerHTML = '';
      loadRoomUI(room);

      // Mensaje predeterminado
      const msg = {
        sender: { username: 'Sistema', profilePhoto: '/public/img/logo.png' },
        message: defaultMessages[room],
        timestamp: new Date()
      };
      appendMessage(msg, false);
    }
  });
});

chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const message = msgInput.value.trim();
  if (message) {
    socket.emit('chatMessage', {
      room: currentRoom,
      message
    });
    msgInput.value = '';
  }
});

// --- Recibir mensaje ---
socket.on('message', data => {
  const isOwnMessage = data.sender._id === socket.userID;
  appendMessage(data, isOwnMessage);
});

socket.on('chatHistory', messages => {
  chatBox.innerHTML = '';
  messages.forEach(msg => appendMessage(msg, msg.sender._id === socket.userID));
});

// --- Función para añadir mensaje al DOM ---
function appendMessage(data, isOwnMessage) {
  const msgEl = document.createElement('div');
  msgEl.classList.add('message');
  if (isOwnMessage || data.sender.username === 'Tú') msgEl.classList.add('you');

  const photo = data.sender.profilePhoto || '/public/img/default-avatar.png';
  const time = formatTime(new Date(data.timestamp));

  msgEl.innerHTML = `
    <img src="${photo}" alt="avatar" class="msg-avatar">
    <div class="msg-content">
      <div class="msg-header">
        <strong>${data.sender.username}</strong>
        <span class="msg-time">${time}</span>
      </div>
      <p>${data.message}</p>
    </div>
  `;
  chatBox.appendChild(msgEl);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// --- Cambiar título y avatar ---
function loadRoomUI(room) {
  chatTitle.textContent = capitalizeFirst(room);
  avatar.src = avatars[room] || '/public/img/default-avatar.png';
}

// --- Utilidades ---
function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}