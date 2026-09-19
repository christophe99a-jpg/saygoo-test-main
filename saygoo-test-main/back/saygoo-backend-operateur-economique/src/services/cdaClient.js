const axios = require('axios');
const logger = require('../utils/logger');

// URL du dossier-service CDA (inter-services, sur le réseau interne)
const DOSSIER_SERVICE_URL = process.env.CDA_DOSSIER_SERVICE_URL || 'http://localhost:3007';

const client = axios.create({
  baseURL: DOSSIER_SERVICE_URL,
  timeout: 10000,
});

// Relaie le token JWT de l'opérateur économique vers le service CDA
const withAuth = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

const creerDossier = async (payload, token) => {
  try {
    const { data } = await client.post('/dossiers', payload, withAuth(token));
    return data;
  } catch (err) {
    logger.error('Erreur appel dossier-service (create)', { err: err.message });
    throw {
      status: err.response?.status || 502,
      message: err.response?.data?.message || 'Le service CDA est momentanément indisponible.',
    };
  }
};

const listerDossiers = async (clientId, params, token) => {
  try {
    const { data } = await client.get('/dossiers', {
      params: { ...params, clientId },
      ...withAuth(token),
    });
    return data;
  } catch (err) {
    logger.error('Erreur appel dossier-service (list)', { err: err.message });
    throw {
      status: err.response?.status || 502,
      message: err.response?.data?.message || 'Le service CDA est momentanément indisponible.',
    };
  }
};

const getDossier = async (id, token) => {
  try {
    const { data } = await client.get(`/dossiers/${id}`, withAuth(token));
    return data;
  } catch (err) {
    logger.error('Erreur appel dossier-service (detail)', { err: err.message });
    throw {
      status: err.response?.status || 502,
      message: err.response?.data?.message || 'Le service CDA est momentanément indisponible.',
    };
  }
};

const ajouterDocument = async (dossierId, document, token) => {
  try {
    const { data } = await client.post(`/documents`, { dossierId, ...document }, withAuth(token));
    return data;
  } catch (err) {
    logger.error('Erreur appel dossier-service (document)', { err: err.message });
    throw {
      status: err.response?.status || 502,
      message: err.response?.data?.message || 'Le service CDA est momentanément indisponible.',
    };
  }
};

module.exports = { creerDossier, listerDossiers, getDossier, ajouterDocument };