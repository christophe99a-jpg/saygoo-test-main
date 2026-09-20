const prisma = require('../config/prisma');
const { calculerCotationComplete } = require('../utils/calculs');
const { generateReference } = require('../utils/reference');
const logger = require('../utils/logger');

// ── CRÉER UNE COTATION ────────────────────────────────────────────────────────
const creerCotation = async (req, res) => {
  try {
    const {
      dossierId, clientId, clientNom,
      typeMarchandise, regimeDouanier, typeVehicule,
      devise, valeurFOB, valeurFret, valeurAssurance,
      tauxDouane, tauxTVA, tauxRS, tauxTSP,
      modeCDA, tauxCDA,
      nombreConteneurs, nombreVehicules,
      fraisConsignataire, fraisTransport,
      fraisStockage, fraisManutention, autresFrais,
      notes
    } = req.body;

    // Calcul automatique complet
    const calculs = calculerCotationComplete({
      valeurFOB, valeurFret, valeurAssurance,
      tauxDouane: tauxDouane || 0,
      tauxTVA: tauxTVA || 0.18,
      tauxRS: tauxRS || 0.01,
      tauxTSP: tauxTSP || 0.005,
      modeCDA: modeCDA || 'FORFAIT',
      tauxCDA,
      typeMarchandise,
      typeVehicule,
      nombreConteneurs: nombreConteneurs || 1,
      nombreVehicules: nombreVehicules || 1,
      fraisConsignataire: fraisConsignataire || 0,
      fraisTransport: fraisTransport || 0,
      fraisStockage: fraisStockage || 0,
      fraisManutention: fraisManutention || 0,
      autresFrais: autresFrais || 0
    });

    const reference = await generateReference();

    // Date expiration (30 jours)
    const dateExpiration = new Date();
    dateExpiration.setDate(dateExpiration.getDate() + 30);

    const cotation = await prisma.cotation.create({
      data: {
        reference,
        dossierId,
        clientId,
        clientNom,
        agentId: req.user.sub,
        agentNom: `${req.user.firstName} ${req.user.lastName}`,
        typeMarchandise,
        regimeDouanier: regimeDouanier || 'IM4',
        typeVehicule,
        devise: devise || 'XOF',
        valeurFOB: parseFloat(valeurFOB || 0),
        valeurFret: parseFloat(valeurFret || 0),
        valeurAssurance: parseFloat(valeurAssurance || 0),
        valeurCIF: calculs.valeurCIF,
        tauxDouane: calculs.tauxDouane,
        droitsDouane: calculs.droitsDouane,
        tauxTVA: calculs.tauxTVA,
        montantTVA: calculs.montantTVA,
        tauxRS: calculs.tauxRS,
        montantRS: calculs.montantRS,
        tauxTSP: calculs.tauxTSP,
        montantTSP: calculs.montantTSP,
        totalDroitsTaxes: calculs.totalDroitsTaxes,
        honorairesCDA: calculs.honorairesCDA,
        modeCalculCDA: modeCDA || 'FORFAIT',
        fraisConsignataire: calculs.fraisConsignataire,
        fraisTransport: calculs.fraisTransport,
        fraisStockage: calculs.fraisStockage,
        fraisManutention: calculs.fraisManutention,
        autresFrais: calculs.autresFrais,
        totalFrais: calculs.totalFrais,
        totalGeneral: calculs.totalGeneral,
        nombreConteneurs: parseInt(nombreConteneurs || 1),
        nombreVehicules: parseInt(nombreVehicules || 1),
        notes,
        dateExpiration,
        organisationId: req.user.orgId,
        lignes: {
          create: [
            { description: 'Droits de douane', montant: calculs.droitsDouane, categorie: 'DOUANE' },
            { description: 'TVA à l\'importation', montant: calculs.montantTVA, categorie: 'DOUANE' },
            { description: 'Redevance Statistique', montant: calculs.montantRS, categorie: 'DOUANE' },
            { description: 'Taxe Spéciale sur les Produits', montant: calculs.montantTSP, categorie: 'DOUANE' },
            { description: 'Honoraires CDA', montant: calculs.honorairesCDA, categorie: 'HONORAIRES' },
            { description: 'Frais consignataire', montant: calculs.fraisConsignataire, categorie: 'FRAIS' },
            { description: 'Frais de transport', montant: calculs.fraisTransport, categorie: 'FRAIS' },
            { description: 'Frais de stockage', montant: calculs.fraisStockage, categorie: 'FRAIS' },
            { description: 'Frais de manutention', montant: calculs.fraisManutention, categorie: 'FRAIS' },
            { description: 'Autres frais', montant: calculs.autresFrais, categorie: 'FRAIS' },
          ].filter(l => l.montant > 0)
        }
      },
      include: { lignes: true }
    });

    logger.info('Cotation créée', { reference, userId: req.user.sub });

    return res.status(201).json({
      success: true,
      message: `Cotation ${reference} créée avec succès.`,
      data: { cotation }
    });
  } catch (err) {
    logger.error('Erreur création cotation', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── SIMULER UNE COTATION (sans sauvegarde) ────────────────────────────────────
const simulerCotation = async (req, res) => {
  try {
    const calculs = calculerCotationComplete(req.body);

    return res.json({
      success: true,
      message: 'Simulation effectuée avec succès.',
      data: {
        simulation: {
          ...calculs,
          details: {
            valeurFOB: parseFloat(req.body.valeurFOB || 0),
            valeurFret: parseFloat(req.body.valeurFret || 0),
            valeurAssurance: parseFloat(req.body.valeurAssurance || 0),
            typeMarchandise: req.body.typeMarchandise,
            regimeDouanier: req.body.regimeDouanier || 'IM4',
            devise: req.body.devise || 'XOF'
          }
        }
      }
    });
  } catch (err) {
    logger.error('Erreur simulation cotation', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── LISTE DES COTATIONS ───────────────────────────────────────────────────────
const listerCotations = async (req, res) => {
  try {
    const { page = 1, limit = 10, statut, clientId, dossierId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (statut) where.statut = statut;
    if (clientId) where.clientId = clientId;
    if (dossierId) where.dossierId = dossierId;
    if (req.user.orgId) where.organisationId = req.user.orgId;

    const [cotations, total] = await Promise.all([
      prisma.cotation.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { lignes: true }
      }),
      prisma.cotation.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        cotations,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    logger.error('Erreur liste cotations', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DÉTAIL D'UNE COTATION ─────────────────────────────────────────────────────
const getCotation = async (req, res) => {
  try {
    const { id } = req.params;

    const cotation = await prisma.cotation.findUnique({
      where: { id },
      include: { lignes: true }
    });

    if (!cotation) {
      return res.status(404).json({ success: false, message: 'Cotation non trouvée.' });
    }

    return res.json({ success: true, data: { cotation } });
  } catch (err) {
    logger.error('Erreur get cotation', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── VALIDER UNE COTATION ──────────────────────────────────────────────────────
const validerCotation = async (req, res) => {
  try {
    const { id } = req.params;

    const cotation = await prisma.cotation.findUnique({ where: { id } });
    if (!cotation) {
      return res.status(404).json({ success: false, message: 'Cotation non trouvée.' });
    }

    if (cotation.statut !== 'PROVISOIRE') {
      return res.status(400).json({
        success: false,
        message: 'Seules les cotations provisoires peuvent être validées.'
      });
    }

    const updated = await prisma.cotation.update({
      where: { id },
      data: { statut: 'VALIDEE' },
      include: { lignes: true }
    });

    logger.info('Cotation validée', { id, userId: req.user.sub });

    return res.json({
      success: true,
      message: 'Cotation validée avec succès.',
      data: { cotation: updated }
    });
  } catch (err) {
    logger.error('Erreur validation cotation', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── ENVOYER AU CLIENT ─────────────────────────────────────────────────────────
const envoyerCotation = async (req, res) => {
  try {
    const { id } = req.params;

    const cotation = await prisma.cotation.findUnique({ where: { id } });
    if (!cotation) {
      return res.status(404).json({ success: false, message: 'Cotation non trouvée.' });
    }

    if (!['VALIDEE', 'PROVISOIRE'].includes(cotation.statut)) {
      return res.status(400).json({
        success: false,
        message: 'Cette cotation ne peut pas être envoyée.'
      });
    }

    const updated = await prisma.cotation.update({
      where: { id },
      data: { statut: 'ENVOYEE' },
      include: { lignes: true }
    });

    logger.info('Cotation envoyée', { id, userId: req.user.sub });

    return res.json({
      success: true,
      message: 'Cotation envoyée au client.',
      data: { cotation: updated }
    });
  } catch (err) {
    logger.error('Erreur envoi cotation', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── STATISTIQUES ──────────────────────────────────────────────────────────────
const getStatistiques = async (req, res) => {
  try {
    const where = {};
    if (req.user.orgId) where.organisationId = req.user.orgId;

    const [total, provisoire, validee, envoyee, acceptee, refusee] =
      await Promise.all([
        prisma.cotation.count({ where }),
        prisma.cotation.count({ where: { ...where, statut: 'PROVISOIRE' } }),
        prisma.cotation.count({ where: { ...where, statut: 'VALIDEE' } }),
        prisma.cotation.count({ where: { ...where, statut: 'ENVOYEE' } }),
        prisma.cotation.count({ where: { ...where, statut: 'ACCEPTEE' } }),
        prisma.cotation.count({ where: { ...where, statut: 'REFUSEE' } }),
      ]);

    const tauxConversion = total > 0
      ? ((acceptee / total) * 100).toFixed(2)
      : 0;

    return res.json({
      success: true,
      data: {
        statistiques: {
          total,
          parStatut: { provisoire, validee, envoyee, acceptee, refusee },
          tauxConversion: `${tauxConversion}%`
        }
      }
    });
  } catch (err) {
    logger.error('Erreur statistiques', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  creerCotation,
  simulerCotation,
  listerCotations,
  getCotation,
  validerCotation,
  envoyerCotation,
  getStatistiques
};