document.addEventListener("DOMContentLoaded", () => {
  const cartIcon = document.getElementById("cart-icon");
  const cartPanel = document.getElementById("cart-panel");
  const closeCartBtn = document.getElementById("close-cart");
  const cartCount = document.getElementById("cart-count");
  const cartItemsList = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");
  const checkoutBtn = document.getElementById("checkout-btn");
  const cartOverlay = document.querySelector(".cart-overlay");

  // Verificar que existen todos los elementos clave del carrito
  if (!cartIcon || !cartPanel || !cartCount || !cartItemsList || !cartTotal || !checkoutBtn) {
    console.warn("Elementos del carrito no encontrados. ¿Olvidaste incluir el HTML del carrito en esta página?");
    return;
  }


  // Mostrar u ocultar panel carrito con toggle, y evitar propagación para que no se cierre inmediatamente
  if (cartIcon && cartPanel) {
  cartIcon.addEventListener("click", () => {
    cartPanel.classList.toggle("open");
  });

  closeCartBtn?.addEventListener("click", () => {
    cartPanel.classList.remove("open");
  });
}

  // Evitar que clicks dentro del panel cierren el panel
  cartPanel.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Cerrar el panel al hacer click en el botón de cerrar
  if (closeCartBtn) {
    closeCartBtn.addEventListener("click", () => {
      console.log("Click en icono carrito");
      cartPanel.classList.remove("open");
    });
  }

  // Cerrar el panel si haces click fuera del icono y del panel
  document.addEventListener('click', (e) => {
    if (
        !cartPanel.contains(e.target) &&
        !cartIcon.contains(e.target) &&
        !e.target.classList.contains('btn-add')
    ) {
        cartPanel.classList.remove('open');
        if (cartOverlay) cartOverlay.classList.remove('show');
    }
    });


  // Carrito como objeto: idProducto -> {id, name, price, quantity}
  // Restaurar carrito desde localStorage
    const storedCart = localStorage.getItem("cart");
    const cart = storedCart ? JSON.parse(storedCart) : {};

    // Mostrar carrito visualmente con datos restaurados
    updateCartUI();

  // Función para actualizar contador y total
  function updateCartUI() {
    const totalItems = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);
    if (totalItems > 0) {
      cartCount.style.display = "inline-block";
      cartCount.textContent = totalItems;
    } else {
      cartCount.style.display = "none";
    }

    cartItemsList.innerHTML = "";
    let totalPrice = 0;

    Object.values(cart).forEach(item => {
      totalPrice += item.price * item.quantity;

      const li = document.createElement("li");
      li.classList.add("cart-item");
      li.innerHTML = `
        <div class="cart-item-info">
          <strong>${item.name}</strong>
          <span>$${item.price.toFixed(2)} x ${item.quantity}</span>
        </div>
        <div class="cart-item-actions">
          <button class="btn-remove" data-id="${item.id}" title="Eliminar">×</button>
        </div>
      `;
      cartItemsList.appendChild(li);
    });

    cartTotal.textContent = totalPrice.toFixed(2);

    // Añadir eventos a botones eliminar
    const removeBtns = cartItemsList.querySelectorAll(".btn-remove");
    removeBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (cart[id]) {
          delete cart[id];
          updateCartUI();
        }
      });
    });
  }

  // Añadir producto al carrito
  function addToCart(productId, name, price) {
    if (cart[productId]) {
      cart[productId].quantity++;
    } else {
      cart[productId] = {
        id: productId,
        name,
        price,
        quantity: 1
      };
    }
    updateCartUI();
  }

  // Manejar click en botones "Add Cart"
  const addButtons = document.querySelectorAll(".btn-add");
  addButtons.forEach(button => {
    button.addEventListener("click", () => {
        const productEl = button.closest(".product");
        const productId = button.getAttribute("data-id");
        const productName = productEl.querySelector("h4").textContent.trim();

        // Precio actual mostrado
        let priceText = productEl.querySelector(".currentPrice").textContent.trim();
        let price = parseFloat(priceText.replace("$", ""));

        addToCart(productId, productName, price);

        // 🔥 Abre el panel automáticamente
        cartPanel.classList.add('open');
        if (cartOverlay) cartOverlay.classList.add('show'); // si estás usando overlay
    });
    });

  // Finalizar compra
  checkoutBtn.addEventListener("click", () => {
    if (Object.keys(cart).length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }
    alert("Gracias por tu compra! Total: $" + cartTotal.textContent);
    for (let key in cart) delete cart[key];
    localStorage.removeItem("cart");
    updateCartUI();
    cartPanel.classList.remove("open");

    updateCartUI();
  });



    if (cartIcon && cartPanel && cartOverlay) {
    cartIcon.addEventListener("click", () => {
      cartPanel.classList.toggle("open");
      cartOverlay.classList.toggle("show");
    });

    closeCartBtn.addEventListener("click", () => {
      cartPanel.classList.remove("open");
      cartOverlay.classList.remove("show");
    });

    cartOverlay.addEventListener("click", () => {
      cartPanel.classList.remove("open");
      cartOverlay.classList.remove("show");
    });
  }


  // Inicializar UI carrito (sin productos)
  function updateCartUI() {
    // Guardar en localStorage
    localStorage.setItem("cart", JSON.stringify(cart));

    const totalItems = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);

    if (totalItems > 0) {
        cartCount.style.display = "inline-block";
        cartCount.textContent = totalItems;
    } else {
        cartCount.style.display = "none";
    }

    cartItemsList.innerHTML = "";
    let totalPrice = 0;

    Object.values(cart).forEach(item => {
        totalPrice += item.price * item.quantity;

        const li = document.createElement("li");
        li.classList.add("cart-item");
        li.innerHTML = `
        <div class="cart-item-info">
            <strong>${item.name}</strong>
            <span>$${item.price.toFixed(2)} x ${item.quantity}</span>
        </div>
        <div class="cart-item-actions">
            <button class="btn-remove" data-id="${item.id}" title="Eliminar">×</button>
        </div>
        `;
        cartItemsList.appendChild(li);
    });

    cartTotal.textContent = totalPrice.toFixed(2);

    const removeBtns = cartItemsList.querySelectorAll(".btn-remove");
    removeBtns.forEach(btn => {
        btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (cart[id]) {
            delete cart[id];
            updateCartUI();
        }
        });
    });
    }
});


