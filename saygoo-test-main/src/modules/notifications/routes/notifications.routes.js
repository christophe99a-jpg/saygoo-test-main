// src/modules/notifications/routes/notifications.routes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authentifier, autoriser } = require('../../../middlewares/auth.middleware');

// Opérateur
router.get('/', authentifier, notificationController.listerNotifications);
router.get('/non-lues', authentifier, notificationController.nombreNonLues);
router.patch('/:id/lire', authentifier, notificationController.marquerCommeLue);
router.patch('/tout-lire', authentifier, notificationController.marquerToutesCommeLues);

// Dev/Test
router.post('/tester', authentifier, notificationController.testerNotification);

// Admin
router.post('/envoyer', authentifier, autoriser('ADMIN'), notificationController.envoyerPersonnalisee);

module.exports = router;