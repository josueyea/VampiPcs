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
const subChatItems = document.querySelectorAll('.sub-chat-list li');
const categoryTitles = document.querySelectorAll('.category-title');

categoryTitles.forEach(title => {
  title.addEventListener('click', () => {
    const submenu = title.nextElementSibling;
    if (submenu && submenu.classList.contains('sub-chat-list')) {
      submenu.classList.toggle('open');
    }
  });
});


let currentRoom = null;

const defaultMessages = {
  'soporte-general': 'Bienvenido al Soporte General, ¿en qué podemos ayudarte?',
  'tecnico': 'Bienvenido al Soporte Técnico. Describe tu problema detalladamente.',
  'chat-general': '¡Bienvenido al chat general entre usuarios!',
  'intercambios': 'Aquí puedes intercambiar ideas, objetos o consejos entre usuarios.',
  'vendedores': 'Chatea con nuestros vendedores directamente.',
  'moderadores': 'Consulta o reporta temas a nuestros moderadores.',
  'admins': 'Comunícate directamente con el equipo administrativo.'
};

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

