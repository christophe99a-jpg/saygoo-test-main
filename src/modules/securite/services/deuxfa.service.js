// src/modules/securite/services/deuxfa.service.js
const DeuxFA = require('../../../database/models/DeuxFA');
const User = require('../../../database/models/User');
const TokenBlacklist = require('../../../database/models/TokenBlacklist');
const { journaliser } = require('../../../utils/audit');
const { envoyerSMS } = require('../../notifications/services/sms.service');
const { envoyerEmail } = require('../../notifications/services/email.service');
const logger = require('../../../utils/logger');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const env = require('../../../config/env');

// Générer un code OTP à 6 chiffres
const genererCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

// Envoyer un code 2FA
const envoyerCode2FA = async (userId, type = 'CONNEXION') => {
  const user = await User.findByPk(userId);
  if (!user) throw { statusCode: 404, message: 'Utilisateur introuvable' };

  // Invalider les anciens codes
  await DeuxFA.update(
    { utilise: true },
    { where: { userId, utilise: false, type } }
  );

  const code = genererCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const canal = user.canalCommunication || 'SMS';
  const destinataire = canal === 'EMAIL' ? user.email : user.telephone;

  const deuxFA = await DeuxFA.create({
    code,
    type,
    expiresAt,
    destinataire,
    userId,
  });

  // Envoi du code
  const message = `Votre code de vérification SAYGOO est : ${code}. Valable 5 minutes. Ne partagez jamais ce code.`;

  if (canal === 'EMAIL') {
    await envoyerEmail({
      email: destinataire,
      titre: 'Code de vérification SAYGOO',
      message,
    });
  } else {
    await envoyerSMS({ telephone: destinataire, message });
  }

  logger.info(`Code 2FA envoyé à ${destinataire} pour utilisateur ${userId}`);

  return {
    message: `Code envoyé sur ${canal === 'EMAIL' ? 'votre email' : 'votre téléphone'}`,
    expiresAt,
    canal,
    // En dev on retourne le code pour les tests
    ...(process.env.NODE_ENV === 'development' && { code }),
  };
};

// Vérifier un code 2FA
const verifierCode2FA = async (userId, code, type = 'CONNEXION') => {
  const deuxFA = await DeuxFA.findOne({
    where: {
      userId,
      type,
      utilise: false,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [['createdAt', 'DESC']],
  });

  if (!deuxFA) {
    await journaliser('2FA_ECHEC', {
      userId,
      details: { raison: 'Code expiré ou inexistant', type },
      succes: false,
    });
    throw { statusCode: 400, message: 'Code invalide ou expiré' };
  }

  // Vérifier le nombre de tentatives
  if (deuxFA.nombreTentatives >= 3) {
    await deuxFA.update({ utilise: true });
    throw { statusCode: 429, message: 'Trop de tentatives. Demandez un nouveau code.' };
  }

  if (deuxFA.code !== code) {
    await deuxFA.increment('nombreTentatives');
    await journaliser('2FA_ECHEC', {
      userId,
      details: { raison: 'Code incorrect', tentatives: deuxFA.nombreTentatives + 1 },
      succes: false,
    });
    throw { statusCode: 400, message: `Code incorrect. ${2 - deuxFA.nombreTentatives} tentative(s) restante(s)` };
  }

  // Code valide
  await deuxFA.update({ utilise: true });
  await journaliser('2FA_VERIFIE', { userId, details: { type } });

  return { valide: true, message: 'Code vérifié avec succès' };
};

// Activer le 2FA pour un utilisateur
const activer2FA = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw { statusCode: 404, message: 'Utilisateur introuvable' };

  // Envoyer un code de confirmation
  const resultat = await envoyerCode2FA(userId, 'CONNEXION');
  await journaliser('2FA_ACTIVE', { userId });

  return { message: '2FA activé. Vérifiez votre code pour confirmer.', ...resultat };
};

// Blacklister un token
const blacklisterToken = async (token, userId, raison = 'DECONNEXION') => {
  try {
    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await TokenBlacklist.create({ token, raison, expiresAt, userId });
    logger.info(`Token blacklisté pour utilisateur ${userId}`);
  } catch (err) {
    logger.error('Erreur blacklist token :', err.message);
  }
};

// Vérifier si un token est blacklisté
const estBlackliste = async (token) => {
  const trouve = await TokenBlacklist.findOne({ where: { token } });
  return !!trouve;
};

// Nettoyer les tokens expirés
const nettoyerTokensExpires = async () => {
  const count = await TokenBlacklist.destroy({
    where: { expiresAt: { [Op.lt]: new Date() } },
  });
  logger.info(`${count} tokens expirés supprimés de la blacklist`);
  return count;
};

// Obtenir l'audit trail d'un utilisateur
const obtenirAuditTrail = async (userId, role, filtres = {}) => {
  const AuditLog = require('../../../database/models/AuditLog');
  const where = {};

  if (role === 'OPERATEUR') where.userId = userId;
  if (filtres.action) where.action = filtres.action;
  if (filtres.succes !== undefined) where.succes = filtres.succes === 'true';

  return AuditLog.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: parseInt(filtres.limit) || 50,
    include: [{
      model: User,
      as: 'utilisateur',
      attributes: ['id', 'raisonSociale', 'email'],
    }],
  });
};

module.exports = {
  envoyerCode2FA,
  verifierCode2FA,
  activer2FA,
  blacklisterToken,
  estBlackliste,
  nettoyerTokensExpires,
  obtenirAuditTrail,
};