const prisma = require('../config/prisma');
const { prochainNumero, maxExistant } = require('../utils/sequence');
const logger = require('../utils/logger');

// ── HELPER : générer une référence de lot ───────────────────────────────────────
const generateLot = async () => {
  // Le lot n'a pas de prefixe annuel : une seule sequence pour tout le parc.
  const numero = await prochainNumero(
    'seq_lot_vehicule',
    () => maxExistant(prisma.vehicule, 'V', 'lot')
  );
  return `V${String(numero).padStart(3, '0')}`;
};

// ── AJOUT D'UN VÉHICULE AU PARC (CDA) ───────────────────────────────────────────
const ajouterVehicule = async (req, res) => {
  try {
    const { marque, modele, couleur, annee, kilometrage, energie, prix, documentsDisponibles } = req.body;

    if (!marque || !modele || !annee || !prix) {
      return res.status(400).json({ success: false, message: 'Marque, modèle, année et prix sont obligatoires.' });
    }

    const lot = await generateLot();

    const vehicule = await prisma.vehicule.create({
      data: {
        lot,
        marque,
        modele,
        couleur,
        annee: parseInt(annee),
        kilometrage: kilometrage ? parseInt(kilometrage) : null,
        energie,
        prix: parseFloat(prix),
        documentsDisponibles: documentsDisponibles || [],
        statut: 'DISPONIBLE',
      },
    });

    logger.info('Véhicule ajouté au parc', { lot });

    return res.status(201).json({ success: true, message: `Véhicule ${lot} ajouté au parc.`, data: { vehicule } });
  } catch (err) {
    logger.error('Erreur ajout véhicule', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── LISTE DU PARC (recherche par VIN/marque/lot) ────────────────────────────────
const listerCatalogue = async (req, res) => {
  try {
    const { search, statut } = req.query;

    const where = {};
    if (statut) where.statut = statut;
    if (search) {
      where.OR = [
        { lot: { contains: search, mode: 'insensitive' } },
        { marque: { contains: search, mode: 'insensitive' } },
        { modele: { contains: search, mode: 'insensitive' } },
      ];
    }

    const vehicules = await prisma.vehicule.findMany({ where, orderBy: { createdAt: 'desc' } });

    return res.json({ success: true, data: { vehicules } });
  } catch (err) {
    logger.error('Erreur liste catalogue véhicules', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── FICHE VÉHICULE ───────────────────────────────────────────────────────────────
const getFicheVehicule = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicule = await prisma.vehicule.findUnique({ where: { id } });

    if (!vehicule) {
      return res.status(404).json({ success: false, message: 'Véhicule non trouvé.' });
    }

    return res.json({ success: true, data: { vehicule } });
  } catch (err) {
    logger.error('Erreur fiche véhicule', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── RÉSERVER UN VÉHICULE (bloque le statut le temps de la décision) ────────────
const reserverVehicule = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicule = await prisma.vehicule.findUnique({ where: { id } });

    if (!vehicule) {
      return res.status(404).json({ success: false, message: 'Véhicule non trouvé.' });
    }
    if (vehicule.statut !== 'DISPONIBLE') {
      return res.status(400).json({ success: false, message: 'Ce véhicule n\'est plus disponible.' });
    }

    const updated = await prisma.vehicule.update({ where: { id }, data: { statut: 'RESERVE' } });

    return res.json({ success: true, message: 'Véhicule réservé.', data: { vehicule: updated } });
  } catch (err) {
    logger.error('Erreur réservation véhicule', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

module.exports = { ajouterVehicule, listerCatalogue, getFicheVehicule, reserverVehicule };