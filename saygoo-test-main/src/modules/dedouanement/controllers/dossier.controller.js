// src/modules/dedouanement/controllers/dossier.controller.js
const dossierService = require('../services/dossier.service');
const response = require('../../../utils/response');
const logger = require('../../../utils/logger');

const creer = async (req, res) => {
  try {
    const dossier = await dossierService.creer(req.user.id, req.body);
    return response.created(res, dossier, 'Dossier créé avec succès');
  } catch (err) {
    logger.error('Erreur création dossier :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const soumettre = async (req, res) => {
  try {
    const dossier = await dossierService.soumettre(req.params.id, req.user.id);
    return response.success(res, dossier, 'Dossier soumis avec succès');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const uploaderDocuments = async (req, res) => {
  try {
    const dossier = await dossierService.uploaderDocuments(req.params.id, req.user.id, req.files);
    return response.success(res, dossier, 'Documents uploadés avec succès');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const obtenirParId = async (req, res) => {
  try {
    const dossier = await dossierService.obtenirParId(req.params.id, req.user.id, req.user.role);
    return response.success(res, dossier);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const lister = async (req, res) => {
  try {
    const dossiers = await dossierService.lister(req.user.id, req.user.role, req.query);
    return response.success(res, dossiers);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

const validerOuRejeter = async (req, res) => {
  try {
    const { action, motifRejet } = req.body;
    if (!['valider', 'rejeter'].includes(action)) {
      return response.badRequest(res, 'Action invalide. Utilisez "valider" ou "rejeter"');
    }
    if (action === 'rejeter' && !motifRejet) {
      return response.badRequest(res, 'Motif de rejet obligatoire');
    }
    const dossier = await dossierService.validerOuRejeter(
      req.params.id, action, motifRejet, req.user.id
    );
    return response.success(res, dossier, `Dossier ${action === 'valider' ? 'validé' : 'rejeté'}`);
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const dupliquer = async (req, res) => {
  try {
    const copie = await dossierService.dupliquer(req.params.id, req.user.id);
    return response.created(res, copie, 'Dossier dupliqué avec succès');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

module.exports = { creer, soumettre, uploaderDocuments, obtenirParId, lister, validerOuRejeter, dupliquer };