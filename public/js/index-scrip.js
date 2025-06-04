// ===== DECLARACIÓN DE ELEMENTOS (asegúrate que existan en tu HTML) =====
const menuBtn = document.getElementById('menuBtn');
const sidePanel = document.getElementById('sidePanel');
const closeBtn = document.getElementById('closeBtn');
const overlay = document.getElementById('overlay');
const loginLink = document.getElementById('loginLink');
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
const logoutBtn = document.getElementById('logoutBtn');
const menu = document.getElementById('menu');      // menú hamburguesa
const navbar = document.getElementById('navbar');  // barra de navegación
const listProducts = document.getElementById('listProducts');
const emptyCart = document.getElementById('emptyCart');
const contentProducts = document.getElementById('contentProducts');
const userIcon = document.getElementById('userIcon');
const profileLink = document.getElementById('profileLink');
const adminLink = document.getElementById('adminLink');
const cartCount = document.querySelector('#cartCount');
const total = document.querySelector('#total');
const userPanel = document.getElementById('userPanel');

const closeUserPanelBtn = document.getElementById('closeUserPanel');

// ===== VARIABLE GLOBAL PARA CARRITO =====
let productsArray = [];

// ===== VARIABLE GLOBAL PARA CONTROL DE SESIÓN =====
let usuarioLogueado = false;

// ===== Manejo visibilidad login / usuario basado en localStorage (estado simulado) =====
const localUser = localStorage.getItem('user');

if (localUser) {
  if (loginLink) loginLink.style.display = 'none';
  if (userMenuBtn) userMenuBtn.style.display = 'inline-block';
} else {
  if (loginLink) loginLink.style.display = 'inline-block';
  if (userMenuBtn) userMenuBtn.style.display = 'none';
}

// ===== Mostrar/ocultar dropdown menú usuario =====
if (userMenuBtn) {
  userMenuBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (userDropdown) {
      userDropdown.style.display = (userDropdown.style.display === 'block') ? 'none' : 'block';
    }
  });
}

// ===== Cerrar dropdown si clic fuera de él =====
document.addEventListener('click', () => {
  if (userDropdown) userDropdown.style.display = 'none';
});

// ===== Logout =====
if (logoutBtn) {
  logoutBtn.addEventListener('click', async e => {
    e.preventDefault();
    try {
      await fetch('https://vampipcs.onrender.com/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Error cerrando sesión');
    }
    usuarioLogueado = false;
    localStorage.removeItem('user'); // limpiar también localStorage
    window.location.href = 'login.html';
  });
}

// ===== Panel lateral y overlay =====
if (menuBtn && sidePanel && overlay) {
  menuBtn.addEventListener('click', () => {
    sidePanel.classList.add('open');
    overlay.classList.add('show');
  });
}
if (closeBtn && sidePanel && overlay) {
  closeBtn.addEventListener('click', () => {
    sidePanel.classList.remove('open');
    overlay.classList.remove('show');
  });
}
if (overlay && sidePanel) {
  overlay.addEventListener('click', () => {
    sidePanel.classList.remove('open');
    overlay.classList.remove('show');
  });
}

// ===== Menú hamburguesa toggle =====
if (menu && navbar) {
  menu.addEventListener('click', () => {
    menu.classList.toggle('bx-x');
    navbar.classList.toggle('open');
  });
}

// ===== DOMContentLoaded para manejar elementos que dependen del DOM y carrito =====
document.addEventListener('DOMContentLoaded', () => {
  verificarUsuario();

  // Mostrar u ocultar link perfil y login según usuario logueado
  const userLoggedIn = usuarioLogueado;

  if (userLoggedIn) {
    if (profileLink) profileLink.style.display = 'inline-block';
    if (loginLink) loginLink.style.display = 'none';
  } else {
    if (profileLink) profileLink.style.display = 'none';
    if (loginLink) loginLink.style.display = 'inline-block';
  }

  eventListeners();
});

