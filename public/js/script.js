const BACKEND_URL = 'https://vampipcs.onrender.com'; // Cambia si quieres

// --- Elementos DOM ---
const menuBtn = document.getElementById('menuBtn');
const sidePanel = document.getElementById('sidePanel');
const closeBtn = document.getElementById('closeBtn');
const overlay = document.getElementById('overlay');

// Mostrar mensaje tipo toast
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// --- Eventos UI ---
menuBtn.addEventListener('click', () => {
  sidePanel.classList.add('open');
  overlay.classList.add('show');
});
closeBtn.addEventListener('click', () => {
  sidePanel.classList.remove('open');
  overlay.classList.remove('show');
});
overlay.addEventListener('click', () => {
  sidePanel.classList.remove('open');
  overlay.classList.remove('show');
});

cartIcon.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

// --- Autenticación y carga inicial ---
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  updateCartCount();
  renderCart();
});

async function checkAuth() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/user`, { credentials: 'include' });
    if (!res.ok) {
      localStorage.setItem('redirectAfterLogin', window.location.pathname);
      window.location.href = '/login.html';
      return;
    }
    const user = await res.json();
    console.log('Usuario autenticado:', user);
  } catch (error) {
    console.error('Error al verificar sesión:', error);
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    window.location.href = '/login.html';
  }
}
