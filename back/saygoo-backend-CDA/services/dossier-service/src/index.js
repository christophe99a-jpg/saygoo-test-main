require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const prisma = require('./config/prisma');
const dossierRoutes = require('./routes/dossier.routes');
const documentRoutes = require('./routes/document.routes');
const vehiculeRoutes = require('./routes/vehicule.routes');
const stockageRoutes = require('./routes/stockage.routes');
const transportRoutes = require('./routes/transport.routes');
const catalogueRoutes = require('./routes/catalogue.routes');
const fichierRoutes = require('./routes/fichier.routes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3007;

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

app.use('/dossiers', dossierRoutes);
app.use('/formalites', vehiculeRoutes);
app.use('/stockage', stockageRoutes);
app.use('/transport', transportRoutes);
app.use('/vehicules', catalogueRoutes);
// fichierRoutes d'abord : il porte /documents/upload, que documentRoutes
// masquerait si l'ordre etait inverse.
app.use('/documents', fichierRoutes);
app.use('/documents', documentRoutes);

app.get('/health', async (req, res) => {
  const dbOk = await prisma.$queryRaw`SELECT 1`
    .then(() => true)
    .catch(() => false);

  res.json({
    status: dbOk ? 'ok' : 'degraded',
    service: 'saygoo-dossier-service',
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
      logger.info(`📂 SAYGOO Dossier Service démarré sur le port ${PORT}`);
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