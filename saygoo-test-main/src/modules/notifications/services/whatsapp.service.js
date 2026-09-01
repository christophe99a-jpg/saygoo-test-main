// src/modules/notifications/services/whatsapp.service.js
const axios = require('axios');
const logger = require('../../../utils/logger');

const WA_API_URL = process.env.WHATSAPP_API_URL || 'https://api.whatsapp.saygoo.tg/v1';
const WA_API_KEY = process.env.WHATSAPP_API_KEY || 'test_key';

const envoyerWhatsApp = async ({ telephone, message, titre = null }) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[WHATSAPP SIMULATION] → ${telephone} : ${message}`);
      return { success: true, messageId: `WA-${Date.now()}`, statut: 'ENVOYE' };
    }

    const payload = {
      to: `229${telephone}`, // préfixe pays Togo
      type: 'text',
      text: { body: titre ? `*${titre}*\n\n${message}` : message },
    };

    const response = await axios.post(`${WA_API_URL}/messages`, payload, {
      headers: {
        'Authorization': `Bearer ${WA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    return { success: true, messageId: response.data.messages[0].id, statut: 'ENVOYE' };
  } catch (error) {
    logger.error(`Erreur WhatsApp vers ${telephone} :`, error.message);
    return { success: false, statut: 'ECHEC', erreur: error.message };
  }
};

module.exports = { envoyerWhatsApp };