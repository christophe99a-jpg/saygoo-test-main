const prisma = require('../config/prisma');
const logger = require('../utils/logger');

const nettoyer = (u) => {
  const { motDePasseHash, twoFactorSecret, ...reste } = u;
  return reste;
};

// ── LISTE DES UTILISATEURS (administration) ─────────────────────────────────────
const lister = async (req, res) => {
  try {
    const { search, role, statut, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (role) where.role = role;
    if (statut) where.statut = statut;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { raisonSociale: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [utilisateurs, total] = await Promise.all([
      prisma.utilisateur.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.utilisateur.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        utilisateurs: utilisateurs.map(nettoyer),
        pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (err) {
    logger.error('Erreur liste utilisateurs', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

const getUn = async (req, res) => {
  try {
    const utilisateur = await prisma.utilisateur.findUnique({ where: { id: req.params.id } });
    if (!utilisateur) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }
    return res.json({ success: true, data: { utilisateur: nettoyer(utilisateur) } });
  } catch (err) {
    logger.error('Erreur détail utilisateur', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── CHANGEMENT DE STATUT (activation / suspension / désactivation) ─────────────
const changerStatut = async (req, res) => {
  try {
    const { statut } = req.body;
    const valides = ['EN_ATTENTE_VALIDATION', 'ACTIF', 'SUSPENDU', 'DESACTIVE'];

    if (!valides.includes(statut)) {
      return res.status(400).json({ success: false, message: `Statut invalide. Valeurs possibles : ${valides.join(', ')}` });
    }

    const utilisateur = await prisma.utilisateur.findUnique({ where: { id: req.params.id } });
    if (!utilisateur) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }
    if (utilisateur.id === req.user.sub) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas modifier le statut de votre propre compte.' });
    }

    const operations = [
      prisma.utilisateur.update({ where: { id: utilisateur.id }, data: { statut } }),
    ];

    // Couper les sessions actives si le compte n'est plus utilisable
    if (statut !== 'ACTIF') {
      operations.push(
        prisma.refreshToken.updateMany({ where: { utilisateurId: utilisateur.id, revoque: false }, data: { revoque: true } }),
      );
    }

    const [maj] = await prisma.$transaction(operations);

    await prisma.journalAuth.create({
      data: {
        utilisateurId: utilisateur.id,
        email: utilisateur.email,
        action: 'CHANGEMENT_STATUT',
        detail: `${utilisateur.statut} -> ${statut} (par ${req.user.sub})`,
        adresseIp: req.ip,
      },
    }).catch(() => {});

    return res.json({ success: true, message: `Statut mis à jour : ${statut}.`, data: { utilisateur: nettoyer(maj) } });
  } catch (err) {
    logger.error('Erreur changement statut', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── CHANGEMENT DE RÔLE ───────────────────────────────────────────────────────────
const changerRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ success: false, message: 'Le rôle est obligatoire.' });
    }

    const utilisateur = await prisma.utilisateur.findUnique({ where: { id: req.params.id } });
    if (!utilisateur) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }
    if (utilisateur.id === req.user.sub) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas modifier votre propre rôle.' });
    }

    // Le rôle est inscrit dans le JWT : les sessions en cours doivent être coupées
    const [maj] = await prisma.$transaction([
      prisma.utilisateur.update({ where: { id: utilisateur.id }, data: { role } }),
      prisma.refreshToken.updateMany({ where: { utilisateurId: utilisateur.id, revoque: false }, data: { revoque: true } }),
    ]);

    return res.json({ success: true, message: `Rôle mis à jour : ${role}.`, data: { utilisateur: nettoyer(maj) } });
  } catch (err) {
    logger.error('Erreur changement rôle', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── JOURNAL D'AUDIT ──────────────────────────────────────────────────────────────
const getJournal = async (req, res) => {
  try {
    const { utilisateurId, action, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (utilisateurId) where.utilisateurId = utilisateurId;
    if (action) where.action = action;

    const [entrees, total] = await Promise.all([
      prisma.journalAuth.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.journalAuth.count({ where }),
    ]);

    return res.json({
      success: true,
      data: { entrees, pagination: { total, page: parseInt(page), limit: parseInt(limit) } },
    });
  } catch (err) {
    logger.error('Erreur journal auth', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

module.exports = { lister, getUn, changerStatut, changerRole, getJournal };
