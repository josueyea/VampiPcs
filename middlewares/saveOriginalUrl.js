function saveOriginalUrl(req, res, next) {
  if (!req.isAuthenticated() && req.method === 'GET') {
    req.session.returnTo = req.originalUrl;
  }
  next();
}

module.exports = saveOriginalUrl;
