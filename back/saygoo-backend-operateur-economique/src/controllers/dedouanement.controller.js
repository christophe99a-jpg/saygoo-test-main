const cdaClient = require('../services/cdaClient');
const logger = require('../utils/logger');

// Mappe le type d'opération du formulaire vers le régime douanier CDA
const mapRegimeDouanier = (typeOperation) => {
  switch (typeOperation) {
    case 'IMPORT':
      return 'IM4';
    case 'EXPORT':
      return 'EXPORT';
    case 'TRANSIT':
      return 'TRANSIT';
    default:
      return 'IM4';
  }
};

// Déduit le type de marchandise à partir de ce que l'opérateur a saisi.
const mapTypeMarchandise = (data) => {
  if (data.typeMarchandise) return data.typeMarchandise;
  if (data.nombreConteneurs && String(data.tailleConteneur) === '40') return 'CONTENEUR_40';
  if (data.nombreConteneurs) return 'CONTENEUR_20';
  if (data.nombreColis) return 'COLIS';
  return 'AUTRE';
};

const nombreOuUndefined = (valeur) => {
  const n = Number(valeur);
  return Number.isFinite(n) && valeur !== '' && valeur !== null ? n : undefined;
};

// ── SOUMETTRE UNE NOUVELLE DEMANDE DE DÉDOUANEMENT ─────────────────────────────
const creerDemande = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const {
      typeOperation,
      reference,
      paysOrigine,
      portChargement,
      destinationFinale,
      natureMarchandise,
      nombreColis,
      nombreConteneurs,
      tailleConteneur,
      poidsBrut,
      valeurCaf,
      valeurFob,
      hsCode,
      modeTransport,
      distanceKm,
      lienGeolocalisation,
      co2EstimeKg,
      modePaiement,
      paiementFractionne,
      servicesGMS,
      observations,
    } = req.body;

    if (!typeOperation || !natureMarchandise) {
      return res.status(400).json({
        success: false,
        message: "Le type d'opération et la nature de la marchandise sont obligatoires.",
      });
    }

    const payload = {
      clientId: req.user?.sub,
      clientNom: req.user?.companyName || req.user?.firstName,
      typeMarchandise: mapTypeMarchandise({ nombreConteneurs, tailleConteneur, nombreColis }),
      regimeDouanier: mapRegimeDouanier(typeOperation),
      description: natureMarchandise,
      poids: nombreOuUndefined(poidsBrut),

      // La valeur CAF (Coût, Assurance, Fret) correspond au CIF : c'est la base
      // de calcul des droits de douane, à ne pas confondre avec le FOB, qui
      // exclut assurance et fret.
      valeurCIF: nombreOuUndefined(valeurCaf),
      valeurFOB: nombreOuUndefined(valeurFob),

      numeroConnaissement: reference,
      paysOrigine,
      portEmbarquement: portChargement,
      portDestination: destinationFinale,

      // Données logistiques, désormais stockées dans leurs propres colonnes
      // plutôt que concaténées dans un champ libre : elles redeviennent
      // interrogeables et filtrables.
      codeHS: hsCode,
      nombreConteneurs: nombreOuUndefined(nombreConteneurs),
      modeTransport,
      distanceKm: nombreOuUndefined(distanceKm),
      lienGeolocalisation,
      co2EstimeKg: nombreOuUndefined(co2EstimeKg),

      modePaiement,
      paiementFractionne: Boolean(paiementFractionne),
      servicesGMS: Array.isArray(servicesGMS) ? servicesGMS : undefined,

      observations,
      organisationId: req.user?.organisationId,
    };

    const result = await cdaClient.creerDossier(payload, token);

    logger.info('Demande de dédouanement soumise au CDA', {
      reference: result.data?.dossier?.reference,
    });

    return res.status(201).json({
      success: true,
      message: `Demande envoyée. Référence : ${result.data?.dossier?.reference}. Le CDA sera notifié automatiquement.`,
      data: result.data,
    });
  } catch (err) {
    logger.error('Erreur soumission dédouanement', { err: err.message });
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── TABLEAU DE BORD : mes demandes de dédouanement ─────────────────────────────
const listerMesDemandes = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { search, statut } = req.query;

    const result = await cdaClient.listerDossiers(req.user?.sub, { search, statut }, token);

    return res.json(result);
  } catch (err) {
    logger.error('Erreur liste demandes dédouanement', { err: err.message });
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── SUIVI D'UNE DEMANDE ──────────────────────────────────────────────────────────
const getDemande = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const result = await cdaClient.getDossier(req.params.id, token);

    // Sécurité : un opérateur ne doit voir que ses propres dossiers.
    if (result.data?.dossier?.clientId !== req.user?.sub) {
      return res.status(403).json({ success: false, message: 'Accès refusé à ce dossier.' });
    }

    return res.json(result);
  } catch (err) {
    logger.error('Erreur détail demande dédouanement', { err: err.message });
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── AJOUTER UN DOCUMENT À UNE DEMANDE ────────────────────────────────────────────
const ajouterDocument = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { type, nom, url } = req.body;

    const result = await cdaClient.ajouterDocument(req.params.id, { type, nom, url }, token);

    return res.status(201).json(result);
  } catch (err) {
    logger.error('Erreur ajout document dédouanement', { err: err.message });
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

module.exports = { creerDemande, listerMesDemandes, getDemande, ajouterDocument };
