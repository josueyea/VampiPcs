const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');
const toggleBtns = document.querySelectorAll('.toggle-panel .btn');
const API_BASE = 'https://vampipcs.onrender.com';

registerBtn.addEventListener('click', () => {
    container.classList.add('active');
});

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
});


if (loginForm) {
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const emailInput = loginForm.querySelector('input[name="email"]');
    const passwordInput = loginForm.querySelector('input[name="password"]');

    if (!emailInput || !passwordInput) {
      console.error('Campos no encontrados');
      return;
    }

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    try {
      console.log('📤 Enviando datos:', { email, password });
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      console.log('🧾 Resultado del login:', result);

      if (response.ok) {
        const user = result.user;
        console.log('✅ Usuario devuelto del backend:', user);

        // 👉 Comprobamos si hay roles válidos
        if (Array.isArray(user.roles)) {
          console.log('🎭 Guardando roles:', user.roles);
          localStorage.setItem('userRoles', JSON.stringify(user.roles));
        } else {
          console.warn('⚠️ Usuario no tiene roles válidos. Guardando array vacío');
          localStorage.setItem('userRoles', JSON.stringify([]));
        }

        // Guardar otros datos
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userID', user._id);
        localStorage.setItem('username', user.username);
        localStorage.setItem('profilePhoto', user.profilePhoto || '');

        console.log('✅ Roles guardados:', localStorage.getItem('userRoles'));

        const prevPage = document.referrer;
        if (!prevPage || prevPage.includes('login.html') || prevPage.includes('register.html')) {
          window.location.href = `${window.location.origin}/index.html`;
        } else {
          window.location.href = prevPage;
        }
      } else {
        showToast(result.message || 'Error en login');
      }
    } catch (error) {
      console.error('Error en login:', error);
      showToast('Error en login');
    }
  });
}


// Validar confirmación de password y feedback para registro

const registerForm = document.querySelector('.form-box.register form');

if (registerForm) {
  // Puedes eliminar este bloque si no quieres mostrar mensajes en un div visible
  // const messageDiv = document.getElementById('error-message'); 

  const spinner = document.createElement('div');
  spinner.textContent = 'Cargando...';
  spinner.style.marginTop = '10px';
  spinner.style.fontWeight = '600';
  spinner.style.display = 'none';
  // Si usas messageDiv, asegúrate que exista y está en el DOM
  // messageDiv.parentNode.appendChild(spinner);

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = registerForm.password.value;
    const confirmPassword = registerForm.confirmPassword.value;

    if (password !== confirmPassword) {
      // Usamos toast para el error
      showToast('❌ Las contraseñas no coinciden.');
      return;
    }

    spinner.style.display = 'block';
    // messageDiv.textContent = '';

    try {
      const formData = {
        username: registerForm.username.value,
        email: registerForm.email.value,
        password,
        confirmPassword: registerForm.confirmPassword.value,
      };

      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      spinner.style.display = 'none';

      if (response.ok) {
        // Mensaje verde con toast
        showToast('✅ ' + result.message);
        registerForm.reset();
      } else {
        showToast('❌ ' + result.message);
      }
    } catch (error) {
      spinner.style.display = 'none';
      showToast('❌ Error inesperado');
    }
  });
}


function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  const overlay = document.getElementById('toast-overlay');

  toast.textContent = message;

  // Mostrar toast y overlay
  toast.classList.add('show');
  overlay.classList.add('show');

  // Ocultar después de la duración
  setTimeout(() => {
    toast.classList.remove('show');
    overlay.classList.remove('show');
  }, duration);
}
