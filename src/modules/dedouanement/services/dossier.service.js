// src/modules/dedouanement/services/dossier.service.js
const Dossier = require('../../../database/models/Dossier');
const User = require('../../../database/models/User');
const logger = require('../../../utils/logger');
const { Op } = require('sequelize');

// Créer un dossier (brouillon)
const creer = async (userId, donnees) => {
  const dossier = await Dossier.create({ ...donnees, userId, statut: 'BROUILLON' });
  logger.info(`Dossier créé : ${dossier.reference} par utilisateur ${userId}`);
  return dossier;
};

// Soumettre un dossier
const soumettre = async (dossierId, userId) => {
  const dossier = await Dossier.findOne({ where: { id: dossierId, userId } });
  if (!dossier) throw { statusCode: 404, message: 'Dossier introuvable' };

  if (!['BROUILLON', 'REJETE'].includes(dossier.statut)) {
    throw { statusCode: 400, message: 'Ce dossier ne peut pas être soumis dans son état actuel' };
  }

  // Vérification documents obligatoires
  if (!dossier.urlFacture || !dossier.urlBL || !dossier.urlPackingList) {
    throw {
      statusCode: 400,
      message: 'Documents obligatoires manquants (Facture, BL, Packing List)',
    };
  }

  await dossier.update({ statut: 'SOUMIS', dateSoumission: new Date() });
  logger.info(`Dossier soumis : ${dossier.reference}`);
  return dossier;
};

// Uploader les documents d'un dossier
const uploaderDocuments = async (dossierId, userId, fichiers) => {
  const dossier = await Dossier.findOne({ where: { id: dossierId, userId } });
  if (!dossier) throw { statusCode: 404, message: 'Dossier introuvable' };

  const miseAJour = {};
  if (fichiers.facture?.[0])          miseAJour.urlFacture = fichiers.facture[0].path;
  if (fichiers.bl?.[0])               miseAJour.urlBL = fichiers.bl[0].path;
  if (fichiers.packingList?.[0])      miseAJour.urlPackingList = fichiers.packingList[0].path;
  if (fichiers.certificatOrigine?.[0]) miseAJour.urlCertificatOrigine = fichiers.certificatOrigine[0].path;
  if (fichiers.assurance?.[0])        miseAJour.urlAssurance = fichiers.assurance[0].path;
  if (fichiers.autorisation?.[0])     miseAJour.urlAutorisation = fichiers.autorisation[0].path;

  await dossier.update(miseAJour);
  logger.info(`Documents uploadés pour dossier : ${dossier.reference}`);
  return dossier;
};

// Obtenir un dossier par ID
const obtenirParId = async (dossierId, userId, role) => {
  const where = { id: dossierId };
  if (role === 'OPERATEUR') where.userId = userId;

  const dossier = await Dossier.findOne({
    where,
    include: [{ model: User, as: 'operateur', attributes: ['id', 'raisonSociale', 'email'] }],
  });

  if (!dossier) throw { statusCode: 404, message: 'Dossier introuvable' };
  return dossier;
};

// Lister les dossiers d'un opérateur
const lister = async (userId, role, filtres = {}) => {
  const where = {};
  if (role === 'OPERATEUR') where.userId = userId;
  if (filtres.statut) where.statut = filtres.statut;
  if (filtres.typeOperation) where.typeOperation = filtres.typeOperation;

  return Dossier.findAll({
    where,
    include: [{ model: User, as: 'operateur', attributes: ['id', 'raisonSociale'] }],
    order: [['createdAt', 'DESC']],
  });
};

// Valider ou rejeter (Admin/CDA)
const validerOuRejeter = async (dossierId, action, motifRejet = null, adminId) => {
  const dossier = await Dossier.findByPk(dossierId);
  if (!dossier) throw { statusCode: 404, message: 'Dossier introuvable' };

  const transitions = {
    SOUMIS: { valider: 'VALIDATION_ADMIN', rejeter: 'REJETE' },
    VALIDATION_ADMIN: { valider: 'VALIDATION_TECHNIQUE', rejeter: 'REJETE' },
    VALIDATION_TECHNIQUE: { valider: 'VALIDATION_FINANCIERE', rejeter: 'REJETE' },
    VALIDATION_FINANCIERE: { valider: 'VALIDATION_LOGISTIQUE', rejeter: 'REJETE' },
    VALIDATION_LOGISTIQUE: { valider: 'VALIDE', rejeter: 'REJETE' },
  };

  const transition = transitions[dossier.statut];
  if (!transition) {
    throw { statusCode: 400, message: `Impossible d'agir sur un dossier en statut : ${dossier.statut}` };
  }

  const nouveauStatut = action === 'valider' ? transition.valider : transition.rejeter;
  await dossier.update({
    statut: nouveauStatut,
    motifRejet: action === 'rejeter' ? motifRejet : null,
    dateValidation: new Date(),
  });

  logger.info(`Dossier ${dossier.reference} → ${nouveauStatut} par admin ${adminId}`);
  return dossier;
};

// Dupliquer un dossier
const dupliquer = async (dossierId, userId) => {
  const original = await Dossier.findOne({ where: { id: dossierId, userId } });
  if (!original) throw { statusCode: 404, message: 'Dossier introuvable' };

  const { id, reference, statut, dateSoumission, dateValidation,
          createdAt, updatedAt, deletedAt, ...donnees } = original.toJSON();

  const copie = await Dossier.create({ ...donnees, userId, statut: 'BROUILLON' });
  logger.info(`Dossier dupliqué : ${original.reference} → ${copie.reference}`);
  return copie;
};

module.exports = { creer, soumettre, uploaderDocuments, obtenirParId, lister, validerOuRejeter, dupliquer };