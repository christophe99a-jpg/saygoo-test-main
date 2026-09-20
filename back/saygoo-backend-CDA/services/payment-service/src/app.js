require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const prisma = require('./config/prisma');
const paymentRoutes = require('./routes/payment.routes');
const compteRoutes = require('./routes/compte.routes');
const logger = require('./utils/logger');

const app = express();

// ── Sécurité ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Limiteur global. Le webhook en est exclu : un prestataire qui rejoue
// ses notifications en rafale ne doit pas être bloqué par le quota.
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/paiements/webhook',
  message: { success: false, message: 'Trop de requêtes. Veuillez patienter.' }
}));

// ── Middlewares ───────────────────────────────────────────────────────────────
// verify capture le corps BRUT avant le parsing JSON.
// Indispensable pour recalculer le HMAC : re-sérialiser req.body ne redonne pas
// les mêmes octets (ordre des clés, espaces), donc la signature ne correspondrait pas.
app.use(express.json({
  limit: '10kb',
  verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: () => process.env.NODE_ENV === 'test'
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/paiements', paymentRoutes);
app.use('/compte', compteRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const dbOk = await prisma.$queryRaw`SELECT 1`
    .then(() => true)
    .catch(() => false);

  res.json({
    status: dbOk ? 'ok' : 'degraded',
    service: 'saygoo-payment-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ── Gestion des erreurs ───────────────────────────────────────────────────────
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

module.exports = app;