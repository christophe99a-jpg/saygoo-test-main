// src/server.js
const app = require('./app');
const { connectDB } = require('./config/database');
const env = require('./config/env');
const logger = require('./utils/logger');

const demarrer = async () => {
  await connectDB();

  app.listen(env.port, () => {
    logger.info(`SAYGOO API démarrée sur le port ${env.port} [${env.nodeEnv}]`);
    logger.info(`Health check : http://localhost:${env.port}/health`);
  });
};

demarrer().catch((err) => {
  logger.error('Erreur démarrage serveur :', err);
  process.exit(1);
});