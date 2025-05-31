
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


document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.form-box.login form');

    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const emailInput = loginForm.querySelector('input[name="email"]');
            const passwordInput = loginForm.querySelector('input[name="password"]');

            if (!emailInput || !passwordInput) {
                console.error('Campos no encontrados');
                return;
            }

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            try {
                const response = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ email, password }),
                });

                const result = await response.json();

                if (response.ok) {
                    localStorage.setItem('user', JSON.stringify(result.user)); // <--- Guarda los datos del usuario
                    window.location.href = `${window.location.origin}/index.html`;
                } else {
                    alert(result.message || 'Error en login');
                }
            } catch (error) {
                console.error('Error en login:', error);
                alert('Error en login');
            }
        });
    }
});

// Validar confirmación de password y feedback para registro

const registerForm = document.querySelector('.form-box.register form');

if (registerForm) {
  const messageDiv = document.getElementById('error-message'); // usa el div existente
  const spinner = document.createElement('div');
  spinner.textContent = 'Cargando...';
  spinner.style.marginTop = '10px';
  spinner.style.fontWeight = '600';
  spinner.style.display = 'none';
  messageDiv.parentNode.appendChild(spinner);

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = registerForm.password.value;
    const confirmPassword = registerForm.confirmPassword.value;

    if (password !== confirmPassword) {
      messageDiv.textContent = '❌ Las contraseñas no coinciden.';
      messageDiv.style.color = 'red';
      return;
    }

    spinner.style.display = 'block';
    messageDiv.textContent = '';

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

      const result = await response.json(); // Aquí cambio a json()

      spinner.style.display = 'none';

      if (response.ok) {
        messageDiv.textContent = '✅ ' + result.message;
        messageDiv.style.color = 'green';
        registerForm.reset();
      } else {
        messageDiv.textContent = '❌ ' + result.message;
        messageDiv.style.color = 'red';
      }
    } catch (error) {
      spinner.style.display = 'none';
      messageDiv.textContent = '❌ Error inesperado';
      messageDiv.style.color = 'red';
    }
  });
}

document.querySelector('.form-box.login form').addEventListener('submit', async function (e) {
  e.preventDefault(); // evitar que recargue la página

  const form = e.target;
  const formData = new FormData(form);
  const data = {
    email: formData.get('email'),
    password: formData.get('password')
  };

  try {
    const response = await fetch('https://vampipcs.onrender.com/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // 🔐 Esto es clave para que la cookie se guarde
      body: JSON.stringify(data)
    });

    if (response.ok) {
      const result = await response.text(); // o JSON si tu backend responde JSON
      console.log('✅ Login exitoso:', result);
      // Redirige o actualiza la UI
    } else {
      console.error('❌ Error en login:', response.status);
    }
  } catch (error) {
    console.error('⚠️ Error en fetch login:', error);
  }
});


console.log('Body recibido:', req.body);

