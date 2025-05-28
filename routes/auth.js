const express = require('express');
const passport = require('passport');
const router = express.Router();

// Iniciar login con Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Callback de Google
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/index.html');
  }
);

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {                                                          
    res.redirect('/');
  });
});

module.exports = router;
