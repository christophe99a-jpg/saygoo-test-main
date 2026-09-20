require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const prisma = require('./config/prisma');
const factureRoutes = require('./routes/facture.routes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(helmet());
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes. Veuillez patienter.' }
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) }
}));

app.use('/factures', factureRoutes);

app.get('/health', async (req, res) => {
  const dbOk = await prisma.$queryRaw`SELECT 1`
    .then(() => true)
    .catch(() => false);

  res.json({
    status: dbOk ? 'ok' : 'degraded',
    service: 'saygoo-facturation-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route non trouvée : ${req.path}`
  });
});

app.use((err, req, res, next) => {
  logger.error('Erreur serveur', { err: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Une erreur interne s\'est produite.'
      : err.message
  });
});

const start = async () => {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connecté ✓');

    app.listen(PORT, () => {
      logger.info(`🧾 SAYGOO Facturation Service démarré sur le port ${PORT}`);
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