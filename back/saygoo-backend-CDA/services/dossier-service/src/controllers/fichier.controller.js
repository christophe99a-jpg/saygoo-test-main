const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const prisma = require('../config/prisma');
const { cheminSecurise, supprimerFichier, TAILLE_MAX_OCTETS } = require('../config/stockage');
const logger = require('../utils/logger');

const logHistorique = (documentId, action, userId, userNom, role) =>
  prisma.documentHistorique
    .create({ data: { documentId, action, userId, userNom, role } })
    .catch((err) => logger.warn('Échec écriture historique document', { err: err.message }));

// ── TÉLÉVERSEMENT ────────────────────────────────────────────────────────────
// Reçoit le fichier en multipart, l'écrit sur disque et crée l'enregistrement
// correspondant. Les deux opérations vont de pair : si l'enregistrement échoue,
// le fichier est supprimé pour ne pas laisser d'orphelin.
const televerser = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Aucun fichier reçu.' });
  }

  const nomStocke = req.file.filename;

  try {
    const { dossierId, type, commentaire } = req.body;

    if (!dossierId || !type) {
      supprimerFichier(nomStocke);
      return res.status(400).json({
        success: false,
        message: 'La référence du dossier et le type de document sont obligatoires.',
      });
    }

    const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
    if (!dossier) {
      supprimerFichier(nomStocke);
      return res.status(404).json({ success: false, message: 'Dossier non trouvé.' });
    }

    const document = await prisma.document.create({
      data: {
        id: uuidv4(),
        dossierId,
        nom: req.file.originalname,
        type,
        // `url` conserve le nom interne du fichier, jamais son chemin absolu :
        // le chemin est reconstruit côté serveur au moment du téléchargement.
        url: nomStocke,
        taille: req.file.size,
        uploadePar: req.user?.sub || 'inconnu',
        statut: 'DEPOSE',
      },
    });

    await logHistorique(document.id, 'Document téléversé', req.user?.sub, req.user?.firstName, req.user?.role);

    if (commentaire) {
      await prisma.note
        .create({
          data: {
            id: uuidv4(),
            dossierId,
            contenu: `${req.file.originalname} : ${commentaire}`,
            userId: req.user?.sub || 'inconnu',
            userNom: req.user?.firstName || 'inconnu',
          },
        })
        .catch(() => {});
    }

    logger.info('Document téléversé', { documentId: document.id, dossierId, taille: req.file.size });

    return res.status(201).json({
      success: true,
      message: 'Document téléversé.',
      data: { document: { ...document, url: undefined } },
    });
  } catch (err) {
    // L'enregistrement a échoué : on ne garde pas le fichier sur le disque.
    supprimerFichier(nomStocke);
    logger.error('Erreur téléversement document', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// Nouvelle version d'un document existant : l'ancien fichier est conservé
// dans l'historique mais n'est plus servi.
const televerserVersion = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Aucun fichier reçu.' });
  }

  const nomStocke = req.file.filename;

  try {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });

    if (!document) {
      supprimerFichier(nomStocke);
      return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    }
    if (document.archive) {
      supprimerFichier(nomStocke);
      return res.status(400).json({ success: false, message: 'Ce document est archivé.' });
    }

    const ancienFichier = document.url;

    const maj = await prisma.document.update({
      where: { id: document.id },
      data: {
        nom: req.file.originalname,
        url: nomStocke,
        taille: req.file.size,
        version: document.version + 1,
        statut: 'DEPOSE',
      },
    });

    await logHistorique(
      document.id,
      `Version ${maj.version} déposée`,
      req.user?.sub,
      req.user?.firstName,
      req.user?.role,
    );

    // L'ancienne version n'est plus référencée : on libère l'espace disque.
    if (ancienFichier && ancienFichier !== nomStocke) {
      supprimerFichier(ancienFichier);
    }

    return res.json({ success: true, message: 'Nouvelle version déposée.', data: { document: { ...maj, url: undefined } } });
  } catch (err) {
    supprimerFichier(nomStocke);
    logger.error('Erreur dépôt de version', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── TÉLÉCHARGEMENT ───────────────────────────────────────────────────────────
// Les documents douaniers sont confidentiels : ils ne sont jamais servis en
// statique. Chaque téléchargement passe par ce contrôle et est journalisé.
const telechargerFichier = async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { Dossier: { select: { clientId: true, reference: true } } },
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    }

    // Un opérateur économique ne peut consulter que les documents de ses
    // propres dossiers ; les agents internes voient l'ensemble.
    const rolesInternes = ['SUPER_ADMIN', 'ADMIN', 'CDA', 'COMPTABLE'];
    const estInterne = rolesInternes.includes(req.user?.role);
    const estProprietaire = document.Dossier?.clientId === req.user?.sub;

    if (!estInterne && !estProprietaire) {
      logger.warn('Tentative de téléchargement non autorisée', {
        documentId: document.id,
        userId: req.user?.sub,
      });
      return res.status(403).json({ success: false, message: 'Accès refusé à ce document.' });
    }

    if (!document.url) {
      return res.status(404).json({
        success: false,
        message: 'Aucun fichier n\'est associé à ce document.',
      });
    }

    const chemin = cheminSecurise(document.url);

    if (!chemin || !fs.existsSync(chemin)) {
      logger.error('Fichier absent du stockage', { documentId: document.id, url: document.url });
      return res.status(404).json({
        success: false,
        message: 'Le fichier est introuvable sur le serveur.',
      });
    }

    await logHistorique(document.id, 'Téléchargé', req.user?.sub, req.user?.firstName, req.user?.role);

    // Content-Disposition en pièce jointe : un PDF ou une image piégée ne
    // s'exécute pas dans le navigateur sur le domaine de l'application.
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.nom)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.sendFile(chemin);
  } catch (err) {
    logger.error('Erreur téléchargement fichier', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// Métadonnées du fichier, sans le contenu : utile pour afficher un aperçu
// (nom, taille, type) avant de déclencher le téléchargement.
const infosFichier = async (req, res) => {
  try {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    }

    const chemin = document.url ? cheminSecurise(document.url) : null;
    const present = Boolean(chemin && fs.existsSync(chemin));

    return res.json({
      success: true,
      data: {
        id: document.id,
        nom: document.nom,
        type: document.type,
        taille: document.taille,
        version: document.version,
        statut: document.statut,
        fichierDisponible: present,
        extension: document.nom ? path.extname(document.nom).toLowerCase() : null,
      },
    });
  } catch (err) {
    logger.error('Erreur infos fichier', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── GESTION DES ERREURS MULTER ───────────────────────────────────────────────
// Sans ce middleware, un fichier trop volumineux remonte une erreur technique
// illisible pour l'utilisateur.
const gererErreursUpload = (err, req, res, next) => {
  if (!err) return next();

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: `Fichier trop volumineux. Taille maximale : ${Math.round(TAILLE_MAX_OCTETS / 1024 / 1024)} Mo.`,
    });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ success: false, message: 'Un seul fichier à la fois.' });
  }

  // Erreurs levées par le filtre de format
  return res.status(400).json({ success: false, message: err.message });
};

module.exports = {
  televerser,
  televerserVersion,
  telechargerFichier,
  infosFichier,
  gererErreursUpload,
};
