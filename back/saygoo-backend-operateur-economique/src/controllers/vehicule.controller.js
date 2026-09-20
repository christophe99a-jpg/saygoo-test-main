const vehiculeClient = require('../services/vehiculeClient');
const logger = require('../utils/logger');

const getToken = (req) => req.headers.authorization?.split(' ')[1];

const listerCatalogue = async (req, res) => {
  try {
    const result = await vehiculeClient.listerCatalogue(req.query.search, getToken(req));
    return res.json(result);
  } catch (err) {
    logger.error('Erreur liste catalogue véhicules (OE)', { err: err.message });
    return res.status(err.response?.status || 500).json({ success: false, message: 'Service véhicules indisponible.' });
  }
};

const getFicheVehicule = async (req, res) => {
  try {
    const result = await vehiculeClient.getFicheVehicule(req.params.id, getToken(req));
    return res.json(result);
  } catch (err) {
    logger.error('Erreur fiche véhicule (OE)', { err: err.message });
    return res.status(err.response?.status || 500).json({ success: false, message: 'Service véhicules indisponible.' });
  }
};

const reserverVehicule = async (req, res) => {
  try {
    const result = await vehiculeClient.reserverVehicule(req.params.id, getToken(req));
    return res.json(result);
  } catch (err) {
    logger.error('Erreur réservation véhicule (OE)', { err: err.message });
    return res.status(err.response?.status || 500).json({ success: false, message: 'Service véhicules indisponible.' });
  }
};

// ── ACHAT DU VÉHICULE (ultra simplifié) ─────────────────────────────────────────
const acheterVehicule = async (req, res) => {
  try {
    const { typeAchat, entreprise, telephone, assuranceDuree, destinationPays, destinationVille } = req.body;

    const payload = { typeAchat, entreprise, telephone, assuranceDuree, destinationPays, destinationVille };
    const result = await vehiculeClient.acheterVehicule(req.params.id, payload, getToken(req));

    return res.status(201).json(result);
  } catch (err) {
    logger.error('Erreur achat véhicule (OE)', { err: err.message });
    return res
      .status(err.response?.status || 500)
      .json({ success: false, message: err.response?.data?.message || 'Service véhicules indisponible.' });
  }
};

const listerMesAchats = async (req, res) => {
  try {
    const result = await vehiculeClient.listerMesAchats(getToken(req));
    return res.json(result);
  } catch (err) {
    logger.error('Erreur mes achats véhicules (OE)', { err: err.message });
    return res.status(err.response?.status || 500).json({ success: false, message: 'Service véhicules indisponible.' });
  }
};

const getSuiviAchat = async (req, res) => {
  try {
    const result = await vehiculeClient.getSuiviAchat(req.params.id, getToken(req));
    return res.json(result);
  } catch (err) {
    logger.error('Erreur suivi achat véhicule (OE)', { err: err.message });
    return res.status(err.response?.status || 500).json({ success: false, message: 'Service véhicules indisponible.' });
  }
};

module.exports = {
  listerCatalogue,
  getFicheVehicule,
  reserverVehicule,
  acheterVehicule,
  listerMesAchats,
  getSuiviAchat,
};