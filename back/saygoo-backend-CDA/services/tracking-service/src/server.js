const app = require('./app');
const prisma = require('./config/prisma');
const logger = require('./utils/logger');

// 3007 était déjà pris par dossier-service : le tracking écoute sur 3011.
const PORT = process.env.PORT || 3011;

const start = async () => {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connecté ✓');
    app.listen(PORT, () => {
      logger.info(`SAYGOO Tracking Service démarré sur le port ${PORT}`);
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
