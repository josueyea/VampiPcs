(function() {
  const user = localStorage.getItem('user');
  if (!user) {
    alert('Necesitas iniciar sesión para acceder a esta página.');
    window.location.href = 'login.html';
  }
})();