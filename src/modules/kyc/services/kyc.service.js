// src/modules/kyc/services/kyc.service.js
const User = require('../../../database/models/User');
const logger = require('../../../utils/logger');
const path = require('path');
const fs = require('fs');

// Calcul du score de risque (logique simplifiée, extensible avec IA)
const calculerScoreRisque = (user) => {
  let score = 50; // score de base

  if (user.numeroRCCM) score += 10;
  if (user.numeroIFU) score += 10;
  if (user.urlCarteOE) score += 10;
  if (user.urlPieceIdentite) score += 10;
  if (user.urlCarteCFE) score += 10;

  // Volume d'affaires faible = risque plus élevé
  if (user.volumeMensuelFCFA === 'MOINS_1M') score -= 5;
  if (user.volumeMensuelFCFA === 'PLUS_20M') score += 5;

  return Math.min(Math.max(score, 0), 100);
};

// Upload et enregistrement des documents
const uploaderDocuments = async (userId, fichiers) => {
  const user = await User.findByPk(userId);
  if (!user) throw { statusCode: 404, message: 'Utilisateur introuvable' };

  const miseAJour = {};

  if (fichiers.carteCFE?.[0]) {
    miseAJour.urlCarteCFE = fichiers.carteCFE[0].path;
  }
  if (fichiers.pieceIdentite?.[0]) {
    miseAJour.urlPieceIdentite = fichiers.pieceIdentite[0].path;
  }
  if (fichiers.carteOE?.[0]) {
    miseAJour.urlCarteOE = fichiers.carteOE[0].path;
  }

  miseAJour.statutKYC = 'EN_COURS';
  await user.update(miseAJour);

  // Calcul automatique du score
  const userMisAJour = await User.findByPk(userId);
  const score = calculerScoreRisque(userMisAJour);
  await userMisAJour.update({ scoreRisque: score });

  logger.info(`Documents KYC uploadés pour l'utilisateur ${userId} — Score : ${score}`);
  return { message: 'Documents reçus. En cours de vérification.', scoreRisque: score };
};

// Validation par un admin
const validerKYC = async (userId, valide, motifRejet = null) => {
  const user = await User.findByPk(userId);
  if (!user) throw { statusCode: 404, message: 'Utilisateur introuvable' };

  const miseAJour = {
    statutKYC: valide ? 'VALIDE' : 'REJETE',
    dateValidationKYC: new Date(),
    motifRejetKYC: valide ? null : motifRejet,
  };

  await user.update(miseAJour);
  logger.info(`KYC ${valide ? 'validé' : 'rejeté'} pour l'utilisateur ${userId}`);

  return { message: valide ? 'KYC validé avec succès' : `KYC rejeté : ${motifRejet}` };
};

// Statut KYC d'un utilisateur
const obtenirStatutKYC = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: [
      'id', 'statutKYC', 'scoreRisque',
      'urlCarteCFE', 'urlPieceIdentite', 'urlCarteOE',
      'dateValidationKYC', 'motifRejetKYC'
    ],
  });
  if (!user) throw { statusCode: 404, message: 'Utilisateur introuvable' };
  return user;
};

// Liste des KYC en attente (admin)
const listerKYCEnAttente = async () => {
  return User.findAll({
    where: { statutKYC: 'EN_COURS' },
    attributes: [
      'id', 'raisonSociale', 'email', 'telephone',
      'statutKYC', 'scoreRisque', 'createdAt',
      'urlCarteCFE', 'urlPieceIdentite', 'urlCarteOE'
    ],
    order: [['createdAt', 'ASC']],
  });
};

module.exports = { uploaderDocuments, validerKYC, obtenirStatutKYC, listerKYCEnAttente };