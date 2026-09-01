// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../database/models/User');
const TokenBlacklist = require('../database/models/TokenBlacklist');
const env = require('../config/env');
const response = require('../utils/response');

const authentifier = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.unauthorized(res, 'Token manquant');
    }

    const token = authHeader.split(' ')[1];

    // Vérifier si le token est blacklisté
    const blackliste = await TokenBlacklist.findOne({ where: { token } });
    if (blackliste) {
      return response.unauthorized(res, 'Session révoquée. Veuillez vous reconnecter.');
    }

    const payload = jwt.verify(token, env.jwt.secret);
    const user = await User.findOne({ where: { id: payload.id, isActive: true } });
    if (!user) return response.unauthorized(res, 'Utilisateur introuvable ou inactif');

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return response.unauthorized(res, 'Token expiré');
    }
    return response.unauthorized(res, 'Token invalide');
  }
};

const kycValide = (req, res, next) => {
  if (req.user.statutKYC !== 'VALIDE') {
    return response.forbidden(res, 'KYC non validé. Veuillez compléter votre vérification.');
  }
  next();
};

const autoriser = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return response.forbidden(res, 'Vous n\'avez pas les droits nécessaires');
  }
  next();
};

module.exports = { authentifier, kycValide, autoriser };