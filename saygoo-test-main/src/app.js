// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const { gestionErreurs } = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

// Chargement des modèles
require('./database/models/User');
require('./database/models/Dossier');
require('./database/models/Cotation');
require('./database/models/Paiement');
require('./database/models/Tracking');
require('./database/models/Notification');
require('./database/models/Stockage');
require('./database/models/MouvementStock');
require('./database/models/Produit');
require('./database/models/Commande');
require('./database/models/AuditLog');
require('./database/models/TokenBlacklist');
require('./database/models/DeuxFA');
require('./database/models/Wallet');
require('./database/models/TransactionWallet');

// Routes
const authRoutes = require('./modules/auth/routes/auth.routes');
const kycRoutes = require('./modules/kyc/routes/kyc.routes');
const dedouanementRoutes = require('./modules/dedouanement/routes/dedouanement.routes');
const cotationRoutes = require('./modules/cotations/routes/cotation.routes');
const paiementRoutes = require('./modules/paiement/routes/paiement.routes');
const trackingRoutes = require('./modules/tracking/routes/tracking.routes');
const transportRoutes = require('./modules/transport/routes/transport.routes');
const notificationRoutes = require('./modules/notifications/routes/notifications.routes');
const stockageRoutes = require('./modules/stockage/routes/stockage.routes');
const marketplaceRoutes = require('./modules/marketplace/routes/marketplace.routes');
const analyticsRoutes = require('./modules/analytics/routes/analytics.routes');
const securiteRoutes = require('./modules/securite/routes/securite.routes');
const walletRoutes = require('./modules/wallet/routes/wallet.routes');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Trop de requêtes, réessayez dans 15 minutes.' },
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customSiteTitle: 'SAYGOO API Documentation',
  customCss: '.swagger-ui .topbar { background-color: #1a56db; }',
  swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
}));
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpecs);
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SAYGOO API opérationnelle',
    version: '1.0.0',
    docs: 'http://localhost:3000/api/docs',
  });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/kyc', kycRoutes);
app.use('/api/v1/dossiers', dedouanementRoutes);
app.use('/api/v1/cotations', cotationRoutes);
app.use('/api/v1/paiements', paiementRoutes);
app.use('/api/v1/tracking', trackingRoutes);
app.use('/api/v1/transport', transportRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/stockage', stockageRoutes);
app.use('/api/v1/marketplace', marketplaceRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/securite', securiteRoutes);
app.use('/api/v1/wallet', walletRoutes);

// ─── Servir le front-end en production ──────────────────────────
const path = require('path');
const serveFrontend = process.env.SERVE_FRONTEND === 'true' || process.env.NODE_ENV === 'production';

if (serveFrontend) {
  const frontDistPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontDistPath));

  // SPA catch-all : toutes les routes non-API renvoient index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }
    res.sendFile(path.join(frontDistPath, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' });
});

app.use(gestionErreurs);

module.exports = app;