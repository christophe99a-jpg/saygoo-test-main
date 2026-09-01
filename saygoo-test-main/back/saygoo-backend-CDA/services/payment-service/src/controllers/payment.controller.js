const prisma = require('../config/prisma');
const { generateReference } = require('../utils/reference');
const logger = require('../utils/logger');

// ── INITIER UN PAIEMENT ───────────────────────────────────────────────────────
const initierPaiement = async (req, res) => {
  try {
    const {
      factureId, factureNum, dossierId, dossierRef,
      clientId, clientNom, clientTel,
      montant, devise, methode, notes, dateEcheance
    } = req.body;

    const reference = await generateReference();

    const paiement = await prisma.paiement.create({
      data: {
        reference,
        factureId,
        factureNum,
        dossierId,
        dossierRef,
        clientId,
        clientNom,
        clientTel,
        montant: parseFloat(montant),
        devise: devise || 'XOF',
        methode,
        notes,
        agentId: req.user?.sub,
        agentNom: req.user ? `${req.user.firstName} ${req.user.lastName}` : null,
        organisationId: req.user?.orgId,
        dateEcheance: dateEcheance ? new Date(dateEcheance) : null
      },
      include: { tentatives: true }
    });

    // Simuler l'initiation selon la méthode
    const resultat = await initierSelonMethode(paiement);

    // Enregistrer la tentative
    await prisma.tentativePaiement.create({
      data: {
        paiementId: paiement.id,
        statut: resultat.statut,
        message: resultat.message,
        data: resultat.data || {}
      }
    });

    // Mettre à jour le statut
    const updated = await prisma.paiement.update({
      where: { id: paiement.id },
      data: {
        statut: resultat.statut === 'SUCCESS' ? 'EN_COURS' : 'EN_ATTENTE',
        referenceExterne: resultat.referenceExterne
      },
      include: { tentatives: true }
    });

    logger.info('Paiement initié', { reference, methode, userId: req.user?.sub });

    return res.status(201).json({
      success: true,
      message: `Paiement ${reference} initié avec succès.`,
      data: { paiement: updated, instructions: resultat.instructions }
    });
  } catch (err) {
    logger.error('Erreur initiation paiement', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── CONFIRMER UN PAIEMENT ─────────────────────────────────────────────────────
const confirmerPaiement = async (req, res) => {
  try {
    const { id } = req.params;
    const { numeroTransaction, notes } = req.body;

    const paiement = await prisma.paiement.findUnique({ where: { id } });
    if (!paiement) {
      return res.status(404).json({ success: false, message: 'Paiement non trouvé.' });
    }

    if (paiement.statut === 'SUCCES') {
      return res.status(400).json({ success: false, message: 'Paiement déjà confirmé.' });
    }

    const updated = await prisma.paiement.update({
      where: { id },
      data: {
        statut: 'SUCCES',
        numeroTransaction,
        notes,
        datePaiement: new Date()
      },
      include: { tentatives: true }
    });

    await prisma.tentativePaiement.create({
      data: {
        paiementId: id,
        statut: 'SUCCES',
        message: 'Paiement confirmé manuellement',
        data: { numeroTransaction }
      }
    });

    logger.info('Paiement confirmé', { id, numeroTransaction });

    return res.json({
      success: true,
      message: 'Paiement confirmé avec succès.',
      data: { paiement: updated }
    });
  } catch (err) {
    logger.error('Erreur confirmation paiement', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── LISTE DES PAIEMENTS ───────────────────────────────────────────────────────
const listerPaiements = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, statut,
      methode, clientId, dateDebut, dateFin
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (statut) where.statut = statut;
    if (methode) where.methode = methode;
    if (clientId) where.clientId = clientId;
    if (req.user?.orgId) where.organisationId = req.user.orgId;

    if (dateDebut || dateFin) {
      where.createdAt = {};
      if (dateDebut) where.createdAt.gte = new Date(dateDebut);
      if (dateFin) where.createdAt.lte = new Date(dateFin);
    }

    const [paiements, total] = await Promise.all([
      prisma.paiement.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { tentatives: true }
      }),
      prisma.paiement.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        paiements,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    logger.error('Erreur liste paiements', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DÉTAIL D'UN PAIEMENT ──────────────────────────────────────────────────────
const getPaiement = async (req, res) => {
  try {
    const { id } = req.params;

    const paiement = await prisma.paiement.findUnique({
      where: { id },
      include: { tentatives: true }
    });

    if (!paiement) {
      return res.status(404).json({ success: false, message: 'Paiement non trouvé.' });
    }

    return res.json({ success: true, data: { paiement } });
  } catch (err) {
    logger.error('Erreur get paiement', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── ANNULER UN PAIEMENT ───────────────────────────────────────────────────────
const annulerPaiement = async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;

    const paiement = await prisma.paiement.findUnique({ where: { id } });
    if (!paiement) {
      return res.status(404).json({ success: false, message: 'Paiement non trouvé.' });
    }

    if (paiement.statut === 'SUCCES') {
      return res.status(400).json({
        success: false,
        message: 'Un paiement réussi ne peut pas être annulé.'
      });
    }

    const updated = await prisma.paiement.update({
      where: { id },
      data: { statut: 'ANNULE', notes: motif || 'Annulé' },
      include: { tentatives: true }
    });

    logger.info('Paiement annulé', { id, userId: req.user?.sub });

    return res.json({
      success: true,
      message: 'Paiement annulé.',
      data: { paiement: updated }
    });
  } catch (err) {
    logger.error('Erreur annulation paiement', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── WEBHOOK ───────────────────────────────────────────────────────────────────
const webhook = async (req, res) => {
  try {
    const { reference, statut, numeroTransaction, data } = req.body;

    const paiement = await prisma.paiement.findFirst({
      where: { reference }
    });

    if (!paiement) {
      return res.status(404).json({ success: false, message: 'Paiement non trouvé.' });
    }

    const nouveauStatut = statut === 'SUCCESS' ? 'SUCCES' : 'ECHEC';

    await prisma.paiement.update({
      where: { id: paiement.id },
      data: {
        statut: nouveauStatut,
        numeroTransaction,
        webhookData: data || {},
        datePaiement: nouveauStatut === 'SUCCES' ? new Date() : null
      }
    });

    await prisma.tentativePaiement.create({
      data: {
        paiementId: paiement.id,
        statut: nouveauStatut,
        message: `Webhook reçu : ${statut}`,
        data: data || {}
      }
    });

    logger.info('Webhook paiement reçu', { reference, statut });

    return res.json({ success: true, message: 'Webhook traité.' });
  } catch (err) {
    logger.error('Erreur webhook', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── STATISTIQUES ──────────────────────────────────────────────────────────────
const getStatistiques = async (req, res) => {
  try {
    const where = {};
    if (req.user?.orgId) where.organisationId = req.user.orgId;

    const [total, enAttente, enCours, succes, echec, annule] =
      await Promise.all([
        prisma.paiement.count({ where }),
        prisma.paiement.count({ where: { ...where, statut: 'EN_ATTENTE' } }),
        prisma.paiement.count({ where: { ...where, statut: 'EN_COURS' } }),
        prisma.paiement.count({ where: { ...where, statut: 'SUCCES' } }),
        prisma.paiement.count({ where: { ...where, statut: 'ECHEC' } }),
        prisma.paiement.count({ where: { ...where, statut: 'ANNULE' } })
      ]);

    const totalEncaisse = await prisma.paiement.aggregate({
      where: { ...where, statut: 'SUCCES' },
      _sum: { montant: true }
    });

    return res.json({
      success: true,
      data: {
        statistiques: {
          total,
          parStatut: { enAttente, enCours, succes, echec, annule },
          totalEncaisse: totalEncaisse._sum.montant || 0
        }
      }
    });
  } catch (err) {
    logger.error('Erreur statistiques', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Helper : initier selon méthode ────────────────────────────────────────────
const initierSelonMethode = async (paiement) => {
  switch (paiement.methode) {
    case 'FLOOZ':
      return {
        statut: 'SUCCESS',
        message: 'Demande FLOOZ envoyée',
        referenceExterne: `FLOOZ-${Date.now()}`,
        instructions: 'Composez *144# pour confirmer le paiement.',
        data: { provider: 'FLOOZ' }
      };

    case 'TMONEY':
      return {
        statut: 'SUCCESS',
        message: 'Demande T-Money envoyée',
        referenceExterne: `TMONEY-${Date.now()}`,
        instructions: 'Composez *145# pour confirmer le paiement.',
        data: { provider: 'TMONEY' }
      };

    case 'WAVE':
      return {
        statut: 'SUCCESS',
        message: 'Lien Wave généré',
        referenceExterne: `WAVE-${Date.now()}`,
        instructions: 'Scannez le QR code Wave pour payer.',
        data: { provider: 'WAVE' }
      };

    case 'VIREMENT_BANCAIRE':
      return {
        statut: 'SUCCESS',
        message: 'Instructions de virement envoyées',
        referenceExterne: `VIR-${Date.now()}`,
        instructions: 'Effectuez le virement sur le compte SAYGOO avec la référence.',
        data: { provider: 'BANQUE' }
      };

    case 'ESPECES':
      return {
        statut: 'SUCCESS',
        message: 'Paiement en espèces enregistré',
        referenceExterne: `ESP-${Date.now()}`,
        instructions: 'Remettez le montant en espèces à l\'agent.',
        data: { provider: 'ESPECES' }
      };

    default:
      return {
        statut: 'SUCCESS',
        message: 'Paiement initié',
        referenceExterne: `PAY-${Date.now()}`,
        instructions: 'Suivez les instructions de paiement.',
        data: {}
      };
  }
};

module.exports = {
  initierPaiement,
  confirmerPaiement,
  listerPaiements,
  getPaiement,
  annulerPaiement,
  webhook,
  getStatistiques
};