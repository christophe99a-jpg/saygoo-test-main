const logger = require('../utils/logger');

// Les vrais fournisseurs (SMTP, passerelle SMS, FCM...) ne sont pas encore
// configurés. Tant que les variables d'environnement correspondantes sont
// absentes, le service fonctionne en mode simulation : la notification est
// enregistrée en base et journalisée, mais rien n'est réellement expédié.
const MODE_SIMULATION = process.env.NOTIFICATIONS_SIMULATION !== 'false';

const envoyerEmail = async (notification) => {
  if (MODE_SIMULATION) {
    logger.info('[SIMULATION] Email', {
      destinataire: notification.destinataire,
      sujet: notification.sujet,
    });
    return { simule: true };
  }
  // TODO : brancher ici le fournisseur SMTP (nodemailer, SendGrid, ...)
  throw new Error('Fournisseur email non configuré.');
};

const envoyerSms = async (notification) => {
  if (MODE_SIMULATION) {
    logger.info('[SIMULATION] SMS', { destinataire: notification.destinataire });
    return { simule: true };
  }
  // TODO : brancher ici la passerelle SMS (Togocom, Moov, Twilio, ...)
  throw new Error('Passerelle SMS non configurée.');
};

const envoyerPush = async (notification) => {
  if (MODE_SIMULATION) {
    logger.info('[SIMULATION] Push', { destinataire: notification.destinataire });
    return { simule: true };
  }
  // TODO : brancher ici Firebase Cloud Messaging
  throw new Error('Service push non configuré.');
};

// IN_APP : rien à expédier, la notification est simplement stockée et lue
// par le destinataire via GET /notifications.
const envoyerInApp = async () => ({ inApp: true });

const dispatch = async (notification) => {
  switch (notification.type) {
    case 'EMAIL':
      return envoyerEmail(notification);
    case 'SMS':
      return envoyerSms(notification);
    case 'PUSH':
      return envoyerPush(notification);
    case 'IN_APP':
      return envoyerInApp();
    default:
      throw new Error(`Type de notification inconnu : ${notification.type}`);
  }
};

module.exports = { dispatch, MODE_SIMULATION };
