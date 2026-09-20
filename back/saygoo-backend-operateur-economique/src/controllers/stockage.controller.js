const entrepotClient = require('../services/entrepotClient');
const logger = require('../utils/logger');

// ── ENTREPÔTS DISPONIBLES (avec tarif + distance du port) ──────────────────────
const listerEntrepotsDisponibles = async (req, res) => {
  try {
    const result = await entrepotClient.getEntrepotsDisponibles();
    return res.json({ success: true, data: { entrepots: result } });
  } catch (err) {
    logger.error('Erreur liste entrepôts disponibles', { err: err.message });
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── SOUMETTRE UNE DEMANDE DE STOCKAGE ────────────────────────────────────────────
const creerDemande = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const {
      warehouseId,
      dossierRef,
      typeStockage,
      marchandise,
      quantite,
      uniteQuantite,
      dureeEstimeeJours,
      entreprise,
      telephone,
      observations,
    } = req.body;

    if (!warehouseId || !typeStockage || !marchandise) {
      return res.status(400).json({
        success: false,
        message: 'L\'entrepôt, le type de stockage et la marchandise sont obligatoires.',
      });
    }

    const payload = {
      warehouseId,
      dossierRef,
      clientId: req.user?.sub,
      clientNom: entreprise || req.user?.companyName || req.user?.firstName,
      contactTelephone: telephone,
      typeStockage,
      marchandise: observations ? `${marchandise} — ${observations}` : marchandise,
      quantite,
      uniteQuantite,
      dureeEstimeeJours,
    };

    const result = await entrepotClient.creerDemandeStockage(payload, token);

    logger.info('Demande de stockage transmise à l\'entrepôt', { reference: result.reference });

    return res.status(201).json({
      success: true,
      message: `Demande transmise. Référence : ${result.reference}. L'exploitant de l'entrepôt sera notifié.`,
      data: result,
    });
  } catch (err) {
    logger.error('Erreur soumission demande de stockage', { err: err.message });
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── TABLEAU DE BORD : mes demandes de stockage ─────────────────────────────────
const listerMesDemandes = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { search, statut } = req.query;

    const result = await entrepotClient.listerDemandesStockage(req.user?.sub, { search, statut }, token);

    return res.json({ success: true, data: { demandes: result } });
  } catch (err) {
    logger.error('Erreur liste demandes de stockage', { err: err.message });
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── SUIVI D'UNE DEMANDE ──────────────────────────────────────────────────────────
const getDemande = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const result = await entrepotClient.getDemandeStockage(req.params.id, token);

    if (result.clientId !== req.user?.sub) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette demande.' });
    }

    return res.json({ success: true, data: { demande: result } });
  } catch (err) {
    logger.error('Erreur détail demande de stockage', { err: err.message });
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

module.exports = { listerEntrepotsDisponibles, creerDemande, listerMesDemandes, getDemande };