// src/integrations/mobilemoney/paygate.js
const axios = require('axios');
const logger = require('../../utils/logger');

const PAYGATE_BASE_URL = process.env.PAYGATE_BASE_URL || 'https://api.paygate.tg/v1';
const PAYGATE_API_KEY = process.env.PAYGATE_API_KEY || 'test_key';

// Initier un paiement Mobile Money
const initierPaiement = async ({ montant, telephone, operateur, reference, description }) => {
  try {
    // En mode test, on simule la réponse
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[PAYGATE SIMULATION] Paiement initié : ${montant} FCFA → ${telephone}`);
      return {
        success: true,
        transactionId: `TXN-${Date.now()}`,
        statut: 'EN_COURS',
        message: 'Paiement initié avec succès (mode test)',
      };
    }

    const response = await axios.post(`${PAYGATE_BASE_URL}/payments/initiate`, {
      amount: montant,
      phone: telephone,
      operator: operateur,
      reference,
      description,
      currency: 'XOF',
    }, {
      headers: {
        'Authorization': `Bearer ${PAYGATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    logger.error('Erreur PayGate initiation :', error.message);
    throw { statusCode: 502, message: 'Erreur communication opérateur de paiement' };
  }
};

// Vérifier le statut d'un paiement
const verifierStatut = async (transactionId) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[PAYGATE SIMULATION] Vérification statut : ${transactionId}`);
      return {
        success: true,
        transactionId,
        statut: 'PAYE',
        message: 'Paiement confirmé (mode test)',
      };
    }

    const response = await axios.get(`${PAYGATE_BASE_URL}/payments/${transactionId}`, {
      headers: { 'Authorization': `Bearer ${PAYGATE_API_KEY}` },
    });

    return response.data;
  } catch (error) {
    logger.error('Erreur PayGate vérification :', error.message);
    throw { statusCode: 502, message: 'Erreur vérification statut paiement' };
  }
};

// Remboursement
const rembourser = async (transactionId, montant) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[PAYGATE SIMULATION] Remboursement : ${montant} FCFA pour ${transactionId}`);
      return { success: true, message: 'Remboursement effectué (mode test)' };
    }

    const response = await axios.post(`${PAYGATE_BASE_URL}/payments/${transactionId}/refund`, {
      amount: montant,
    }, {
      headers: { 'Authorization': `Bearer ${PAYGATE_API_KEY}` },
    });

    return response.data;
  } catch (error) {
    logger.error('Erreur PayGate remboursement :', error.message);
    throw { statusCode: 502, message: 'Erreur remboursement' };
  }
};

module.exports = { initierPaiement, verifierStatut, rembourser };