const socket = io({
  query: {
    userID: localStorage.getItem('userID')
  }
});

const chatBox = document.getElementById('chatBox');
const msgInput = document.getElementById('msgInput');
const chatForm = document.getElementById('chatForm');
const chatTitle = document.getElementById('chatTitle');
const chatAvatar = document.querySelector('.chat-avatar');
const categoryItems = document.querySelectorAll('.chat-category');
const subChatItems = document.querySelectorAll('.sub-chat-list li');
const categoryTitles = document.querySelectorAll('.category-title');
const userID = localStorage.getItem('userID');
const username = localStorage.getItem('username');
const profilePhoto = localStorage.getItem('profilePhoto');

categoryTitles.forEach(title => {
  title.addEventListener('click', () => {
    const submenu = title.nextElementSibling;
    if (submenu && submenu.classList.contains('sub-chat-list')) {
      submenu.classList.toggle('open');
    }
  });
});


let currentRoom = null;

document.querySelectorAll('[data-room]').forEach(item => {
  item.addEventListener('click', () => {
    const room = item.getAttribute('data-room');
    const roomName = item.textContent.trim();
    currentRoom = room;

    chatTitle.textContent = roomName;
    chatBox.innerHTML = ''; // Limpia el historial anterior

    // Enviar evento para unirse a la sala
    socket.emit('joinRoom', room);

    // Mensaje predeterminado
    const defaultMessages = {
      'soporte-general': '👋 Bienvenido al Soporte General. ¿En qué podemos ayudarte?',
      'tecnico': '🔧 Bienvenido al Soporte Técnico. Describe tu problema.',
      'chat-general': '💬 Este es el chat general entre usuarios.',
      'intercambios': '🔁 Zona de intercambios. Respeta las reglas.',
      'vendedores': '🧑‍💼 Aquí puedes hablar con nuestros vendedores.',
      'moderadores': '🔵 Asistencia de moderadores.',
      'admins': '🔴 Asistencia directa de administración.'
    };

    const msg = defaultMessages[room] || 'Bienvenido al chat.';
    displayMessage({
      sender: { username: 'Sistema', profilePhoto: '/public/img/logo.png' },
      message: msg,
      timestamp: new Date().toISOString()
    });
  });
});

// Función para alternar submenús
categoryItems.forEach(category => {
  category.addEventListener('click', () => {
    const submenu = category.querySelector('.sub-chat-list');
    if (submenu) submenu.classList.toggle('open');
  });
});

// Función para mostrar mensajes en pantalla
function appendMessage({ sender, message, timestamp }, isOwn = false) {
  const msg = document.createElement('div');
  msg.classList.add('message');
  if (isOwn) msg.classList.add('you');

  msg.innerHTML = `
    <img src="${sender.profilePhoto || '/public/img/default.jpg'}" class="msg-avatar" />
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

// Unirse a sala al hacer clic en sub-chat
subChatItems.forEach(item => {
  item.addEventListener('click', () => {
    const selectedRoom = item.getAttribute('data-room');
    if (selectedRoom === currentRoom) return;

    currentRoom = selectedRoom;
    chatBox.innerHTML = '';
    chatTitle.textContent = item.textContent;
    chatAvatar.src = `/public/img/${selectedRoom}.jpg`; // Asegúrate de tener imágenes con ese nombre

    // Unirse a la sala
    socket.emit('joinRoom', currentRoom);

    // Mensaje de bienvenida
    appendMessage({
      sender: { username: 'Sistema', profilePhoto: '/public/img/logo.png' },
      message: defaultMessages[selectedRoom] || 'Bienvenido al chat.',
      timestamp: new Date()
    });
  });
});

// Enviar mensaje
chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const message = msgInput.value.trim();
  if (!message || !currentRoom) return;

  socket.emit('chatMessage', {
    room: currentRoom,
    message
  });

  appendMessage({
    sender: {
      username: 'Tú',
      profilePhoto: localStorage.getItem('profilePhoto') || '/public/img/default.jpg'
    },
    message,
    timestamp: new Date()
  }, true);

  msgInput.value = '';
});

// Recibir mensaje
socket.on('message', data => {
  if (data.room === currentRoom && data.sender._id !== localStorage.getItem('userID')) {
    appendMessage(data);
  }
});

// Cargar historial al entrar
socket.on('chatHistory', messages => {
  messages.forEach(msg => appendMessage(msg, msg.sender._id === localStorage.getItem('userID')));
});

// Opcional: unirse automáticamente a la primera sala si quieres
window.addEventListener('DOMContentLoaded', () => {
  const firstRoom = document.querySelector('.sub-chat-list li');
  if (firstRoom) firstRoom.click(); // Simula el clic al primer chat
});

document.addEventListener('DOMContentLoaded', () => {
  const categoryTitles = document.querySelectorAll('.category-title');

  categoryTitles.forEach(title => {
    title.addEventListener('click', () => {
        console.log('clic en categoría:', title.textContent.trim());
      const submenu = title.nextElementSibling;
      if (submenu && submenu.classList.contains('sub-chat-list')) {
        submenu.classList.toggle('open');
      }
    });
  });
});

function displayMessage({ sender, message, timestamp }) {
  const isCurrentUser = sender._id === currentUserID;

  const msgEl = document.createElement('div');
  msgEl.classList.add('message');
  if (isCurrentUser) msgEl.classList.add('you');

  msgEl.innerHTML = `
    <img src="${sender.profilePhoto || '/public/img/avatar.png'}" class="msg-avatar" />
    <div class="msg-content">
      <div class="msg-header">
        <span>${sender.username}</span>
        <span class="msg-time">${new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <p>${message}</p>
    </div>
  `;
  chatBox.appendChild(msgEl);
  chatBox.scrollTop = chatBox.scrollHeight;
}

if (!userID) {
  alert('Inicia sesión primero.');
  window.location.href = '/login.html';
} else {
  const socket = io('https://vampipcs.onrender.com', {
    query: { userID }
  });

  // Ya puedes usar el socket
  socket.on('connect', () => {
    console.log('Conectado al chat como', username);
  });

  // Ejemplo de uso:
  document.querySelectorAll('[data-room]').forEach(item => {
    item.addEventListener('click', () => {
      const room = item.dataset.room;

      socket.emit('joinRoom', room); // si usas salas públicas

      // O si usas salas privadas
      // socket.emit('joinPrivateRoom', { withUserID: otroID });

      document.getElementById('chatTitle').textContent = item.textContent;
      document.getElementById('chatBox').innerHTML = `
        <div class="message system">
          <p>📢 Bienvenido al chat <strong>${item.textContent}</strong></p>
        </div>
      `;
    });
  });

  // Escuchar mensajes
  socket.on('message', msg => {
    renderMessage(msg, userID);
  });
}
