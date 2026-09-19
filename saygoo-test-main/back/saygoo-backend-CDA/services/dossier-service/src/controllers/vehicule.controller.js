const prisma = require('../config/prisma');
const logger = require('../utils/logger');

// ── Helper : historiser une action sur le dossier ───────────────────────────────
const logHistorique = (dossierId, action, userId, userNom, description) =>
  prisma.historiqueDossier.create({
    data: { dossierId, action, userId, userNom, description }
  });

const FORMALITES_IMPORT = [
  'Déclaration en douane',
  'Paiement des droits et taxes',
  'Bon à enlever',
  'Assurance',
  'Immatriculation'
];

const FORMALITES_TRANSIT = [
  'Déclaration Transit',
  'Laisser-passer',
  'Autorisation de sortie',
  'Documents CEDEAO'
];

// ── CAS N°1 : IMPORTATION AU TOGO — lancer les formalités ──────────────────────
const lancerFormalitesImport = async (req, res) => {
  try {
    const { dossierId } = req.params;

    const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
    if (!dossier) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé.' });
    }

    const existantes = await prisma.formaliteDossier.count({ where: { dossierId, type: 'IMPORT' } });
    if (existantes > 0) {
      return res.status(400).json({ success: false, message: 'Les formalités d\'import ont déjà été lancées pour ce dossier.' });
    }

    await prisma.$transaction([
      prisma.dossier.update({ where: { id: dossierId }, data: { regimeDouanier: 'IM4' } }),
      ...FORMALITES_IMPORT.map((libelle) =>
        prisma.formaliteDossier.create({ data: { dossierId, type: 'IMPORT', libelle } })
      )
    ]);

    await logHistorique(dossierId, 'Formalités d\'import lancées', req.user?.sub, req.user?.firstName, null);

    const formalites = await prisma.formaliteDossier.findMany({ where: { dossierId, type: 'IMPORT' } });

    return res.status(201).json({ success: true, message: 'Formalités d\'import lancées.', data: { formalites } });
  } catch (err) {
    logger.error('Erreur lancement formalités import', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── CAS N°2 : TRANSIT VERS UN PAYS DE LA SOUS-RÉGION — valider le transit ──────
const validerTransit = async (req, res) => {
  try {
    const { dossierId } = req.params;
    const { destinationPays, destinationVille } = req.body;

    if (!destinationPays) {
      return res.status(400).json({ success: false, message: 'Le pays de destination est obligatoire.' });
    }

    const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
    if (!dossier) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé.' });
    }

    const existantes = await prisma.formaliteDossier.count({ where: { dossierId, type: 'TRANSIT' } });
    if (existantes > 0) {
      return res.status(400).json({ success: false, message: 'Le transit a déjà été validé pour ce dossier.' });
    }

    await prisma.$transaction([
      prisma.dossier.update({
        where: { id: dossierId },
        data: { regimeDouanier: 'TRANSIT', destinationPays, destinationVille }
      }),
      ...FORMALITES_TRANSIT.map((libelle) =>
        prisma.formaliteDossier.create({ data: { dossierId, type: 'TRANSIT', libelle } })
      )
    ]);

    await logHistorique(
      dossierId,
      'Transit validé',
      req.user?.sub,
      req.user?.firstName,
      `Destination : ${destinationVille ? destinationVille + ', ' : ''}${destinationPays}`
    );

    const formalites = await prisma.formaliteDossier.findMany({ where: { dossierId, type: 'TRANSIT' } });

    return res.status(201).json({ success: true, message: 'Transit validé.', data: { formalites } });
  } catch (err) {
    logger.error('Erreur validation transit', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── MARQUER UNE FORMALITÉ COMME ACCOMPLIE ───────────────────────────────────────
const completerFormalite = async (req, res) => {
  try {
    const { id } = req.params;

    const formalite = await prisma.formaliteDossier.findUnique({ where: { id } });
    if (!formalite) {
      return res.status(404).json({ success: false, message: 'Formalité non trouvée.' });
    }

    const updated = await prisma.formaliteDossier.update({
      where: { id },
      data: { complete: true, completeAt: new Date() }
    });

    await logHistorique(formalite.dossierId, `Formalité accomplie : ${formalite.libelle}`, req.user?.sub, req.user?.firstName, null);

    return res.json({ success: true, message: 'Formalité marquée comme accomplie.', data: { formalite: updated } });
  } catch (err) {
    logger.error('Erreur complétion formalité', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── LISTE DES FORMALITÉS D'UN DOSSIER ────────────────────────────────────────────
const listerFormalites = async (req, res) => {
  try {
    const { dossierId } = req.params;

    const formalites = await prisma.formaliteDossier.findMany({
      where: { dossierId },
      orderBy: { createdAt: 'asc' }
    });

    const total = formalites.length;
    const completes = formalites.filter((f) => f.complete).length;
    const progression = total > 0 ? Math.round((completes / total) * 100) : 0;

    return res.json({ success: true, data: { formalites, progression } });
  } catch (err) {
    logger.error('Erreur liste formalités', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  lancerFormalitesImport,
  validerTransit,
  completerFormalite,
  listerFormalites
};