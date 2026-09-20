// src/middlewares/error.middleware.js
const logger = require('../utils/logger');

const gestionErreurs = (err, req, res, next) => {
  logger.error(`${err.message} — ${req.method} ${req.path}`);

  // Erreur Multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Fichier trop volumineux (max 10MB)' });
  }

  // Erreur Sequelize
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ success: false, message: 'Cette valeur existe déjà' });
  }

  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map((e) => e.message);
    return res.status(400).json({ success: false, message: 'Données invalides', errors: messages });
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erreur serveur interne',
  });
};

module.exports = { gestionErreurs };