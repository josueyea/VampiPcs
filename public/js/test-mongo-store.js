const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

(async () => {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB.');

    console.log('🧪 Creando MongoStore...');
    const mongoStore = MongoStore.create({
      mongoUrl: MONGODB_URI,
      collectionName: 'sessions',
    });

    mongoStore.on('error', (err) => {
      console.error('❌ Error en MongoStore:', err);
    });

    console.log('✅ MongoStore creado correctamente.');

    // Simular uso en sesión
    const sessionMiddleware = session({
      secret: 'testsecret',
      resave: false,
      saveUninitialized: false,
      store: mongoStore,
    });

    console.log('🧪 Middleware de sesión creado.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error general:', error);
    process.exit(1);
  }
})();
