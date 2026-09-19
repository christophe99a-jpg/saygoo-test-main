const cdaClient = require('../services/cdaClient');
const entrepotClient = require('../services/entrepotClient');
const vehiculeClient = require('../services/vehiculeClient');
const logger = require('../utils/logger');

const getToken = (req) => req.headers.authorization?.split(' ')[1];

// Normalise les statuts hétérogènes des 3 services vers un statut global commun
const normaliserStatut = (statut) => {
  const termines = ['LIVRE', 'CLOTURE', 'LIBERE', 'TERMINE'];
  const annules = ['ANNULE', 'REFUSE', 'REJETE'];
  const attente = ['EN_ATTENTE', 'NOUVEAU', 'CONFIRME'];

  if (termines.includes(statut)) return 'TERMINE';
  if (annules.includes(statut)) return 'ANNULE';
  if (attente.includes(statut)) return 'EN_ATTENTE';
  return 'EN_COURS';
};

// ── SUIVI CENTRALISÉ : toutes mes demandes, tous services confondus ────────────
const getSuiviGlobal = async (req, res) => {
  try {
    const token = getToken(req);
    const clientId = req.user?.sub;

    // Les 3 services sont interrogés en parallèle ; si l'un tombe, les autres
    // restent affichés (résultat partiel plutôt qu'une erreur globale).
    const [resDedouanement, resStockage, resVehicules] = await Promise.allSettled([
      cdaClient.listerDossiers(clientId, {}, token),
      entrepotClient.listerDemandesStockage(clientId, {}, token),
      vehiculeClient.listerMesAchats(token),
    ]);

    const demandes = [];
    const servicesIndisponibles = [];

    // Dédouanement
    if (resDedouanement.status === 'fulfilled') {
      const dossiers = resDedouanement.value?.data?.dossiers || [];
      for (const d of dossiers) {
        demandes.push({
          type: 'DEDOUANEMENT',
          id: d.id,
          reference: d.reference,
          libelle: d.description || d.typeMarchandise,
          statut: d.statut,
          statutGlobal: normaliserStatut(d.statut),
          date: d.createdAt,
        });
      }
    } else {
      servicesIndisponibles.push('Dédouanement');
      logger.warn('Suivi global : service dédouanement indisponible');
    }

    // Stockage
    if (resStockage.status === 'fulfilled') {
      const stockages = resStockage.value || [];
      for (const s of stockages) {
        demandes.push({
          type: 'STOCKAGE',
          id: s.id,
          reference: s.reference,
          libelle: s.marchandise,
          statut: s.statut,
          statutGlobal: normaliserStatut(s.statut),
          date: s.createdAt,
        });
      }
    } else {
      servicesIndisponibles.push('Stockage');
      logger.warn('Suivi global : service stockage indisponible');
    }

    // Véhicules
    if (resVehicules.status === 'fulfilled') {
      const achats = resVehicules.value?.data?.achats || [];
      for (const a of achats) {
        demandes.push({
          type: 'VEHICULE',
          id: a.id,
          reference: a.reference,
          libelle: a.vehicule ? `${a.vehicule.marque} ${a.vehicule.modele}` : 'Véhicule',
          statut: a.statut,
          statutGlobal: normaliserStatut(a.statut),
          date: a.createdAt,
        });
      }
    } else {
      servicesIndisponibles.push('Véhicules');
      logger.warn('Suivi global : service véhicules indisponible');
    }

    // Tri chronologique inverse (plus récent en premier)
    demandes.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Compteurs pour le tableau de bord
    const resume = {
      total: demandes.length,
      enAttente: demandes.filter((d) => d.statutGlobal === 'EN_ATTENTE').length,
      enCours: demandes.filter((d) => d.statutGlobal === 'EN_COURS').length,
      termine: demandes.filter((d) => d.statutGlobal === 'TERMINE').length,
      annule: demandes.filter((d) => d.statutGlobal === 'ANNULE').length,
    };

    return res.json({
      success: true,
      data: {
        resume,
        demandes,
        ...(servicesIndisponibles.length > 0 && {
          avertissement: `Données partielles — service(s) momentanément indisponible(s) : ${servicesIndisponibles.join(', ')}.`,
        }),
      },
    });
  } catch (err) {
    logger.error('Erreur suivi global', { err: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getSuiviGlobal };