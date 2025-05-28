window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/user', {
      credentials: 'include'  // importante para enviar la cookie de sesión
    });

    if (res.status === 401) {
      alert('No autorizado. Por favor inicia sesión.');
      window.location.href = '/'; // redirige al login
      return;
    }

    const user = await res.json();
    document.getElementById('username').textContent = user.username;
    document.getElementById('email').textContent = user.email;
  } catch (err) {
    console.error(err);
  }
});
