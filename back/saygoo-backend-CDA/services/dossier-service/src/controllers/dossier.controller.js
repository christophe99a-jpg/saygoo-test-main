const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/prisma');
const { generateDossierReference } = require('../utils/reference');
const logger = require('../utils/logger');

// ── Helper : ajouter une ligne d'historique ────────────────────────────────────
const logHistorique = (dossierId, action, userId, userNom, description, ancienStatut, nouveauStatut) =>
  prisma.historiqueDossier.create({
    data: { dossierId, action, userId, userNom, description, ancienStatut, nouveauStatut }
  });

// ── RÉCEPTION D'UNE DEMANDE DE DÉDOUANEMENT (Opérateur économique -> CDA) ──────
const creerDossier = async (req, res) => {
  try {
    const {
      clientId, clientNom, typeMarchandise, regimeDouanier, typeVehicule,
      description, poids, volume, valeurFOB, valeurFret, valeurAssurance, valeurCIF,
      devise, numeroConnaissement, paysOrigine, portEmbarquement, portDestination,
      organisationId,
      // Données logistiques saisies par l'opérateur économique
      codeHS, nombreConteneurs, modeTransport, distanceKm, lienGeolocalisation, co2EstimeKg,
      modePaiement, paiementFractionne, servicesGMS, observations
    } = req.body;

    if (!clientNom || !clientId || !typeMarchandise) {
      return res.status(400).json({
        success: false,
        message: 'Client et type de marchandise sont obligatoires.'
      });
    }

    const reference = await generateDossierReference();

    const dossier = await prisma.dossier.create({
      data: {
        reference,
        clientId,
        clientNom,
        typeMarchandise,
        regimeDouanier: regimeDouanier || 'IM4',
        typeVehicule,
        description,
        poids: poids ? parseFloat(poids) : null,
        volume: volume ? parseFloat(volume) : null,
        valeurFOB: valeurFOB ? parseFloat(valeurFOB) : null,
        valeurFret: valeurFret ? parseFloat(valeurFret) : null,
        valeurAssurance: valeurAssurance ? parseFloat(valeurAssurance) : null,
        valeurCIF: valeurCIF ? parseFloat(valeurCIF) : null,
        devise: devise || 'XOF',
        numeroConnaissement,
        paysOrigine,
        portEmbarquement,
        portDestination: portDestination || 'Lomé',
        organisationId,

        // Chaque donnée logistique a désormais sa colonne : les dossiers
        // redeviennent filtrables par code SH, mode de transport, etc.
        codeHS,
        nombreConteneurs: nombreConteneurs ? parseInt(nombreConteneurs, 10) : null,
        modeTransport,
        distanceKm: distanceKm ? parseFloat(distanceKm) : null,
        lienGeolocalisation,
        co2EstimeKg: co2EstimeKg ? parseFloat(co2EstimeKg) : null,
        modePaiement,
        paiementFractionne: Boolean(paiementFractionne),
        servicesGMS: Array.isArray(servicesGMS) ? servicesGMS : [],

        statut: 'EN_ATTENTE'
      }
    });

    // Les observations libres restent utiles : elles deviennent la première
    // note du dossier, visible par l'agent qui le prendra en charge.
    if (observations) {
      await prisma.note.create({
        data: {
          id: uuidv4(),
          dossierId: dossier.id,
          contenu: observations,
          userId: clientId,
          userNom: clientNom,
        },
      }).catch((err) => logger.warn('Note initiale non créée', { err: err.message }));
    }

    await logHistorique(dossier.id, 'Demande reçue', req.user?.sub, req.user?.firstName, null, null, 'EN_ATTENTE');

    logger.info('Dossier de dédouanement créé', { reference });

    return res.status(201).json({
      success: true,
      message: `Dossier ${reference} reçu.`,
      data: { dossier }
    });
  } catch (err) {
    logger.error('Erreur création dossier', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── LISTE DES DOSSIERS (Tableau de bord, avec recherche) ───────────────────────
const listerDossiers = async (req, res) => {
  try {
    const { search, statut, typeMarchandise, codeHS, modeTransport, clientId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (statut) where.statut = statut;
    if (typeMarchandise) where.typeMarchandise = typeMarchandise;
    if (clientId) where.clientId = clientId;
    if (codeHS) where.codeHS = codeHS;
    if (modeTransport) where.modeTransport = modeTransport;
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { clientNom: { contains: search, mode: 'insensitive' } },
        { numeroConnaissement: { contains: search, mode: 'insensitive' } },
        { codeHS: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [dossiers, total] = await Promise.all([
      prisma.dossier.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.dossier.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        dossiers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    logger.error('Erreur liste dossiers', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── DÉTAIL D'UN DOSSIER ─────────────────────────────────────────────────────────
const getDossier = async (req, res) => {
  try {
    const { id } = req.params;

    const dossier = await prisma.dossier.findUnique({
      where: { id },
      include: {
        Document: true,
        Note: { orderBy: { createdAt: 'desc' } },
        historique: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!dossier) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé.' });
    }

    return res.json({ success: true, data: { dossier } });
  } catch (err) {
    logger.error('Erreur détail dossier', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── PRISE EN CHARGE PAR LE CDA ───────────────────────────────────────────────────
const prendreEnCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const dossier = await prisma.dossier.findUnique({ where: { id } });

    if (!dossier) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé.' });
    }
    if (dossier.statut !== 'EN_ATTENTE') {
      return res.status(400).json({ success: false, message: 'Seul un dossier En attente peut être pris en charge.' });
    }

    const agentId = req.user?.sub;
    const agentNom = req.user ? `${req.user.firstName} ${req.user.lastName}` : null;

    const updated = await prisma.dossier.update({
      where: { id },
      data: { statut: 'EN_COURS', agentId, agentNom }
    });

    await logHistorique(id, 'Prise en charge', agentId, agentNom, null, 'EN_ATTENTE', 'EN_COURS');

    return res.json({ success: true, message: 'Dossier pris en charge.', data: { dossier: updated } });
  } catch (err) {
    logger.error('Erreur prise en charge', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── REJET D'UNE DEMANDE ──────────────────────────────────────────────────────────
const rejeterDossier = async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;

    if (!motif) {
      return res.status(400).json({ success: false, message: 'Le motif de rejet est obligatoire.' });
    }

    const dossier = await prisma.dossier.findUnique({ where: { id } });
    if (!dossier) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé.' });
    }
    if (dossier.statut === 'LIVRE') {
      return res.status(400).json({ success: false, message: 'Un dossier livré ne peut plus être rejeté.' });
    }

    const userId = req.user?.sub;
    const userNom = req.user ? `${req.user.firstName} ${req.user.lastName}` : null;
    const ancienStatut = dossier.statut;

    const [updated] = await prisma.$transaction([
      prisma.dossier.update({ where: { id }, data: { statut: 'ANNULE' } }),
      prisma.note.create({
        data: { id: uuidv4(), dossierId: id, contenu: `Rejet : ${motif}`, userId, userNom }
      })
    ]);

    await logHistorique(id, 'Dossier rejeté', userId, userNom, motif, ancienStatut, 'ANNULE');

    return res.json({ success: true, message: 'Dossier rejeté.', data: { dossier: updated } });
  } catch (err) {
    logger.error('Erreur rejet dossier', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── DEMANDE DE DOCUMENTS COMPLÉMENTAIRES ────────────────────────────────────────
const demanderDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentsManquants, commentaire } = req.body; // ex: ['Facture', 'Certificat d\'origine']

    if (!Array.isArray(documentsManquants) || documentsManquants.length === 0) {
      return res.status(400).json({ success: false, message: 'La liste des documents manquants est obligatoire.' });
    }

    const dossier = await prisma.dossier.findUnique({ where: { id } });
    if (!dossier) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé.' });
    }

    const userId = req.user?.sub;
    const userNom = req.user ? `${req.user.firstName} ${req.user.lastName}` : null;
    const ancienStatut = dossier.statut;

    const note = `Documents demandés : ${documentsManquants.join(', ')}${commentaire ? ` — ${commentaire}` : ''}`;

    await prisma.$transaction([
      prisma.dossier.update({ where: { id }, data: { statut: 'DOCUMENTS_COMPLEMENTAIRES' } }),
      prisma.note.create({ data: { id: uuidv4(), dossierId: id, contenu: note, userId, userNom } })
    ]);

    await logHistorique(id, 'Demande de documents complémentaires', userId, userNom, commentaire, ancienStatut, 'DOCUMENTS_COMPLEMENTAIRES');

    // NOTE : notification automatique au client à implémenter via notification-service
    logger.info('Documents complémentaires demandés — notification client à envoyer', { dossierId: id });

    const updated = await prisma.dossier.findUnique({ where: { id }, include: { Note: true } });

    return res.json({
      success: true,
      message: 'Demande de documents envoyée. Le client recevra une notification.',
      data: { dossier: updated }
    });
  } catch (err) {
    logger.error('Erreur demande documents', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── MISE À JOUR DU TRAITEMENT DU DOSSIER ────────────────────────────────────────
const majTraitement = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, commentaire, numeroDeclaration } = req.body;

    const valeurs = ['EN_COURS', 'DECLARE', 'EN_ATTENTE_DOUANE', 'DEDOUANE', 'LIVRE'];
    if (!valeurs.includes(statut)) {
      return res.status(400).json({ success: false, message: 'Statut invalide.' });
    }

    const dossier = await prisma.dossier.findUnique({ where: { id } });
    if (!dossier) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé.' });
    }

    const userId = req.user?.sub;
    const userNom = req.user ? `${req.user.firstName} ${req.user.lastName}` : null;
    const ancienStatut = dossier.statut;

    const data = { statut };
    if (statut === 'DECLARE' && numeroDeclaration) data.numeroDeclaration = numeroDeclaration;
    if (statut === 'DEDOUANE') data.dateDedouanement = new Date();
    if (statut === 'LIVRE') data.dateLivraison = new Date();

    const updated = await prisma.dossier.update({ where: { id }, data });

    const libelles = {
      EN_COURS: 'En cours',
      DECLARE: 'Déclaration déposée',
      EN_ATTENTE_DOUANE: 'En attente Douane',
      DEDOUANE: 'Bon à enlever obtenu',
      LIVRE: 'Dossier terminé / Livré'
    };
    await logHistorique(id, libelles[statut], userId, userNom, commentaire, ancienStatut, statut);

    return res.json({ success: true, message: 'Statut mis à jour.', data: { dossier: updated } });
  } catch (err) {
    logger.error('Erreur maj traitement', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── TÉLÉVERSEMENT D'UN DOCUMENT ──────────────────────────────────────────────────
const uploaderDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, type, url, taille } = req.body;

    const dossier = await prisma.dossier.findUnique({ where: { id } });
    if (!dossier) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé.' });
    }
    if (!nom || !type || !url) {
      return res.status(400).json({ success: false, message: 'Le nom, le type et l\'URL du fichier sont obligatoires.' });
    }

    const document = await prisma.document.create({
      data: {
        id: uuidv4(),
        dossierId: id,
        nom,
        type,
        url,
        taille: taille ? parseInt(taille) : null,
        uploadePar: req.user?.sub || 'inconnu'
      }
    });

    await logHistorique(id, `Document reçu : ${type}`, req.user?.sub, req.user?.firstName, nom, null, null);

    return res.status(201).json({ success: true, message: 'Document ajouté.', data: { document } });
  } catch (err) {
    logger.error('Erreur upload document', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

const listerDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const documents = await prisma.document.findMany({
      where: { dossierId: id },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: { documents } });
  } catch (err) {
    logger.error('Erreur liste documents', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── NOTES SUR UN DOSSIER ─────────────────────────────────────────────────────────
const ajouterNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenu } = req.body;

    if (!contenu) {
      return res.status(400).json({ success: false, message: 'Le contenu de la note est obligatoire.' });
    }

    const note = await prisma.note.create({
      data: {
        id: uuidv4(),
        dossierId: id,
        contenu,
        userId: req.user?.sub || 'inconnu',
        userNom: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Inconnu'
      }
    });

    return res.status(201).json({ success: true, message: 'Note ajoutée.', data: { note } });
  } catch (err) {
    logger.error('Erreur ajout note', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

const listerNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const notes = await prisma.note.findMany({
      where: { dossierId: id },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: { notes } });
  } catch (err) {
    logger.error('Erreur liste notes', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── CLÔTURE DU DOSSIER ───────────────────────────────────────────────────────────
// Nécessite : Déclaration, Mainlevée et Bon à enlever présents parmi les documents
const cloturerDossier = async (req, res) => {
  try {
    const { id } = req.params;

    const dossier = await prisma.dossier.findUnique({ where: { id }, include: { Document: true } });
    if (!dossier) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé.' });
    }

    const typesRequis = ['DECLARATION', 'MAINLEVEE', 'BON_A_ENLEVER'];
    const typesPresents = dossier.Document.map((d) => d.type.toUpperCase());
    const manquants = typesRequis.filter((t) => !typesPresents.includes(t));

    if (manquants.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de clôturer : documents manquants (${manquants.join(', ')}).`
      });
    }

    const userId = req.user?.sub;
    const userNom = req.user ? `${req.user.firstName} ${req.user.lastName}` : null;
    const ancienStatut = dossier.statut;

    const updated = await prisma.dossier.update({
      where: { id },
      data: { statut: 'LIVRE', dateLivraison: new Date() }
    });

    await logHistorique(id, 'Dossier clôturé', userId, userNom, null, ancienStatut, 'LIVRE');

    return res.json({ success: true, message: 'Dossier clôturé.', data: { dossier: updated } });
  } catch (err) {
    logger.error('Erreur clôture dossier', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── HISTORIQUE D'UN DOSSIER ──────────────────────────────────────────────────────
const getHistorique = async (req, res) => {
  try {
    const { id } = req.params;
    const historique = await prisma.historiqueDossier.findMany({
      where: { dossierId: id },
      orderBy: { createdAt: 'asc' }
    });
    return res.json({ success: true, data: { historique } });
  } catch (err) {
    logger.error('Erreur historique dossier', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

module.exports = {
  creerDossier,
  listerDossiers,
  getDossier,
  prendreEnCharge,
  rejeterDossier,
  demanderDocuments,
  majTraitement,
  uploaderDocument,
  listerDocuments,
  ajouterNote,
  listerNotes,
  cloturerDossier,
  getHistorique
};
