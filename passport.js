require('dotenv').config();

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const crypto = require('crypto');
const User = require('./models/User');

console.log("🧪 Probando sin process.env en callbackURL");

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID, // Puedes dejarlo así si sí está leyendo bien el CLIENT_ID
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://vampipcs.onrender.com/auth/google/callback" // 🔥 Aquí va directo
},

async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value.toLowerCase();
    let user = await User.findOne({ email });

    if (!user) {
      const userCount = await User.countDocuments();
      const rawUsername = profile.displayName;
      const safeUsername = rawUsername
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 30);

      user = new User({
        username: safeUsername || 'usuario' + Date.now(),
        email,
        password: crypto.randomBytes(20).toString('hex'),
        isVerified: true,
        isAdmin: email === 'apolinarioelman@gmail.com' || userCount === 0
      });

      await user.save();
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Serializar usuario (guardamos solo el ID en la sesión)
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserializar usuario (buscamos en DB para tener info completa)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID);
console.log('Google Client Secret:', process.env.GOOGLE_CLIENT_SECRET);
