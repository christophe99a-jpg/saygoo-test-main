const axios = require('axios');
const logger = require('../utils/logger');

// URL du backend Entrepôt (inter-services, sur le réseau interne)
const ENTREPOT_SERVICE_URL = process.env.ENTREPOT_SERVICE_URL || 'http://localhost:3008';

const client = axios.create({
  baseURL: ENTREPOT_SERVICE_URL,
  timeout: 10000,
});

const withAuth = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

const getEntrepotsDisponibles = async () => {
  try {
    const { data } = await client.get('/warehouses/availability');
    return data;
  } catch (err) {
    logger.error('Erreur appel entrepot-service (availability)', { err: err.message });
    throw {
      status: err.response?.status || 502,
      message: err.response?.data?.message || 'Le service Entrepôt est momentanément indisponible.',
    };
  }
};

const creerDemandeStockage = async (payload, token) => {
  try {
    const { data } = await client.post('/stockage', payload, withAuth(token));
    return data;
  } catch (err) {
    logger.error('Erreur appel entrepot-service (create)', { err: err.message });
    throw {
      status: err.response?.status || 502,
      message: err.response?.data?.message || 'Le service Entrepôt est momentanément indisponible.',
    };
  }
};

const listerDemandesStockage = async (clientId, params, token) => {
  try {
    const { data } = await client.get('/stockage', {
      params: { ...params, clientId },
      ...withAuth(token),
    });
    return data;
  } catch (err) {
    logger.error('Erreur appel entrepot-service (list)', { err: err.message });
    throw {
      status: err.response?.status || 502,
      message: err.response?.data?.message || 'Le service Entrepôt est momentanément indisponible.',
    };
  }
};

const getDemandeStockage = async (id, token) => {
  try {
    const { data } = await client.get(`/stockage/${id}`, withAuth(token));
    return data;
  } catch (err) {
    logger.error('Erreur appel entrepot-service (detail)', { err: err.message });
    throw {
      status: err.response?.status || 502,
      message: err.response?.data?.message || 'Le service Entrepôt est momentanément indisponible.',
    };
  }
};

module.exports = { getEntrepotsDisponibles, creerDemandeStockage, listerDemandesStockage, getDemandeStockage };