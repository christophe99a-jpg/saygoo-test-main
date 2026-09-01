// src/modules/notifications/services/email.service.js
const logger = require('../../../utils/logger');

const envoyerEmail = async ({ email, titre, message, html = null }) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[EMAIL SIMULATION] → ${email} | Sujet: ${titre}`);
      logger.info(`[EMAIL SIMULATION] Contenu: ${message}`);
      return { success: true, messageId: `EMAIL-${Date.now()}`, statut: 'ENVOYE' };
    }

    // Intégration SendGrid / Mailgun en production
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({ to: email, from: 'noreply@saygoo.tg', subject: titre, text: message, html });

    return { success: true, statut: 'ENVOYE' };
  } catch (error) {
    logger.error(`Erreur Email vers ${email} :`, error.message);
    return { success: false, statut: 'ECHEC', erreur: error.message };
  }
};

module.exports = { envoyerEmail };