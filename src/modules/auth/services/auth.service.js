// src/modules/auth/services/auth.service.js
const jwt = require('jsonwebtoken');
const User = require('../../../database/models/User');
const env = require('../../../config/env');
const logger = require('../../../utils/logger');

// Génération des tokens
const genererTokens = (userId, role) => {
  const payload = { id: userId, role };

  const accessToken = jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });

  const refreshToken = jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });

  return { accessToken, refreshToken };
};

// Inscription
const inscrire = async (donnees) => {
  const { email } = donnees;

  const existant = await User.findOne({ where: { email } });
  if (existant) {
    throw { statusCode: 409, message: 'Un compte existe déjà avec cet email' };
  }

  const user = await User.create(donnees);
  const { accessToken, refreshToken } = genererTokens(user.id, user.role);

  await user.update({ refreshToken });

  logger.info(`Nouveau compte créé : ${email}`);
  return { user: user.toPublic(), accessToken, refreshToken };
};

// Connexion
const connecter = async (email, motDePasse) => {
  const user = await User.findOne({ where: { email, isActive: true } });

  if (!user) {
    throw { statusCode: 401, message: 'Email ou mot de passe incorrect' };
  }

  const motDePasseValide = await user.verifierMotDePasse(motDePasse);
  if (!motDePasseValide) {
    throw { statusCode: 401, message: 'Email ou mot de passe incorrect' };
  }

  const { accessToken, refreshToken } = genererTokens(user.id, user.role);
  await user.update({ refreshToken });

  logger.info(`Connexion réussie : ${email}`);
  return { user: user.toPublic(), accessToken, refreshToken };
};

// Rafraîchissement du token
const rafraichirToken = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, env.jwt.refreshSecret);
  } catch {
    throw { statusCode: 401, message: 'Refresh token invalide ou expiré' };
  }

  const user = await User.findOne({ where: { id: payload.id, refreshToken: token } });
  if (!user) {
    throw { statusCode: 401, message: 'Session invalide' };
  }

  const { accessToken, refreshToken } = genererTokens(user.id, user.role);
  await user.update({ refreshToken });

  return { accessToken, refreshToken };
};

// Déconnexion
const deconnecter = async (userId) => {
  await User.update({ refreshToken: null }, { where: { id: userId } });
  logger.info(`Déconnexion utilisateur : ${userId}`);
};

module.exports = { inscrire, connecter, rafraichirToken, deconnecter };