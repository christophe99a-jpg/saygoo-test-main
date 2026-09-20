require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const prisma = require('./config/prisma');
const notificationRoutes = require('./routes/notification.routes');
const { MODE_SIMULATION } = require('./services/dispatcher');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3004;

// ── Sécurité ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes. Veuillez patienter.' }
}));

// ── Middlewares ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) }
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/notifications', notificationRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const dbOk = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);

  res.json({
    status: dbOk ? 'ok' : 'degraded',
    service: 'saygoo-notification-service',
    version: '1.0.0',
    modeSimulation: MODE_SIMULATION,
    timestamp: new Date().toISOString()
  });
});

// ── Gestion des erreurs ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route non trouvée : ${req.path}` });
});

app.use((err, req, res, next) => {
  logger.error('Erreur serveur', { err: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Une erreur interne s\'est produite.' : err.message
  });
});

// ── Démarrage ─────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connecté ✓');

    if (MODE_SIMULATION) {
      logger.warn('Mode SIMULATION actif : les notifications sont enregistrées mais non expédiées.');
    }

    app.listen(PORT, () => {
      logger.info(`🔔 SAYGOO Notification Service démarré sur le port ${PORT}`);
    });
  } catch (err) {
    logger.error('Échec du démarrage', { err: err.message });
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('Arrêt du service...');
  await prisma.$disconnect();
  process.exit(0);
});

start();
