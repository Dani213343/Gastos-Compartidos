// backend/server.js (o index.js)
require('dotenv').config();

const express = require('express');
const path = require('path');
const connectDB = require('./config/db');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');
// const xss = require('xss-clean'); // activa solo si es estable en tu entorno

const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const cardsRoutes = require("./routes/cards");

const invoiceRoutes = require("./routes/invoice.routes");

// =====================
// [MICROKERNEL] imports
// =====================
const bus = require('./kernel/bus'); // ← Bus de eventos global
const { loadGroupPlugins } = require('./plugins/groups/loader'); // ← Loader de plugins

// Rutas principales
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const expensesRoutes = require('./routes/expenses');

const app = express();

// ✅ NUEVO: manejo de directorios de uploads
const fs = require('fs'); // <-- import para FS

// ✅ NUEVO: crear carpetas backend/uploads e backend/uploads/invoices si no existen
const dirs = [
  path.join(__dirname, 'uploads'),
  path.join(__dirname, 'uploads', 'invoices'),
];

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('[FS] Directorio creado:', dir);
  }
});

// ==========================
// CONFIGURACIÓN DE SEGURIDAD
// ==========================
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Mostrar el origin de cada petición API (debug)
app.use((req, _res, next) => {
  if (req.path.startsWith("/api")) {
    console.log("[CORS DEBUG] Origin:", req.headers.origin, "Host:", req.headers.host, "URL:", req.originalUrl);
  }
  next();
});

// ======================
// CORS (Frontend Origins)
// ======================
function parseCsv(str) {
  return (str || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

const ENV_ORIGINS = parseCsv(process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN);

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","x-auth-token"],
  optionsSuccessStatus: 204
};

app.use("/api", cors(corsOptions));
app.options("/api/*", cors(corsOptions));

// ======================
// Hardening en producción
// ======================
if (process.env.NODE_ENV === 'production') {
  app.use(helmet.hsts({ maxAge: 15552000, includeSubDomains: true, preload: false }));
  app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));
  app.use(helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", "data:"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "script-src": ["'self'"],
      "connect-src": ["'self'"],
    }
  }));
}

// ======================
// Parsers y limitadores
// ======================
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));

app.use(mongoSanitize());
app.use(hpp());
// app.use(xss());
app.use(compression());

// Rate limiting por ruta
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});
app.use('/api/auth', authLimiter);

const writeLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use(['/api/groups', '/api/expenses', '/api/cards'], writeLimiter);

// =================================
// [MICROKERNEL] Conectar DB y cargar
// =================================
connectDB()
  .then(async () => {

    // ✅ Hacer el bus accesible globalmente
    app.locals.bus = bus;

    // ✅ Contexto que se pasa a los plugins
    const context = {
      app, // 👈 necesario para que los plugins registren rutas (ej. /api/alerts)
      bus, // sistema de eventos interno
      models: {
        User: require('./models/User'),
        Group: require('./models/Group'),
        Expense: require('./models/Expense'),
        GroupRole: require('./models/GroupRole'),
      },
      config: process.env,
      log: console,
    };

    // Tarjeta
    app.use("/api/cards", cardsRoutes);

    // Factura
    app.use("/api", invoiceRoutes);

    // ✅ Cargar plugins (ej. alertas, recordatorios, etc.)
    await loadGroupPlugins(context);

    // ======================
    //  RUTAS API PRINCIPALES
    // ======================
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/groups', groupRoutes);
    app.use('/api/expenses', expensesRoutes);

    // 404 solo para endpoints desconocidos de API
    app.use('/api', notFound);

    // ======================
    //  FRONTEND EN PRODUCCIÓN
    // ======================
    if (process.env.NODE_ENV === 'production') {
      const frontendPath = path.join(__dirname, '..', 'frontend', 'build');
      app.use(express.static(frontendPath));
      app.get('*', (_req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
    }

    // ======================
    //  MIDDLEWARE GLOBAL
    // ======================
    app.use(errorHandler);

    // ======================
    //  INICIAR SERVIDOR
    // ======================
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`✅ Servidor corriendo en el puerto ${PORT}`));
  })
  .catch((err) => {
    console.error('[DB] Error al conectar:', err);
    process.exit(1);
  });
