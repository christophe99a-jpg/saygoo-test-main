// src/modules/notifications/controllers/notification.controller.js
const notificationService = require('../services/notification.service');
const response = require('../../../utils/response');
const logger = require('../../../utils/logger');

const listerNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.listerNotifications(
      req.user.id, req.query
    );
    return response.success(res, notifications);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

const nombreNonLues = async (req, res) => {
  try {
    const count = await notificationService.nombreNonLues(req.user.id);
    return response.success(res, count);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

const marquerCommeLue = async (req, res) => {
  try {
    const notification = await notificationService.marquerCommeLue(
      req.params.id, req.user.id
    );
    return response.success(res, notification, 'Notification marquée comme lue');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

const marquerToutesCommeLues = async (req, res) => {
  try {
    const resultat = await notificationService.marquerToutesCommeLues(req.user.id);
    return response.success(res, resultat);
  } catch (err) {
    return response.error(res, err.message, 500);
  }
};

// Admin : envoyer une notification personnalisée
const envoyerPersonnalisee = async (req, res) => {
  try {
    const { userId, titre, message, canal } = req.body;
    if (!userId || !message) {
      return response.badRequest(res, 'userId et message requis');
    }
    const notification = await notificationService.envoyerPersonnalisee(
      userId, titre, message, canal || 'WHATSAPP'
    );
    return response.created(res, notification, 'Notification envoyée');
  } catch (err) {
    logger.error('Erreur envoi notification personnalisée :', err);
    return response.error(res, err.message, err.statusCode || 500);
  }
};

// Test d'envoi (dev uniquement)
const testerNotification = async (req, res) => {
  try {
    const { typeEvenement, canal } = req.body;
    const notification = await notificationService.envoyer(
      req.user.id,
      typeEvenement || 'INSCRIPTION',
      { nom: req.user.nomRepresentant, reference: 'TEST-001' },
      { canal: canal || req.user.canalCommunication }
    );
    return response.success(res, notification, 'Notification test envoyée');
  } catch (err) {
    return response.error(res, err.message, err.statusCode || 500);
  }
};

module.exports = {
  listerNotifications,
  nombreNonLues,
  marquerCommeLue,
  marquerToutesCommeLues,
  envoyerPersonnalisee,
  testerNotification,
};