function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'No has iniciado sesión' });
}

function isAdmin(req, res, next) {
  console.log('Verificando admin para usuario:', req.user);

  if (req.isAuthenticated() && req.user && req.user.isAdmin) {
    return next();
  }
  return res.status(403).json({ message: 'Acceso denegado: solo para administradores' });
}

module.exports = {
  isAuthenticated,
  isAdmin
};