// ===== Funciones para carrito y eventos =====
function eventListeners() {
  if (listProducts) {
    listProducts.addEventListener('click', getDataElements);
  }
  if (emptyCart) {
    emptyCart.addEventListener('click', () => {
      productsArray = [];
      productsHtml();
      updateCartCount();
      updateTotal();
    });
  }

  const loadProduct = localStorage.getItem('products');
  if (loadProduct) {
    productsArray = JSON.parse(loadProduct);
    productsHtml();
    updateCartCount();
  } else {
    productsArray = [];
  }
}

function updateCartCount() {
  if (cartCount) cartCount.textContent = productsArray.length;
}

function updateTotal() {
  if (total) {
    const totalProduct = productsArray.reduce((sum, prod) => sum + prod.price * prod.quantity, 0);
    total.textContent = `$${totalProduct.toFixed(2)}`;
  }
}

function getDataElements(e) {
  if (e.target.classList.contains('btn-add')) {
    const elementHtml = e.target.closest('.product-item') || e.target.parentElement.parentElement;
    if (elementHtml) selectData(elementHtml);
  }
}

function selectData(prod) {
  const productObj = {
    img: prod.querySelector('img')?.src || '',
    title: prod.querySelector('h4')?.textContent || '',
    price: parseFloat(prod.querySelector('#currentPrice')?.textContent.replace('$', '') || 0),
    id: parseInt(prod.querySelector('button[type="button"]')?.dataset.id, 10) || 0,
    quantity: 1
  };

  const exists = productsArray.some(p => p.id === productObj.id);
  if (exists) {
    showAlert('The product already exists in the cart', 'error');
    return;
  }

  productsArray.push(productObj);
  showAlert('The Product was added correctly', 'success');
  productsHtml();
  updateCartCount();
  updateTotal();
}

function productsHtml() {
  cleanHtml();
  if (!contentProducts) return;

  productsArray.forEach(prod => {
    const { img, title, price, quantity, id } = prod;

    const tr = document.createElement('tr');

    const tdImg = document.createElement('td');
    const prodImg = document.createElement('img');
    prodImg.src = img;
    prodImg.alt = 'image product';
    tdImg.appendChild(prodImg);

    const tdTitle = document.createElement('td');
    const prodTitle = document.createElement('p');
    prodTitle.textContent = title;
    tdTitle.appendChild(prodTitle);

    const tdPrice = document.createElement('td');
    const prodPrice = document.createElement('p');
    prodPrice.textContent = `$${(price * quantity).toFixed(2)}`;
    tdPrice.appendChild(prodPrice);

    const tdQuantity = document.createElement('td');
    const prodQuantity = document.createElement('input');
    prodQuantity.type = 'number';
    prodQuantity.min = '1';
    prodQuantity.value = quantity;
    prodQuantity.dataset.id = id;
    prodQuantity.oninput = updateQuantity;
    tdQuantity.appendChild(prodQuantity);

    const tdDelete = document.createElement('td');
    const prodDelete = document.createElement('button');
    prodDelete.type = 'button';
    prodDelete.textContent = 'X';
    prodDelete.onclick = () => destroyProduct(id);
    tdDelete.appendChild(prodDelete);

    tr.append(tdImg, tdTitle, tdPrice, tdQuantity, tdDelete);
    contentProducts.appendChild(tr);
  });

  saveLocalStorage();
}

function saveLocalStorage() {
  localStorage.setItem('products', JSON.stringify(productsArray));
}

function updateQuantity(e) {
  const newQuantity = parseInt(e.target.value, 10);
  const idProd = parseInt(e.target.dataset.id, 10);

  const product = productsArray.find(prod => prod.id === idProd);
  if (product && newQuantity > 0) {
    product.quantity = newQuantity;
  }

  productsHtml();
  updateTotal();
  saveLocalStorage();
}

