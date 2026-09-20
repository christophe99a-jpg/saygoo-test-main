require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const dedouanementRoutes = require('./routes/dedouanement.routes');
const stockageRoutes = require('./routes/stockage.routes');
const vehiculeRoutes = require('./routes/vehicule.routes');
const suiviRoutes = require('./routes/suivi.routes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3009;

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

app.use('/dedouanement', dedouanementRoutes);
app.use('/stockage', stockageRoutes);
app.use('/vehicules', vehiculeRoutes);
app.use('/suivi', suiviRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'saygoo-operateur-economique-service',
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

app.listen(PORT, () => {
  logger.info(`🧑‍💼 SAYGOO Opérateur Économique Service démarré sur le port ${PORT}`);
});