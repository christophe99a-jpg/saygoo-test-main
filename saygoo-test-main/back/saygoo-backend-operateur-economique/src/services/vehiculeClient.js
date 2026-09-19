const axios = require('axios');
const logger = require('../utils/logger');

const DOSSIER_SERVICE_URL = process.env.CDA_DOSSIER_SERVICE_URL || 'http://localhost:3007';

const client = axios.create({ baseURL: DOSSIER_SERVICE_URL, timeout: 10000 });

const withAuth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

const listerCatalogue = async (search, token) => {
  const { data } = await client.get('/vehicules', { params: { search }, ...withAuth(token) });
  return data;
};

const getFicheVehicule = async (id, token) => {
  const { data } = await client.get(`/vehicules/${id}`, withAuth(token));
  return data;
};

const reserverVehicule = async (id, token) => {
  const { data } = await client.patch(`/vehicules/${id}/reserver`, {}, withAuth(token));
  return data;
};

const acheterVehicule = async (vehiculeId, payload, token) => {
  const { data } = await client.post(`/vehicules/${vehiculeId}/acheter`, payload, withAuth(token));
  return data;
};

const listerMesAchats = async (token) => {
  const { data } = await client.get('/vehicules/mes-achats', withAuth(token));
  return data;
};

const getSuiviAchat = async (id, token) => {
  const { data } = await client.get(`/vehicules/achats/${id}/suivi`, withAuth(token));
  return data;
};

module.exports = {
  listerCatalogue,
  getFicheVehicule,
  reserverVehicule,
  acheterVehicule,
  listerMesAchats,
  getSuiviAchat,
};