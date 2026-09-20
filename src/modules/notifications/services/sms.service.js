// src/modules/notifications/services/sms.service.js
const axios = require('axios');
const logger = require('../../../utils/logger');

const SMS_API_URL = process.env.SMS_API_URL || 'https://api.smstogo.tg/v1';
const SMS_API_KEY = process.env.SMS_API_KEY || 'test_key';
const SMS_SENDER = process.env.SMS_SENDER || 'SAYGOO';

const envoyerSMS = async ({ telephone, message }) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[SMS SIMULATION] → ${telephone} : ${message}`);
      return { success: true, messageId: `SMS-${Date.now()}`, statut: 'ENVOYE' };
    }

    const response = await axios.post(`${SMS_API_URL}/send`, {
      to: telephone,
      message,
      sender: SMS_SENDER,
    }, {
      headers: {
        'Authorization': `Bearer ${SMS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    return { success: true, messageId: response.data.id, statut: 'ENVOYE' };
  } catch (error) {
    logger.error(`Erreur SMS vers ${telephone} :`, error.message);
    return { success: false, statut: 'ECHEC', erreur: error.message };
  }
};

module.exports = { envoyerSMS };