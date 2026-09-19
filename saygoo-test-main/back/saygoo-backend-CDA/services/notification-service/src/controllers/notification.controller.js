const prisma = require('../config/prisma');
const { dispatch } = require('../services/dispatcher');
const logger = require('../utils/logger');

// Remplace {{variable}} par sa valeur dans un contenu de template
const appliquerVariables = (texte, variables = {}) =>
  texte.replace(/\{\{(\w+)\}\}/g, (_, cle) => variables[cle] ?? `{{${cle}}}`);

// ── ENVOI D'UNE NOTIFICATION ─────────────────────────────────────────────────────
// Appelée par les autres services (dossier, facturation, stockage...) pour
// remplacer les `logger.info(... notification à envoyer)` laissés en attente.
const envoyer = async (req, res) => {
  try {
    const {
      type,
      destinataire,
      sujet,
      contenu,
      templateCode,
      variables,
      priorite,
      userId,
      dossierId,
      factureId,
      organisationId,
      metadata,
    } = req.body;

    if (!type || !destinataire) {
      return res.status(400).json({
        success: false,
        message: 'Le type et le destinataire sont obligatoires.',
      });
    }

    let sujetFinal = sujet;
    let contenuFinal = contenu;

    // Si un template est demandé, il fournit le sujet et le contenu
    if (templateCode) {
      const template = await prisma.template.findUnique({ where: { code: templateCode } });
      if (!template) {
        return res.status(404).json({ success: false, message: `Template ${templateCode} introuvable.` });
      }
      if (!template.isActive) {
        return res.status(400).json({ success: false, message: `Template ${templateCode} désactivé.` });
      }
      sujetFinal = template.sujet ? appliquerVariables(template.sujet, variables) : sujet;
      contenuFinal = appliquerVariables(template.contenu, variables);
    }

    if (!contenuFinal) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu (ou un templateCode valide) est obligatoire.',
      });
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        destinataire,
        sujet: sujetFinal,
        contenu: contenuFinal,
        priorite: priorite || 'NORMALE',
        userId,
        dossierId,
        factureId,
        organisationId,
        metadata,
        statut: 'EN_ATTENTE',
      },
    });

    // Tentative d'expédition immédiate
    try {
      await dispatch(notification);
      const envoyee = await prisma.notification.update({
        where: { id: notification.id },
        data: { statut: 'ENVOYEE', envoyeAt: new Date(), tentatives: 1 },
      });
      return res.status(201).json({ success: true, message: 'Notification envoyée.', data: { notification: envoyee } });
    } catch (errEnvoi) {
      const echouee = await prisma.notification.update({
        where: { id: notification.id },
        data: { statut: 'ECHEC', tentatives: 1, erreur: errEnvoi.message },
      });
      logger.warn('Échec d\'envoi de notification', { id: notification.id, err: errEnvoi.message });
      // 202 : la notification est enregistrée, elle sera rejouée
      return res.status(202).json({
        success: true,
        message: 'Notification enregistrée mais non expédiée. Elle sera réessayée.',
        data: { notification: echouee },
      });
    }
  } catch (err) {
    logger.error('Erreur envoi notification', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── MES NOTIFICATIONS (boîte de réception in-app) ──────────────────────────────
const lister = async (req, res) => {
  try {
    const { statut, type, nonLues, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user?.sub };
    if (statut) where.statut = statut;
    if (type) where.type = type;
    if (nonLues === 'true') where.luAt = null;

    const [notifications, total, nonLuesCount] = await Promise.all([
      prisma.notification.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user?.sub, luAt: null } }),
    ]);

    return res.json({
      success: true,
      data: {
        notifications,
        nonLues: nonLuesCount,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (err) {
    logger.error('Erreur liste notifications', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── MARQUER COMME LUE ────────────────────────────────────────────────────────────
const marquerLue = async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification non trouvée.' });
    }
    if (notification.userId !== req.user?.sub) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette notification.' });
    }
    if (notification.luAt) {
      return res.json({ success: true, message: 'Déjà lue.', data: { notification } });
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { statut: 'LUE', luAt: new Date() },
    });

    return res.json({ success: true, message: 'Notification marquée comme lue.', data: { notification: updated } });
  } catch (err) {
    logger.error('Erreur marquage notification', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

const marquerToutesLues = async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user?.sub, luAt: null },
      data: { statut: 'LUE', luAt: new Date() },
    });

    return res.json({ success: true, message: `${result.count} notification(s) marquée(s) comme lue(s).` });
  } catch (err) {
    logger.error('Erreur marquage global notifications', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── REJOUER LES ENVOIS EN ÉCHEC ──────────────────────────────────────────────────
const rejouerEchecs = async (req, res) => {
  try {
    const enEchec = await prisma.notification.findMany({
      where: { statut: 'ECHEC' },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });

    // On ne rejoue que celles qui n'ont pas épuisé leurs tentatives
    const aRejouer = enEchec.filter((n) => n.tentatives < n.maxTentatives);

    let reussies = 0;
    let echouees = 0;

    for (const notification of aRejouer) {
      try {
        await dispatch(notification);
        await prisma.notification.update({
          where: { id: notification.id },
          data: { statut: 'ENVOYEE', envoyeAt: new Date(), tentatives: notification.tentatives + 1, erreur: null },
        });
        reussies += 1;
      } catch (errEnvoi) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { tentatives: notification.tentatives + 1, erreur: errEnvoi.message },
        });
        echouees += 1;
      }
    }

    return res.json({
      success: true,
      message: `Rejeu terminé : ${reussies} envoyée(s), ${echouees} encore en échec.`,
      data: { traitees: aRejouer.length, reussies, echouees, abandonnees: enEchec.length - aRejouer.length },
    });
  } catch (err) {
    logger.error('Erreur rejeu notifications', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── TEMPLATES ────────────────────────────────────────────────────────────────────
const listerTemplates = async (req, res) => {
  try {
    const templates = await prisma.template.findMany({ orderBy: { code: 'asc' } });
    return res.json({ success: true, data: { templates } });
  } catch (err) {
    logger.error('Erreur liste templates', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

const creerTemplate = async (req, res) => {
  try {
    const { code, type, sujet, contenu, variables } = req.body;

    if (!code || !type || !contenu) {
      return res.status(400).json({ success: false, message: 'Le code, le type et le contenu sont obligatoires.' });
    }

    const existant = await prisma.template.findUnique({ where: { code } });
    if (existant) {
      return res.status(400).json({ success: false, message: `Un template avec le code ${code} existe déjà.` });
    }

    const template = await prisma.template.create({
      data: { code, type, sujet, contenu, variables: variables || [] },
    });

    return res.status(201).json({ success: true, message: 'Template créé.', data: { template } });
  } catch (err) {
    logger.error('Erreur création template', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

const modifierTemplate = async (req, res) => {
  try {
    const { sujet, contenu, variables, isActive } = req.body;

    const template = await prisma.template.findUnique({ where: { id: req.params.id } });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template non trouvé.' });
    }

    const updated = await prisma.template.update({
      where: { id: req.params.id },
      data: {
        sujet: sujet ?? template.sujet,
        contenu: contenu ?? template.contenu,
        variables: variables ?? template.variables,
        isActive: isActive ?? template.isActive,
      },
    });

    return res.json({ success: true, message: 'Template mis à jour.', data: { template: updated } });
  } catch (err) {
    logger.error('Erreur modification template', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  envoyer,
  lister,
  marquerLue,
  marquerToutesLues,
  rejouerEchecs,
  listerTemplates,
  creerTemplate,
  modifierTemplate,
};
