const tarification = require('../utils/tarification');
const logger = require('../utils/logger');

// ── GRILLE TARIFAIRE COMPLÈTE (référence affichable) ────────────────────────────
const getBareme = (req, res) => {
  try {
    const destinations = Object.entries(tarification.BAREME).map(([code, zone]) => ({
      code,
      libelle: zone.libelle,
      zone: zone.zone,
      distanceKm: zone.distanceMax,
      tempsEstime: zone.tempsEstime,
      tarifs: zone.tarifs,
    }));

    return res.json({
      success: true,
      data: {
        destinations,
        coefficientsCargaison: tarification.COEFFICIENTS_CARGAISON,
        paliers: tarification.PALIERS,
        servicesParPalier: tarification.DESCRIPTIONS_PALIERS,
      },
    });
  } catch (err) {
    logger.error('Erreur récupération barème', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DEVIS : un palier précis ─────────────────────────────────────────────────────
const calculer = (req, res) => {
  try {
    const { destination, palier, typeCargaison, quantite } = req.body;

    if (!destination || !palier || !typeCargaison) {
      return res.status(400).json({
        success: false,
        message: 'La destination, le palier et le type de cargaison sont obligatoires.',
      });
    }

    const resultat = tarification.calculerHonoraires(destination, palier, typeCargaison);
    const nb = quantite ? parseInt(quantite) : 1;

    return res.json({
      success: true,
      data: {
        ...resultat,
        quantite: nb,
        montantTotal: resultat.montant * nb,
      },
    });
  } catch (err) {
    logger.error('Erreur calcul tarification', { err: err.message });
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ── COMPARATIF Standard / Plus / Green ──────────────────────────────────────────
const comparer = (req, res) => {
  try {
    const { destination, typeCargaison, quantite } = req.body;

    if (!destination || !typeCargaison) {
      return res.status(400).json({
        success: false,
        message: 'La destination et le type de cargaison sont obligatoires.',
      });
    }

    const nb = quantite ? parseInt(quantite) : 1;
    const offres = tarification.comparerPaliers(destination, typeCargaison).map((o) => ({
      ...o,
      quantite: nb,
      montantTotal: o.montant * nb,
    }));

    return res.json({ success: true, data: { offres } });
  } catch (err) {
    logger.error('Erreur comparatif tarification', { err: err.message });
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ── COÛT DE REVIENT DÉTAILLÉ (formule CT) ───────────────────────────────────────
const calculerCoutRevient = (req, res) => {
  try {
    const resultat = tarification.calculerCoutTotal(req.body);
    return res.json({ success: true, data: resultat });
  } catch (err) {
    logger.error('Erreur calcul coût de revient', { err: err.message });
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ── EMPREINTE CARBONE (palier Green) ────────────────────────────────────────────
const calculerCO2 = (req, res) => {
  try {
    const { distanceKm, consommationLitreParKm } = req.body;
    const resultat = tarification.calculerEmissionsCO2(distanceKm, consommationLitreParKm);
    return res.json({ success: true, data: resultat });
  } catch (err) {
    logger.error('Erreur calcul CO2', { err: err.message });
    return res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { getBareme, calculer, comparer, calculerCoutRevient, calculerCO2 };
