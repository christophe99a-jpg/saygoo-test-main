// src/modules/notifications/services/notification.service.js
const Notification = require('../../../database/models/Notification');
const User = require('../../../database/models/User');
const { envoyerSMS } = require('./sms.service');
const { envoyerWhatsApp } = require('./whatsapp.service');
const { envoyerEmail } = require('./email.service');
const logger = require('../../../utils/logger');
const { Op } = require('sequelize');

// Templates de messages par événement
const TEMPLATES = {
  INSCRIPTION: (data) => ({
    titre: 'Bienvenue sur SAYGOO',
    message: `Bonjour ${data.nom}, votre compte SAYGOO a été créé. Complétez votre KYC pour accéder à tous les services.`,
  }),
  KYC_VALIDE: (data) => ({
    titre: 'KYC Validé - SAYGOO',
    message: `Félicitations ${data.nom} ! Votre vérification KYC a été approuvée. Vous pouvez maintenant créer vos dossiers de dédouanement.`,
  }),
  KYC_REJETE: (data) => ({
    titre: 'KYC Rejeté - SAYGOO',
    message: `Bonjour ${data.nom}, votre KYC a été rejeté. Motif : ${data.motif}. Veuillez soumettre à nouveau vos documents.`,
  }),
  DOSSIER_SOUMIS: (data) => ({
    titre: 'Dossier soumis - SAYGOO',
    message: `Votre dossier ${data.reference} a été soumis avec succès. Vous recevrez les offres CDA sous 24h.`,
  }),
  DOSSIER_VALIDE: (data) => ({
    titre: 'Dossier validé - SAYGOO',
    message: `Bonne nouvelle ! Votre dossier ${data.reference} a été validé. Le dédouanement est en cours.`,
  }),
  DOSSIER_REJETE: (data) => ({
    titre: 'Dossier rejeté - SAYGOO',
    message: `Votre dossier ${data.reference} a été rejeté. Motif : ${data.motif}. Contactez le support SAYGOO.`,
  }),
  COTATION_RECUE: (data) => ({
    titre: 'Nouvelle cotation - SAYGOO',
    message: `Vous avez reçu une nouvelle offre de ${data.cdaNom} pour le dossier ${data.reference}. Montant : ${data.montant} FCFA.`,
  }),
  COTATION_ACCEPTEE: (data) => ({
    titre: 'Cotation acceptée - SAYGOO',
    message: `La cotation de ${data.cdaNom} a été acceptée pour le dossier ${data.reference}. Procédez au paiement.`,
  }),
  PAIEMENT_CONFIRME: (data) => ({
    titre: 'Paiement confirmé - SAYGOO',
    message: `Votre paiement de ${data.montant} FCFA (réf: ${data.reference}) a été confirmé avec succès.`,
  }),
  PAIEMENT_ECHOUE: (data) => ({
    titre: 'Échec paiement - SAYGOO',
    message: `Votre paiement (réf: ${data.reference}) a échoué. Veuillez réessayer ou contacter le support.`,
  }),
  TRACKING_MISE_A_JOUR: (data) => ({
    titre: 'Mise à jour tracking - SAYGOO',
    message: `Dossier ${data.reference} : ${data.etape} - ${data.description}`,
  }),
  LIVRAISON_EFFECTUEE: (data) => ({
    titre: 'Livraison effectuée - SAYGOO',
    message: `Votre marchandise (dossier ${data.reference}) a été livrée avec succès. Merci de confirmer la réception.`,
  }),
  INCIDENT_SIGNALE: (data) => ({
    titre: 'Incident signalé - SAYGOO',
    message: `Un incident a été signalé sur votre dossier ${data.reference} : ${data.description}. Notre équipe intervient.`,
  }),
};

// Envoyer une notification
const envoyer = async (userId, typeEvenement, data, options = {}) => {
  const user = await User.findByPk(userId);
  if (!user) throw { statusCode: 404, message: 'Utilisateur introuvable' };

  const template = TEMPLATES[typeEvenement]
    ? TEMPLATES[typeEvenement](data)
    : { titre: data.titre || 'SAYGOO', message: data.message };

  const canal = options.canal || user.canalCommunication || 'WHATSAPP';
  const destinataire = canal === 'EMAIL' ? user.email : user.telephone;

  // Créer la notification en base
  const notification = await Notification.create({
    canal,
    typeEvenement,
    titre: template.titre,
    message: template.message,
    destinataire,
    statut: 'EN_ATTENTE',
    entiteType: options.entiteType || null,
    entiteId: options.entiteId || null,
    userId,
  });

  // Envoi selon le canal
  let reponse;
  try {
    if (canal === 'SMS') {
      reponse = await envoyerSMS({ telephone: destinataire, message: template.message });
    } else if (canal === 'WHATSAPP') {
      reponse = await envoyerWhatsApp({
        telephone: destinataire,
        message: template.message,
        titre: template.titre,
      });
    } else if (canal === 'EMAIL') {
      reponse = await envoyerEmail({
        email: destinataire,
        titre: template.titre,
        message: template.message,
      });
    }

    await notification.update({
      statut: reponse.success ? 'ENVOYE' : 'ECHEC',
      reponseOperateur: JSON.stringify(reponse),
      dateEnvoi: reponse.success ? new Date() : null,
      nombreTentatives: 1,
    });

  } catch (err) {
    await notification.update({ statut: 'ECHEC', nombreTentatives: 1 });
    logger.error(`Erreur envoi notification ${typeEvenement} :`, err.message);
  }

  return notification;
};

// Envoyer sur tous les canaux
const envoyerMultiCanal = async (userId, typeEvenement, data, options = {}) => {
  const canaux = options.canaux || ['SMS', 'WHATSAPP'];
  const resultats = [];

  for (const canal of canaux) {
    const resultat = await envoyer(userId, typeEvenement, data, { ...options, canal });
    resultats.push(resultat);
  }

  return resultats;
};

// Lister les notifications d'un utilisateur
const listerNotifications = async (userId, filtres = {}) => {
  const where = { userId };
  if (filtres.statut) where.statut = filtres.statut;
  if (filtres.typeEvenement) where.typeEvenement = filtres.typeEvenement;
  if (filtres.canal) where.canal = filtres.canal;

  return Notification.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: filtres.limit || 50,
  });
};

// Marquer comme lue
const marquerCommeLue = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    where: { id: notificationId, userId },
  });

  if (!notification) throw { statusCode: 404, message: 'Notification introuvable' };

  await notification.update({ statut: 'LU', dateLecture: new Date() });
  return notification;
};

// Marquer toutes comme lues
const marquerToutesCommeLues = async (userId) => {
  await Notification.update(
    { statut: 'LU', dateLecture: new Date() },
    { where: { userId, statut: { [Op.ne]: 'LU' } } }
  );
  return { message: 'Toutes les notifications marquées comme lues' };
};

// Nombre de notifications non lues
const nombreNonLues = async (userId) => {
  const count = await Notification.count({
    where: { userId, statut: { [Op.in]: ['EN_ATTENTE', 'ENVOYE'] } },
  });
  return { nonLues: count };
};

// Envoyer une notification personnalisée (admin)
const envoyerPersonnalisee = async (userId, titre, message, canal) => {
  return envoyer(userId, 'CUSTOM', { titre, message }, { canal });
};

module.exports = {
  envoyer,
  envoyerMultiCanal,
  listerNotifications,
  marquerCommeLue,
  marquerToutesCommeLues,
  nombreNonLues,
  envoyerPersonnalisee,
};