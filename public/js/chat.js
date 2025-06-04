const socket = io();
const roomSelector = document.getElementById('roomSelector');
const chatBox = document.getElementById('chatBox');
const msgInput = document.getElementById('msgInput');

roomSelector.addEventListener('change', () => {
  socket.emit('joinRoom', roomSelector.value);
  chatBox.innerHTML = '';
});

socket.emit('joinRoom', roomSelector.value);

function sendMessage() {
  const message = msgInput.value.trim();
  if (message) {
    socket.emit('chatMessage', {
      room: roomSelector.value,
      message,
      sender: 'Tú'
    });
    msgInput.value = '';
  }
}

socket.on('message', data => {
  const p = document.createElement('p');
  p.innerHTML = `<strong>${data.sender}:</strong> ${data.message}`;
  chatBox.appendChild(p);
  chatBox.scrollTop = chatBox.scrollHeight;
});