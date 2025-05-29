




let menu = document.querySelector('#menu-icon');
let navbar = document.querySelector('.navbar');

menu.onclick = () => {
    menu.classList.toggle('bx-x');
    navbar.classList.toggle('open');
};

// Mostrar u ocultar enlaces según sesión guardada en localStorage (quizás lo puedas eliminar si usas fetch a /api/user)
document.addEventListener('DOMContentLoaded', () => {
    const userLoggedIn = localStorage.getItem('user');

    const profileLink = document.getElementById('profileLink');
    const loginLink = document.getElementById('loginLink');

    if (userLoggedIn) {
        if (profileLink) profileLink.style.display = 'inline-block';
        if (loginLink) loginLink.style.display = 'none';
    } else {
        if (profileLink) profileLink.style.display = 'none';
        if (loginLink) loginLink.style.display = 'inline-block';
    }

    eventListeners(); // Mueve el llamado aquí para asegurar que el DOM esté listo
});

// --- CARRITO DE COMPRAS ---
const listProducts = document.querySelector('#listProducts');
const contentProducts = document.querySelector('#contentProducts');
const emptyCart = document.querySelector('#emptyCart');
let productsArray = [];

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
    const cartCount = document.querySelector('#cartCount');
    cartCount.textContent = productsArray.length;
}

function updateTotal() {
    const total = document.querySelector('#total');
    let totalProduct = productsArray.reduce((sum, prod) => sum + prod.price * prod.quantity, 0);
    total.textContent = `$${totalProduct.toFixed(2)}`;
}

function getDataElements(e) {
    if (e.target.classList.contains('btn-add')) {
        const elementHtml = e.target.parentElement.parentElement;
        selectData(elementHtml);
    }
}

function selectData(prod) {
    const productObj = {
        img: prod.querySelector('img').src,
        title: prod.querySelector('h4').textContent,
        price: parseFloat(prod.querySelector('#currentPrice').textContent.replace('$', '')),
        id: parseInt(prod.querySelector('button[type="button"]').dataset.id, 10),
        quantity: 1
    };

    const exists = productsArray.some(p => p.id == productObj.id);
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

// Swiper init (si lo usas)
var TrandingSlider = new Swiper('.tranding-slider', {
    effect: 'coverflow',
    grabCursor: true,
    centeredSlides: true,
    loop: true,
    slidesPerView: 'auto',
    coverflowEffect: {
        rotate: 0,
        stretch: 0,
        depth: 100,
        modifier: 2.5,
    },
    pagination: {
        el: '.swiper-pagination',
        clickable: true,
    },
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    }
});

// --- NUEVO: Mostrar u ocultar el usuario logueado y botón login según sesión en backend ---
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('https://vampipcs.onrender.com/api/user', { credentials: 'include' });
    const profileLink = document.getElementById('profileLink'); // si tienes link perfil
    const loginLink = document.getElementById('loginLink');     // botón o link de login
    const userInfoDiv = document.getElementById('user-info');   // contenedor para mostrar usuario
    const usernameSpan = document.getElementById('username-display'); // span para username

    if (response.ok) {
      const user = await response.json();

      if (usernameSpan) usernameSpan.textContent = user.username;
      if (userInfoDiv) userInfoDiv.style.display = 'inline-block';

      // Ocultar botón login
      if (loginLink) loginLink.style.display = 'none';
      if (profileLink) profileLink.style.display = 'inline-block';

    } else {
      // No logueado, mostrar botón login y ocultar perfil y usuario
      if (loginLink) loginLink.style.display = 'inline-block';
      if (profileLink) profileLink.style.display = 'none';
      if (userInfoDiv) userInfoDiv.style.display = 'none';
    }
  } catch (error) {
    console.error('Error al obtener usuario:', error);
  }
});

async function checkUserSession() {
  try {
    const res = await fetch('https://vampipcs.onrender/api/user', { credentials: 'include' }); // Cambia la ruta si tienes otra para obtener el usuario logueado
    if (!res.ok) throw new Error('No autenticado');

    const data = await res.json();

    // Mostrar nombre de usuario en el enlace "Mi Perfil"
    const profileLink = document.getElementById('profileLink');
    profileLink.textContent = data.username;  // Cambia el texto
    profileLink.style.display = 'inline-block';

    // Ocultar enlace de login
    const loginLink = document.getElementById('loginLink');
    loginLink.style.display = 'none';

  } catch (error) {
    // Usuario no está logueado: mostrar enlace de login y ocultar perfil
    document.getElementById('profileLink').style.display = 'none';
    document.getElementById('loginLink').style.display = 'inline-block';
  }
}

async function verificarUsuario() {
  try {
    const res = await fetch('https://vampipcs.onrender/api/user', { credentials: 'include' });
    if (!res.ok) throw new Error('No autorizado');

    const user = await res.json();

    if (user) {
      // Mostrar links de perfil y ocultar login
      document.getElementById('profileLink').style.display = 'inline-block';
      document.getElementById('loginLink').style.display = 'none';

      // Si es admin, mostrar link admin
      if (user.isAdmin) {
        document.getElementById('adminLink').style.display = 'inline-block';
      }
    }
  } catch (error) {
    // Si no está logueado
    document.getElementById('profileLink').style.display = 'none';
    document.getElementById('loginLink').style.display = 'inline-block';
    document.getElementById('adminLink').style.display = 'none';
  }
}

window.addEventListener('load', verificarUsuario);


checkUserSession();
