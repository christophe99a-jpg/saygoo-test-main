const prisma = require('../config/prisma');
const { generateReference } = require('../utils/reference');
const logger = require('../utils/logger');

// ── CRÉER UNE LIVRAISON ───────────────────────────────────────────────────────
const creerLivraison = async (req, res) => {
  try {
    const {
      dossierId, dossierRef, clientId, clientNom,
      clientTel, clientAdresse, transporteurId,
      transporteurNom, transporteurTel, typeVehicule,
      immatriculation, adresseDepart, adresseArrivee,
      latitudeDepart, longitudeDepart,
      latitudeArrivee, longitudeArrivee,
      dateLivraisonPrevue, notes
    } = req.body;

    const reference = await generateReference();

    const livraison = await prisma.livraison.create({
      data: {
        reference,
        dossierId,
        dossierRef,
        clientId,
        clientNom,
        clientTel,
        clientAdresse,
        transporteurId,
        transporteurNom,
        transporteurTel,
        typeVehicule,
        immatriculation,
        adresseDepart,
        adresseArrivee,
        latitudeDepart: latitudeDepart ? parseFloat(latitudeDepart) : null,
        longitudeDepart: longitudeDepart ? parseFloat(longitudeDepart) : null,
        latitudeArrivee: latitudeArrivee ? parseFloat(latitudeArrivee) : null,
        longitudeArrivee: longitudeArrivee ? parseFloat(longitudeArrivee) : null,
        dateLivraisonPrevue: dateLivraisonPrevue ? new Date(dateLivraisonPrevue) : null,
        notes,
        organisationId: req.user.orgId
      },
      include: {
        historique: true,
        positions: true
      }
    });

    // Historique initial
    await prisma.historiqueLivraison.create({
      data: {
        livraisonId: livraison.id,
        statut: 'EN_ATTENTE',
        description: `Livraison créée par ${req.user.firstName} ${req.user.lastName}`,
        userId: req.user.sub,
        userNom: `${req.user.firstName} ${req.user.lastName}`
      }
    });

    logger.info('Livraison créée', { reference, userId: req.user.sub });

    return res.status(201).json({
      success: true,
      message: `Livraison ${reference} créée avec succès.`,
      data: { livraison }
    });
  } catch (err) {
    logger.error('Erreur création livraison', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── LISTE DES LIVRAISONS ──────────────────────────────────────────────────────
const listerLivraisons = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, statut,
      clientId, transporteurId, dateDebut, dateFin
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (statut) where.statut = statut;
    if (clientId) where.clientId = clientId;
    if (transporteurId) where.transporteurId = transporteurId;
    if (req.user.orgId) where.organisationId = req.user.orgId;

    if (dateDebut || dateFin) {
      where.createdAt = {};
      if (dateDebut) where.createdAt.gte = new Date(dateDebut);
      if (dateFin) where.createdAt.lte = new Date(dateFin);
    }

    const [livraisons, total] = await Promise.all([
      prisma.livraison.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          historique: { orderBy: { createdAt: 'desc' }, take: 1 },
          positions: { orderBy: { createdAt: 'desc' }, take: 1 }
        }
      }),
      prisma.livraison.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        livraisons,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    logger.error('Erreur liste livraisons', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DÉTAIL D'UNE LIVRAISON ────────────────────────────────────────────────────
const getLivraison = async (req, res) => {
  try {
    const { id } = req.params;

    const livraison = await prisma.livraison.findUnique({
      where: { id },
      include: {
        historique: { orderBy: { createdAt: 'desc' } },
        positions: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    });

    if (!livraison) {
      return res.status(404).json({ success: false, message: 'Livraison non trouvée.' });
    }

    return res.json({ success: true, data: { livraison } });
  } catch (err) {
    logger.error('Erreur get livraison', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── TRACKING PAR RÉFÉRENCE (public) ──────────────────────────────────────────
const trackerLivraison = async (req, res) => {
  try {
    const { reference } = req.params;

    const livraison = await prisma.livraison.findUnique({
      where: { reference },
      select: {
        reference: true,
        clientNom: true,
        statut: true,
        adresseDepart: true,
        adresseArrivee: true,
        latitudeActuelle: true,
        longitudeActuelle: true,
        dateEnlevement: true,
        dateLivraisonPrevue: true,
        dateLivraisonReelle: true,
        transporteurNom: true,
        typeVehicule: true,
        historique: {
          orderBy: { createdAt: 'desc' },
          select: {
            statut: true,
            description: true,
            createdAt: true
          }
        }
      }
    });

    if (!livraison) {
      return res.status(404).json({ success: false, message: 'Livraison non trouvée.' });
    }

    return res.json({ success: true, data: { livraison } });
  } catch (err) {
    logger.error('Erreur tracking livraison', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── CHANGER STATUT ────────────────────────────────────────────────────────────
const changerStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, description, latitude, longitude } = req.body;

    const STATUTS_VALIDES = ['EN_ATTENTE', 'ENLEVE', 'EN_TRANSIT', 'EN_LIVRAISON', 'LIVRE', 'ECHEC', 'RETOURNE'];
    if (!STATUTS_VALIDES.includes(statut)) {
      return res.status(400).json({ success: false, message: 'Statut invalide.' });
    }

    const livraison = await prisma.livraison.findUnique({ where: { id } });
    if (!livraison) {
      return res.status(404).json({ success: false, message: 'Livraison non trouvée.' });
    }

    const data = { statut };
    if (statut === 'ENLEVE') data.dateEnlevement = new Date();
    if (statut === 'LIVRE') data.dateLivraisonReelle = new Date();
    if (latitude) data.latitudeActuelle = parseFloat(latitude);
    if (longitude) data.longitudeActuelle = parseFloat(longitude);

    const updated = await prisma.livraison.update({
      where: { id },
      data,
      include: {
        historique: { orderBy: { createdAt: 'desc' }, take: 5 }
      }
    });

    await prisma.historiqueLivraison.create({
      data: {
        livraisonId: id,
        statut,
        description: description || `Statut changé vers ${statut}`,
        userId: req.user.sub,
        userNom: `${req.user.firstName} ${req.user.lastName}`,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      }
    });

    logger.info('Statut livraison changé', { id, statut, userId: req.user.sub });

    return res.json({
      success: true,
      message: `Statut changé vers ${statut}.`,
      data: { livraison: updated }
    });
  } catch (err) {
    logger.error('Erreur changement statut', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── METTRE À JOUR POSITION GPS ────────────────────────────────────────────────
const updatePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, vitesse, cap, precision } = req.body;

    const livraison = await prisma.livraison.findUnique({ where: { id } });
    if (!livraison) {
      return res.status(404).json({ success: false, message: 'Livraison non trouvée.' });
    }

    // Enregistrer la position
    await prisma.positionGPS.create({
      data: {
        livraisonId: id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        vitesse: vitesse ? parseFloat(vitesse) : null,
        cap: cap ? parseFloat(cap) : null,
        precision: precision ? parseFloat(precision) : null
      }
    });

    // Mettre à jour position actuelle
    await prisma.livraison.update({
      where: { id },
      data: {
        latitudeActuelle: parseFloat(latitude),
        longitudeActuelle: parseFloat(longitude)
      }
    });

    return res.json({
      success: true,
      message: 'Position mise à jour.',
      data: { latitude, longitude }
    });
  } catch (err) {
    logger.error('Erreur update position', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PREUVE DE LIVRAISON ───────────────────────────────────────────────────────
const enregistrerPreuve = async (req, res) => {
  try {
    const { id } = req.params;
    const { preuveLivraison, notes } = req.body;

    const livraison = await prisma.livraison.findUnique({ where: { id } });
    if (!livraison) {
      return res.status(404).json({ success: false, message: 'Livraison non trouvée.' });
    }

    const updated = await prisma.livraison.update({
      where: { id },
      data: {
        preuveLivraison,
        statut: 'LIVRE',
        dateLivraisonReelle: new Date(),
        notes
      }
    });

    await prisma.historiqueLivraison.create({
      data: {
        livraisonId: id,
        statut: 'LIVRE',
        description: 'Preuve de livraison enregistrée',
        userId: req.user.sub,
        userNom: `${req.user.firstName} ${req.user.lastName}`
      }
    });

    logger.info('Preuve livraison enregistrée', { id, userId: req.user.sub });

    return res.json({
      success: true,
      message: 'Preuve de livraison enregistrée.',
      data: { livraison: updated }
    });
  } catch (err) {
    logger.error('Erreur preuve livraison', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── STATISTIQUES ──────────────────────────────────────────────────────────────
const getStatistiques = async (req, res) => {
  try {
    const where = {};
    if (req.user.orgId) where.organisationId = req.user.orgId;

    const [total, enAttente, enleve, enTransit, livre, echec] =
      await Promise.all([
        prisma.livraison.count({ where }),
        prisma.livraison.count({ where: { ...where, statut: 'EN_ATTENTE' } }),
        prisma.livraison.count({ where: { ...where, statut: 'ENLEVE' } }),
        prisma.livraison.count({ where: { ...where, statut: 'EN_TRANSIT' } }),
        prisma.livraison.count({ where: { ...where, statut: 'LIVRE' } }),
        prisma.livraison.count({ where: { ...where, statut: 'ECHEC' } })
      ]);

    const tauxLivraison = total > 0
      ? ((livre / total) * 100).toFixed(2)
      : 0;

    return res.json({
      success: true,
      data: {
        statistiques: {
          total,
          parStatut: { enAttente, enleve, enTransit, livre, echec },
          tauxLivraison: `${tauxLivraison}%`
        }
      }
    });
  } catch (err) {
    logger.error('Erreur statistiques', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  creerLivraison,
  listerLivraisons,
  getLivraison,
  trackerLivraison,
  changerStatut,
  updatePosition,
  enregistrerPreuve,
  getStatistiques
};