function destroyProduct(idProd) {
  productsArray = productsArray.filter(prod => prod.id !== idProd);
  showAlert('The product was correctly removed', 'success');
  productsHtml();
  updateCartCount();
  updateTotal();
  saveLocalStorage();
}

function cleanHtml() {
  if (!contentProducts) return;
  while (contentProducts.firstChild) {
    contentProducts.removeChild(contentProducts.firstChild);
  }
}

function showAlert(message, type) {
  const existing = document.querySelector('.alert');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.classList.add('alert', type);
  div.textContent = message;

  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

// ===== Función para verificar usuario con backend y actualizar UI =====
async function verificarUsuario() {
  try {
    const res = await fetch('https://vampipcs.onrender.com/api/user', {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) throw new Error('No autorizado');

    const user = await res.json();
    usuarioLogueado = true;

    if (profileLink) {
      profileLink.style.display = 'inline-block';
      profileLink.textContent = user.username || 'Perfil';
    }
    if (loginLink) loginLink.style.display = 'none';
    if (userMenuBtn) userMenuBtn.style.display = 'inline-block';

    if (user.isAdmin && adminLink) {
      adminLink.style.display = 'inline-block';
    } else if (adminLink) {
      adminLink.style.display = 'none';
    }
  } catch (error) {
    usuarioLogueado = false;

    if (profileLink) profileLink.style.display = 'none';
    if (loginLink) loginLink.style.display = 'inline-block';
    if (adminLink) adminLink.style.display = 'none';
    if (userMenuBtn) userMenuBtn.style.display = 'none';
  }
}

// ===== Event listener para icono usuario =====
if (userIcon) {
  userIcon.addEventListener('click', async (e) => {
    e.stopPropagation();

    // Verificar si hay usuario
    try {
      const res = await fetch('https://vampipcs.onrender.com/api/user', {
        method: 'GET',
        credentials: 'include'
      });
      console.log('Status:', res.status);
      if (!res.ok) throw new Error();

      const user = await res.json();

      // Mostrar panel de usuario
      if (sidePanel && sidePanel.classList.contains('open')) {
        sidePanel.classList.remove('open');
      }

      if (userPanel) userPanel.classList.add('open');
      if (overlay) overlay.classList.add('show');

    } catch (error) {
      console.error('Error:', error);
      // No está logueado, redirige a login
      window.location.href = 'login.html';
    }
  });
}


// Cerrar panel lateral usuario
closeUserPanelBtn.addEventListener('click', () => {
  userPanel.classList.remove('open');
  overlay.classList.remove('show');
});

// Cerrar panel lateral general
closeBtn.addEventListener('click', () => {
  sidePanel.classList.remove('open');
  overlay.classList.remove('show');
});

// Cerrar cualquier panel al hacer clic fuera
overlay.addEventListener('click', () => {
  if (userPanel.classList.contains('open')) {
    userPanel.classList.remove('open');
  }
  if (sidePanel.classList.contains('open')) {
    sidePanel.classList.remove('open');
  }
  overlay.classList.remove('show');
});

async function fetchLoggedUser() {
  try {
    const response = await fetch('https://vampipcs.onrender.com/auth/success', {
      credentials: 'include', // para enviar cookies de sesión
    });

    if (response.ok) {
      const data = await response.json();

      localStorage.setItem('userID', data.user._id);
      localStorage.setItem('username', data.user.username);
      localStorage.setItem('profilePhoto', data.user.profilePhoto);

      console.log('Usuario cargado en localStorage:', data.user);
    } else {
      console.log('No hay usuario logueado');
      localStorage.removeItem('userID');
      localStorage.removeItem('username');
      localStorage.removeItem('profilePhoto');
    }
  } catch (error) {
    console.error('Error al obtener usuario logueado:', error);
  }
}

// Ejecutar al cargar la página
fetchLoggedUser();


// ===== Cargar estado usuario al cargar la ventana =====
window.addEventListener('load', verificarUsuario);
