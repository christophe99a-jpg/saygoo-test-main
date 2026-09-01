// src/utils/audit.js
const AuditLog = require('../database/models/AuditLog');
const logger = require('./logger');

const journaliser = async (action, options = {}) => {
  try {
    await AuditLog.create({
      action,
      userId: options.userId || null,
      entiteType: options.entiteType || null,
      entiteId: options.entiteId || null,
      details: options.details || null,
      succes: options.succes !== undefined ? options.succes : true,
      messageErreur: options.messageErreur || null,
      adresseIP: options.adresseIP || null,
      userAgent: options.userAgent || null,
    });
  } catch (err) {
    logger.error('Erreur journalisation audit :', err.message);
  }
};

// Middleware pour extraire l'IP et le User-Agent
const extraireContexte = (req) => ({
  adresseIP: req.ip || req.headers['x-forwarded-for'] || 'inconnue',
  userAgent: req.headers['user-agent'] || 'inconnu',
});

module.exports = { journaliser, extraireContexte };