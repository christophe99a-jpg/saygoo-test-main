// src/config/database.js
const { Sequelize } = require('sequelize');
const env = require('./env');
const logger = require('../utils/logger');
const path = require('path');

const dbDialect = process.env.DB_DIALECT || 'postgres'; // Préparation pour Supabase (PostgreSQL)

let sequelize;

try {
  if (dbDialect === 'sqlite') {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE || path.join(__dirname, '../../database.sqlite'),
      logging: (msg) => logger.debug(msg),
    });
  } else {
    sequelize = new Sequelize(env.db.name || 'postgres', env.db.user || 'postgres', env.db.password || '', {
      host: env.db.host || 'localhost',
      port: env.db.port || 5432,
      dialect: 'postgres',
      logging: (msg) => logger.debug(msg),
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });
  }
} catch (error) {
  logger.warn('Mode sans BDD activé suite à une impossibilité d\'initialiser Sequelize :', error.message);
  // On utilise un Proxy pour mocker toutes les méthodes Sequelize possibles sans erreur
  const mockModel = new Proxy({ prototype: {} }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'sync') return async () => {};
      return () => mockModel;
    }
  });
  sequelize = {
    authenticate: async () => { throw new Error('Sequelize non initialisé'); },
    sync: async () => {},
    define: () => mockModel,
    query: async () => [],
    options: { dialect: dbDialect }
  };
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info(`${dbDialect.toUpperCase()} connecté avec succès`);
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Modèles synchronisés');
    }
  } catch (error) {
    logger.warn(`Info DB (${dbDialect}): Fonctionnement en mode sans base de données. (${error.message})`);
    // process.exit(1); // <-- Retiré pour permettre au frontend d'être servi
  }
};

module.exports = { sequelize, connectDB };