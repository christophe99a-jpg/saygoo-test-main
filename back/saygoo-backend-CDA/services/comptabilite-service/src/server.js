const app = require('./app');
const prisma = require('./config/prisma');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3003;

const start = async () => {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connecté ✓');
    app.listen(PORT, () => {
      logger.info(`SAYGOO Comptabilité (SYSCOHADA) démarré sur le port ${PORT}`);
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
