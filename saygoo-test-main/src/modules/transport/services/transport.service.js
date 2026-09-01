// src/modules/transport/services/transport.service.js
const logger = require('../../../utils/logger');

// Tarifs par type de camion
const TARIFS_CAMION = {
  LEGER:       { coutKm: 500,  consommation: 0.15, capacite: 3  },
  MOYEN:       { coutKm: 800,  consommation: 0.25, capacite: 10 },
  LOURD:       { coutKm: 1200, consommation: 0.35, capacite: 20 },
  SEMI_REMORQUE:{ coutKm: 1500, consommation: 0.40, capacite: 35 },
};

// Prix carburant FCFA/L
const PRIX_GASOIL = 695;

// Taux d'assurance par niveau de risque
const TAUX_RISQUE = { faible: 0.005, moyen: 0.01, eleve: 0.02 };

// Calcul du facteur temps selon conditions
const calculerFacteurTemps = (conditions = {}) => {
  let facteur = 1;
  if (conditions.nuit)   facteur += 0.10;
  if (conditions.pluie)  facteur += 0.15;
  if (conditions.chaleur) facteur += 0.05;
  if (conditions.weekend) facteur += 0.08;
  return parseFloat(facteur.toFixed(2));
};

// Calcul du coût carbone
const calculerCoutCarbone = (distanceKm, prixCarboneKg = 75) => {
  const facteurCO2 = 0.8; // kg CO2 par km (camion moyen)
  return Math.round(distanceKm * facteurCO2 * prixCarboneKg);
};

// Simulation complète
const simuler = (donnees) => {
  const {
    depart,
    destination,
    distanceKm,
    typeCamion = 'MOYEN',
    poidsTonnes,
    valeurMarchandise,
    niveauRisque = 'moyen',
    conditions = {},
    prixCarboneKg = 75,
    capaciteEssieu = 5,
  } = donnees;

  if (!distanceKm || distanceKm <= 0) {
    throw { statusCode: 400, message: 'Distance invalide' };
  }
  if (!poidsTonnes || poidsTonnes <= 0) {
    throw { statusCode: 400, message: 'Poids invalide' };
  }

  const tarif = TARIFS_CAMION[typeCamion] || TARIFS_CAMION.MOYEN;

  // 1. Facteur temps
  const facteurTemps = calculerFacteurTemps(conditions);

  // 2. Transport de base
  const coutTransportBase = Math.round(distanceKm * tarif.coutKm * facteurTemps);

  // 3. Carburant
  const coutCarburant = Math.round(distanceKm * tarif.consommation * PRIX_GASOIL);

  // 4. Poids (tonnage)
  const tarifTonne = 3000;
  const coutPoids = Math.round(poidsTonnes * tarifTonne);

  // 5. Charge à l'essieu
  const coefUsure = 2000;
  const coutEssieu = Math.round((poidsTonnes / capaciteEssieu) * coefUsure);

  // 6. Assurance
  const tauxAssurance = TAUX_RISQUE[niveauRisque] || TAUX_RISQUE.moyen;
  const coutAssurance = valeurMarchandise
    ? Math.round(valeurMarchandise * tauxAssurance)
    : 0;

  // 7. Carbone
  const coutCarbone = calculerCoutCarbone(distanceKm, prixCarboneKg);

  // Total
  const coutTotal = coutTransportBase + coutCarburant + coutPoids
                  + coutEssieu + coutAssurance + coutCarbone;

  // Prix recommandé avec marge SAYGOO 15%
  const prixRecommande = Math.round(coutTotal * 1.15);

  // ETA estimé (vitesse moyenne 60 km/h)
  const dureeHeures = parseFloat((distanceKm / 60).toFixed(1));
  const dureeJours = parseFloat((dureeHeures / 8).toFixed(1));

  logger.info(`Simulation transport : ${depart} → ${destination} | ${distanceKm}km | Total: ${coutTotal} FCFA`);

  return {
    trajet: { depart, destination, distanceKm },
    camion: { type: typeCamion, ...tarif },
    conditions: { ...conditions, facteurTemps },
    detail: {
      coutTransportBase,
      coutCarburant,
      coutPoids,
      coutEssieu,
      coutAssurance,
      coutCarbone,
    },
    totaux: {
      coutTotal,
      prixRecommande,
      margeService: prixRecommande - coutTotal,
    },
    eta: {
      dureeHeures,
      dureeJours,
      unite: dureeJours >= 1 ? `${dureeJours} jour(s)` : `${dureeHeures} heure(s)`,
    },
  };
};

// Comparaison multi-camions
const comparerCamions = (donnees) => {
  const resultats = Object.keys(TARIFS_CAMION).map((typeCamion) => {
    try {
      const simulation = simuler({ ...donnees, typeCamion });
      return {
        typeCamion,
        capaciteTonnes: TARIFS_CAMION[typeCamion].capacite,
        ...simulation.totaux,
        eta: simulation.eta,
        adapte: donnees.poidsTonnes <= TARIFS_CAMION[typeCamion].capacite,
      };
    } catch {
      return null;
    }
  }).filter(Boolean);

  // Recommandation : camion adapté le moins cher
  const camionsAdaptes = resultats.filter(r => r.adapte);
  const recommande = camionsAdaptes.length > 0
    ? camionsAdaptes.reduce((min, r) => r.coutTotal < min.coutTotal ? r : min)
    : null;

  return { resultats, recommande };
};

// Calcul de distance approximative entre villes togolaises (km)
const distancesVilles = {
  'lome-kara':      420,
  'lome-sokode':    330,
  'lome-atakpame':  160,
  'lome-kpalime':   120,
  'lome-tsevie':     35,
  'lome-notse':      99,
  'lome-vogan':      55,
  'lome-aneho':      45,
  'kara-dapaong':   193,
  'kara-sokode':     90,
  'atakpame-sokode': 170,
};

const obtenirDistance = (depart, destination) => {
  const cle1 = `${depart.toLowerCase()}-${destination.toLowerCase()}`;
  const cle2 = `${destination.toLowerCase()}-${depart.toLowerCase()}`;

  const distance = distancesVilles[cle1] || distancesVilles[cle2];

  if (!distance) {
    throw {
      statusCode: 404,
      message: `Distance entre ${depart} et ${destination} non disponible. Fournissez distanceKm manuellement.`,
    };
  }

  return { depart, destination, distanceKm: distance };
};

module.exports = { simuler, comparerCamions, obtenirDistance, TARIFS_CAMION };