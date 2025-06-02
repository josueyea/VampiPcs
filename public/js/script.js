const BACKEND_URL = 'https://vampipcs.onrender.com'; // Cambia si quieres

// --- Elementos DOM ---
const menuBtn = document.getElementById('menuBtn');
const sidePanel = document.getElementById('sidePanel');
const closeBtn = document.getElementById('closeBtn');
const overlay = document.getElementById('overlay');

const cartIcon = document.getElementById('cart-icon');
const cartPanel = document.getElementById('cart-panel');
const cartOverlay = document.getElementById('cart-overlay');
const closeCartBtn = document.getElementById('close-cart');
const cartCount = document.getElementById('cart-count');
const contentProducts = document.getElementById('contentProducts'); // tbody de la tabla carrito
const cartTotalEl = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const emptyCartBtn = document.getElementById('emptyCart');
const listProducts = document.getElementById('listProducts');

// --- Variables ---
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// --- Funciones Carrito Unificado ---

// Abrir carrito
function openCart() {
  cartPanel.classList.add('open');
  cartOverlay.classList.add('show');
  renderCart();
}
// Cerrar carrito
function closeCart() {
  cartPanel.classList.remove('open');
  cartOverlay.classList.remove('show');
}
// Actualizar contador en ícono
function updateCartCount() {
  const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  if (totalCount > 0) {
    cartCount.style.display = 'inline-block';
    cartCount.textContent = totalCount;
  } else {
    cartCount.style.display = 'none';
  }
}
// Guardar carrito en localStorage
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}
// Renderizar carrito (tabla con productos)
function renderCart() {
  contentProducts.innerHTML = '';

  if (cart.length === 0) {
    contentProducts.innerHTML = `<tr><td colspan="5" style="text-align:center;">Tu carrito está vacío.</td></tr>`;
    cartTotalEl.textContent = '0.00';
    return;
  }

  let total = 0;
  cart.forEach(({ id, title, price, img, quantity }) => {
    total += price * quantity;

    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td><img src="${img}" alt="${title}" style="width:50px; height:50px; object-fit:cover;"></td>
      <td>${title}</td>
      <td>$${price.toFixed(2)}</td>
      <td><input type="number" min="1" value="${quantity}" data-id="${id}" class="quantity-input"></td>
      <td><button class="remove-btn" data-id="${id}">X</button></td>
    `;

    contentProducts.appendChild(tr);
  });

  cartTotalEl.textContent = total.toFixed(2);

  // Añadir eventos a inputs de cantidad y botones eliminar
  const quantityInputs = contentProducts.querySelectorAll('.quantity-input');
  quantityInputs.forEach(input => {
    input.addEventListener('change', onQuantityChange);
  });

  const removeBtns = contentProducts.querySelectorAll('.remove-btn');
  removeBtns.forEach(btn => {
    btn.addEventListener('click', onRemoveItem);
  });
}
// Evento cambio de cantidad
function onQuantityChange(e) {
  const newQuantity = parseInt(e.target.value, 10);
  const id = e.target.dataset.id;

  if (isNaN(newQuantity) || newQuantity < 1) {
    e.target.value = 1;
    return;
  }

  const product = cart.find(item => item.id === id);
  if (product) {
    product.quantity = newQuantity;
    saveCart();
    renderCart();
    updateCartCount();
  }
}
// Evento eliminar producto
function onRemoveItem(e) {
  const id = e.target.dataset.id;
  cart = cart.filter(item => item.id !== id);
  saveCart();
  renderCart();
  updateCartCount();
}
// Añadir producto al carrito (desde listado productos)
function addToCart(product) {
  console.log('Agregando producto:', product);
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveCart();
  updateCartCount();
  showToast(`Añadido "${product.title}" al carrito.`);
}
// Vaciar carrito
function emptyCart() {
  cart = [];
  saveCart();
  renderCart();
  updateCartCount();
}
// Mostrar mensaje tipo toast
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Evento para añadir producto desde el listado
function onProductListClick(e) {
  if (!e.target.classList.contains('btn-add')) return;

  const card = e.target.closest('.product'); // Ajusta esta clase a tu HTML

  if (!card) return;

  const product = {
    id: card.querySelector('button.btn-add').dataset.id,
    title: card.querySelector('h4').textContent,
    price: parseFloat(card.querySelector('.currentPrice').textContent.replace('$', '')),
    img: card.querySelector('img').src
  };

  addToCart(product);
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

checkoutBtn.addEventListener('click', () => {
  if (cart.length === 0) {
    alert('Tu carrito está vacío.');
    return;
  }
  alert('Gracias por tu compra. Implementa la lógica de pago aquí.');
  emptyCart();
});

if (emptyCartBtn) {
  emptyCartBtn.addEventListener('click', () => {
    emptyCart();
  });
}

if (listProducts) {
  listProducts.addEventListener('click', onProductListClick);
}

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
