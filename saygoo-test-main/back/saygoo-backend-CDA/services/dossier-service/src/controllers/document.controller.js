const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');

// Liste des documents attendus pour le Suivi documentaire (progression d'un dossier)
const DOCUMENTS_ATTENDUS = ['BL', 'Facture', 'Packing List', 'Déclaration', 'Mainlevée', 'BAD', 'Facture CDA'];

// ── Helper : historiser une action sur un document ──────────────────────────────
const logHistorique = (documentId, action, userId, userNom, role) =>
  prisma.documentHistorique.create({
    data: { documentId, action, userId, userNom, role }
  });

// ── AJOUT D'UN DOCUMENT ──────────────────────────────────────────────────────────
const ajouterDocument = async (req, res) => {
  try {
    const { dossierId, type, nom, url, taille, commentaire } = req.body;

    if (!dossierId || !type || !nom || !url) {
      return res.status(400).json({
        success: false,
        message: 'Référence dossier, type, nom et fichier sont obligatoires.'
      });
    }

    const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
    if (!dossier) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé.' });
    }

    const document = await prisma.document.create({
      data: {
        id: uuidv4(),
        dossierId,
        nom,
        type,
        url,
        taille: taille ? parseInt(taille) : null,
        uploadePar: req.user?.sub || 'inconnu',
        statut: 'DEPOSE'
      }
    });

    await logHistorique(document.id, 'Document ajouté', req.user?.sub, req.user?.firstName, req.user?.role);
    if (commentaire) {
      await prisma.note.create({
        data: { id: uuidv4(), dossierId, contenu: `Document ${nom} : ${commentaire}`, userId: req.user?.sub || 'inconnu', userNom: req.user?.firstName || 'inconnu' }
      });
    }

    logger.info('Document ajouté', { documentId: document.id, dossierId, type });

    return res.status(201).json({ success: true, message: 'Document ajouté.', data: { document } });
  } catch (err) {
    logger.error('Erreur ajout document', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── TABLEAU DE BORD : liste + recherche ─────────────────────────────────────────
const listerDocuments = async (req, res) => {
  try {
    const { search, type, statut, dossierId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { archive: false };
    if (type) where.type = type;
    if (statut) where.statut = statut;
    if (dossierId) where.dossierId = dossierId;
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { Dossier: { reference: { contains: search, mode: 'insensitive' } } },
        { Dossier: { clientNom: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { Dossier: { select: { reference: true, clientNom: true } } }
      }),
      prisma.document.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        documents,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
      }
    });
  } catch (err) {
    logger.error('Erreur liste documents', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── CONSULTATION D'UN DOCUMENT (log automatique) ────────────────────────────────
const consulterDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: { Dossier: { select: { reference: true, clientNom: true } } }
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    }

    await logHistorique(id, 'Consulté', req.user?.sub, req.user?.firstName, req.user?.role);

    return res.json({ success: true, data: { document } });
  } catch (err) {
    logger.error('Erreur consultation document', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── TÉLÉCHARGEMENT (log automatique) ────────────────────────────────────────────
const telechargerDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    }

    await logHistorique(id, 'Téléchargé', req.user?.sub, req.user?.firstName, req.user?.role);

    // L'URL réelle du fichier est renvoyée ; le téléchargement effectif est géré par le client / un stockage de fichiers dédié.
    return res.json({ success: true, data: { url: document.url, nom: document.nom } });
  } catch (err) {
    logger.error('Erreur téléchargement document', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── AJOUTER UNE NOUVELLE VERSION ─────────────────────────────────────────────────
const ajouterVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { url, taille } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: 'Le fichier de la nouvelle version est obligatoire.' });
    }

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: { url, taille: taille ? parseInt(taille) : document.taille, version: document.version + 1, statut: 'DEPOSE' }
    });

    await logHistorique(id, `Version ${updated.version} déposée`, req.user?.sub, req.user?.firstName, req.user?.role);

    return res.json({ success: true, message: 'Nouvelle version ajoutée.', data: { document: updated } });
  } catch (err) {
    logger.error('Erreur ajout version', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── SIGNATURE ÉLECTRONIQUE ───────────────────────────────────────────────────────
const signerDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    }
    if (document.statut === 'REJETE') {
      return res.status(400).json({ success: false, message: 'Un document rejeté ne peut pas être signé.' });
    }

    const signePar = req.user ? `${req.user.firstName} ${req.user.lastName}` : 'inconnu';

    const updated = await prisma.document.update({
      where: { id },
      data: { statut: 'SIGNE', signePar, signeAt: new Date() }
    });

    await logHistorique(id, 'Signé', req.user?.sub, signePar, req.user?.role);

    return res.json({ success: true, message: 'Document signé électroniquement.', data: { document: updated } });
  } catch (err) {
    logger.error('Erreur signature document', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── VALIDATION (Back Office) ─────────────────────────────────────────────────────
const validerDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    }

    const updated = await prisma.document.update({ where: { id }, data: { statut: 'VALIDE' } });

    await logHistorique(id, 'Validé', req.user?.sub, req.user?.firstName, req.user?.role);

    return res.json({ success: true, message: 'Document validé.', data: { document: updated } });
  } catch (err) {
    logger.error('Erreur validation document', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── REJET (Back Office) ──────────────────────────────────────────────────────────
const rejeterDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;

    if (!motif) {
      return res.status(400).json({ success: false, message: 'Le motif de rejet est obligatoire.' });
    }

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: { statut: 'REJETE', motifRejet: motif }
    });

    await logHistorique(id, 'Rejeté', req.user?.sub, req.user?.firstName, req.user?.role);

    return res.json({ success: true, message: 'Document rejeté.', data: { document: updated } });
  } catch (err) {
    logger.error('Erreur rejet document', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── HISTORIQUE D'UN DOCUMENT ─────────────────────────────────────────────────────
const getHistoriqueDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const historique = await prisma.documentHistorique.findMany({
      where: { documentId: id },
      orderBy: { createdAt: 'asc' }
    });
    return res.json({ success: true, data: { historique } });
  } catch (err) {
    logger.error('Erreur historique document', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── ARCHIVAGE (manuel, ou automatique une fois le dossier clôturé) ─────────────
const archiverDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: { archive: true, archiveAt: new Date() }
    });

    await logHistorique(id, 'Archivé', req.user?.sub, req.user?.firstName, req.user?.role);

    return res.json({ success: true, message: 'Document archivé.', data: { document: updated } });
  } catch (err) {
    logger.error('Erreur archivage document', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Archivage automatique de tous les documents d'un dossier (déclenché à la clôture)
const archiverDossier = async (req, res) => {
  try {
    const { dossierId } = req.params;

    const documents = await prisma.document.findMany({ where: { dossierId, archive: false } });
    if (documents.length === 0) {
      return res.json({ success: true, message: 'Aucun document à archiver.', data: { count: 0 } });
    }

    await prisma.document.updateMany({
      where: { dossierId, archive: false },
      data: { archive: true, archiveAt: new Date() }
    });

    await Promise.all(
      documents.map((d) => logHistorique(d.id, 'Archivé (dossier clôturé)', req.user?.sub, req.user?.firstName, req.user?.role))
    );

    return res.json({ success: true, message: `${documents.length} document(s) archivé(s).`, data: { count: documents.length } });
  } catch (err) {
    logger.error('Erreur archivage dossier', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── CONSULTATION DES ARCHIVES (par année) ───────────────────────────────────────
const getArchives = async (req, res) => {
  try {
    const { annee } = req.query;
    const year = annee ? parseInt(annee) : new Date().getFullYear();

    const documentsArchives = await prisma.document.findMany({
      where: {
        archive: true,
        archiveAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) }
      },
      include: { Dossier: { select: { reference: true, clientNom: true } } }
    });

    // Regroupement par dossier
    const parDossier = {};
    for (const doc of documentsArchives) {
      const ref = doc.Dossier.reference;
      if (!parDossier[ref]) {
        parDossier[ref] = { reference: ref, clientNom: doc.Dossier.clientNom, nombreDocuments: 0 };
      }
      parDossier[ref].nombreDocuments += 1;
    }

    return res.json({ success: true, data: { annee: year, dossiers: Object.values(parDossier) } });
  } catch (err) {
    logger.error('Erreur consultation archives', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Restaurer un document archivé
const restaurerDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: { archive: false, archiveAt: null }
    });

    await logHistorique(id, 'Restauré', req.user?.sub, req.user?.firstName, req.user?.role);

    return res.json({ success: true, message: 'Document restauré.', data: { document: updated } });
  } catch (err) {
    logger.error('Erreur restauration document', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── SUIVI DOCUMENTAIRE : checklist + progression d'un dossier ──────────────────
const getSuiviDocumentaire = async (req, res) => {
  try {
    const { dossierId } = req.params;

    const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } });
    if (!dossier) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé.' });
    }

    const documents = await prisma.document.findMany({ where: { dossierId } });
    const typesDisponibles = new Set(documents.map((d) => d.type));

    const checklist = DOCUMENTS_ATTENDUS.map((type) => ({
      type,
      disponible: typesDisponibles.has(type)
    }));

    const nombreDisponibles = checklist.filter((c) => c.disponible).length;
    const progression = Math.round((nombreDisponibles / DOCUMENTS_ATTENDUS.length) * 100);

    return res.json({
      success: true,
      data: { dossierId, reference: dossier.reference, checklist, progression }
    });
  } catch (err) {
    logger.error('Erreur suivi documentaire', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  ajouterDocument,
  listerDocuments,
  consulterDocument,
  telechargerDocument,
  ajouterVersion,
  signerDocument,
  validerDocument,
  rejeterDocument,
  getHistoriqueDocument,
  archiverDocument,
  archiverDossier,
  getArchives,
  restaurerDocument,
  getSuiviDocumentaire
};