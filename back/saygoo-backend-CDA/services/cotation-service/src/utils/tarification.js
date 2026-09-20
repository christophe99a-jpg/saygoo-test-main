// ── MOTEUR DE TARIFICATION TRANSPORT SAYGOO ─────────────────────────────────────
// Barème officiel : honoraires par zone / palier de service / taille de conteneur.
// Les montants sont ceux du tableau de référence SAYGOO (en XOF), et non des
// valeurs recalculées par coefficient : les ratios réels varient d'une zone à
// l'autre, la grille fait donc foi.

const BAREME = {
  MARITIME: {
    libelle: 'Maritime (Lomé)',
    zone: 'A',
    distanceMin: 0,
    distanceMax: 80,
    tempsEstime: '2 à 4 h',
    tarifs: {
      STANDARD: { '20': 50000, '40': 70000 },
      PLUS: { '20': 60000, '40': 84000 },
      GREEN: { '20': 65000, '40': 91000 },
    },
  },
  PLATEAUX: {
    libelle: 'Plateaux',
    zone: 'B',
    distanceMin: 81,
    distanceMax: 250,
    tempsEstime: '4 à 8 h',
    tarifs: {
      STANDARD: { '20': 75000, '40': 105000 },
      PLUS: { '20': 85000, '40': 119000 },
      GREEN: { '20': 95000, '40': 133000 },
    },
  },
  CENTRALE: {
    libelle: 'Centrale',
    zone: 'C',
    distanceMin: 251,
    distanceMax: 450,
    tempsEstime: '8 à 12 h',
    tarifs: {
      STANDARD: { '20': 100000, '40': 140000 },
      PLUS: { '20': 115000, '40': 161000 },
      GREEN: { '20': 125000, '40': 175000 },
    },
  },
  KARA: {
    libelle: 'Kara',
    zone: 'D',
    distanceMin: 451,
    distanceMax: 650,
    tempsEstime: '12 à 16 h',
    tarifs: {
      STANDARD: { '20': 125000, '40': 175000 },
      PLUS: { '20': 145000, '40': 203000 },
      GREEN: { '20': 160000, '40': 224000 },
    },
  },
  SAVANES: {
    libelle: 'Savanes',
    zone: 'E',
    distanceMin: 651,
    distanceMax: 750,
    tempsEstime: '16 à 20 h',
    tarifs: {
      STANDARD: { '20': 150000, '40': 210000 },
      PLUS: { '20': 175000, '40': 245000 },
      GREEN: { '20': 190000, '40': 266000 },
    },
  },
  COTONOU: {
    libelle: 'Cotonou (Bénin)',
    zone: 'B',
    distanceMin: 140,
    distanceMax: 170,
    tempsEstime: '4 à 6 h',
    tarifs: {
      STANDARD: { '20': 80000, '40': 112000 },
      PLUS: { '20': 95000, '40': 133000 },
      GREEN: { '20': 105000, '40': 147000 },
    },
  },
  ACCRA_TEMA: {
    libelle: 'Accra / Tema (Ghana)',
    zone: 'B',
    distanceMin: 190,
    distanceMax: 220,
    tempsEstime: '5 à 7 h',
    tarifs: {
      STANDARD: { '20': 100000, '40': 140000 },
      PLUS: { '20': 120000, '40': 168000 },
      GREEN: { '20': 135000, '40': 189000 },
    },
  },
  OUAGADOUGOU: {
    libelle: 'Ouagadougou (Burkina Faso)',
    zone: 'F',
    distanceMin: 1050,
    distanceMax: 1050,
    tempsEstime: '24 h',
    tarifs: {
      STANDARD: { '20': 180000, '40': 252000 },
      PLUS: { '20': 210000, '40': 294000 },
      GREEN: { '20': 230000, '40': 322000 },
    },
  },
  ABIDJAN: {
    libelle: 'Abidjan (Côte d\'Ivoire)',
    zone: 'E',
    distanceMin: 750,
    distanceMax: 750,
    tempsEstime: '18 à 24 h',
    tarifs: {
      STANDARD: { '20': 200000, '40': 280000 },
      PLUS: { '20': 230000, '40': 322000 },
      GREEN: { '20': 255000, '40': 357000 },
    },
  },
  NIAMEY: {
    libelle: 'Niamey (Niger)',
    zone: 'F',
    distanceMin: 1250,
    distanceMax: 1250,
    tempsEstime: '30 à 36 h',
    tarifs: {
      STANDARD: { '20': 250000, '40': 350000 },
      PLUS: { '20': 290000, '40': 406000 },
      GREEN: { '20': 320000, '40': 448000 },
    },
  },
  BAMAKO: {
    libelle: 'Bamako (Mali)',
    zone: 'G',
    distanceMin: 1900,
    distanceMax: 1900,
    tempsEstime: '48 à 60 h',
    tarifs: {
      STANDARD: { '20': 350000, '40': 490000 },
      PLUS: { '20': 400000, '40': 560000 },
      GREEN: { '20': 450000, '40': 630000 },
    },
  },
};

// Coefficient de capacité / type de cargaison (formule universelle H = Hb × Kc)
const COEFFICIENTS_CARGAISON = {
  CONTENEUR_20: 1.0,
  CONTENEUR_40: 1.4,
  CONTENEUR_40_HC: 1.45,
  PORTE_CHAR: 2.15, // fourchette 1,80 à 2,50 — valeur médiane retenue
  CITERNE: 1.6,
  FRIGORIFIQUE: 1.7,
};

const PALIERS = ['STANDARD', 'PLUS', 'GREEN'];

const DESCRIPTIONS_PALIERS = {
  STANDARD: ['Transport de la marchandise'],
  PLUS: [
    'Transport de la marchandise',
    'Suivi administratif',
    'Assurance transport',
    'Confirmation de livraison',
    'Alertes automatiques (départ, frontière, arrivée)',
    'Centre de support dédié',
    'Tableau de bord de suivi',
    'Transporteur certifié',
    'Géolocalisation temps réel',
  ],
  GREEN: [
    'Transport de la marchandise',
    'Suivi administratif',
    'Assurance transport',
    'Confirmation de livraison',
    'Alertes automatiques (départ, frontière, arrivée)',
    'Centre de support dédié',
    'Tableau de bord de suivi',
    'Transporteur certifié',
    'Géolocalisation temps réel',
    'Calcul automatique des émissions CO2',
    'Priorité aux transporteurs à faible consommation',
    'Optimisation de fret',
    'Certificat d\'empreinte carbone',
    'Reporting ESG',
  ],
};

/**
 * Calcule les honoraires d'une destination pour un palier donné.
 * H = Hb × Kc  (Hb = honoraires de base de la zone, Kc = coefficient cargaison)
 *
 * Quand le type de cargaison est un conteneur standard (20/40), le tarif de la
 * grille est utilisé tel quel — il intègre déjà la taille. Le coefficient ne
 * s'applique qu'aux cargaisons particulières (citerne, frigo, hors gabarit),
 * calculées à partir du tarif 20 pieds de la zone.
 */
const calculerHonoraires = (destination, palier, typeCargaison) => {
  const zone = BAREME[destination];
  if (!zone) {
    throw new Error(`Destination inconnue : ${destination}`);
  }
  if (!PALIERS.includes(palier)) {
    throw new Error(`Palier inconnu : ${palier}. Valeurs possibles : ${PALIERS.join(', ')}`);
  }

  const coefficient = COEFFICIENTS_CARGAISON[typeCargaison];
  if (coefficient === undefined) {
    throw new Error(
      `Type de cargaison inconnu : ${typeCargaison}. Valeurs possibles : ${Object.keys(COEFFICIENTS_CARGAISON).join(', ')}`,
    );
  }

  const tarifs = zone.tarifs[palier];
  let montant;
  let base;

  if (typeCargaison === 'CONTENEUR_20') {
    base = tarifs['20'];
    montant = base;
  } else if (typeCargaison === 'CONTENEUR_40') {
    base = tarifs['40'];
    montant = base;
  } else {
    // Cargaisons particulières : on part du tarif 20 pieds et on applique Kc
    base = tarifs['20'];
    montant = Math.round(base * coefficient);
  }

  return {
    destination,
    libelle: zone.libelle,
    zone: zone.zone,
    palier,
    typeCargaison,
    coefficient,
    honorairesBase: base,
    montant,
    devise: 'XOF',
    tempsEstime: zone.tempsEstime,
    distanceKm: zone.distanceMax,
    servicesInclus: DESCRIPTIONS_PALIERS[palier],
  };
};

/**
 * Comparatif des 3 paliers pour une même destination et cargaison.
 * Sert à l'écran de choix Standard / Plus / Green de l'opérateur économique.
 */
const comparerPaliers = (destination, typeCargaison) =>
  PALIERS.map((palier) => calculerHonoraires(destination, palier, typeCargaison));

/**
 * Formule complète SAYGOO Green Transport (coût de revient détaillé) :
 *   CT = ((D × Cg) / 100 × Cc) + (T × Ch) + Ht + Am + Fr
 *
 * D  = distance (km)                     Cg = consommation moyenne (L/100 km)
 * Cc = prix du gasoil (XOF/L)            T  = temps de transport (heures)
 * Ch = coût horaire d'exploitation       Ht = honoraires / marge transporteur
 * Am = prime d'assurance marchandises    Fr = frais de route (péages, escortes...)
 *
 * La consommation est exprimée aux 100 km, comme sur les fiches techniques
 * des véhicules : d'où la division par 100. Exemple de référence :
 *   ((350 km × 25 L/100km) / 100) × 766 XOF = 67 025 XOF
 *
 * Cette formule sert au calcul de revient réel, distinct du barème commercial
 * ci-dessus qui est le prix affiché au client.
 */
const calculerCoutTotal = ({
  distanceKm,
  consommationLitreCent,
  prixGasoilParLitre,
  tempsHeures,
  coutHoraire,
  honorairesTransporteur = 0,
  primeAssurance = 0,
  fraisRoute = 0,
}) => {
  const champsRequis = { distanceKm, consommationLitreCent, prixGasoilParLitre, tempsHeures, coutHoraire };
  for (const [cle, valeur] of Object.entries(champsRequis)) {
    if (valeur === undefined || valeur === null || isNaN(valeur)) {
      throw new Error(`Le champ ${cle} est obligatoire et doit être numérique.`);
    }
  }

  const coutCarburant = ((distanceKm * consommationLitreCent) / 100) * prixGasoilParLitre;
  const coutExploitation = tempsHeures * coutHoraire;
  const coutTotal = coutCarburant + coutExploitation + honorairesTransporteur + primeAssurance + fraisRoute;

  return {
    detail: {
      coutCarburant: Math.round(coutCarburant),
      coutExploitation: Math.round(coutExploitation),
      honorairesTransporteur,
      primeAssurance,
      fraisRoute,
    },
    coutTotal: Math.round(coutTotal),
    devise: 'XOF',
  };
};

/**
 * Estimation des émissions CO2 (palier Green).
 * Facteur d'émission du gasoil : 2,68 kg de CO2 par litre brûlé.
 */
const FACTEUR_CO2_GASOIL = 2.68;

const calculerEmissionsCO2 = (distanceKm, consommationLitreCent) => {
  if (!distanceKm || !consommationLitreCent) {
    throw new Error('La distance et la consommation sont obligatoires pour le calcul CO2.');
  }

  // Consommation aux 100 km, cohérente avec calculerCoutTotal.
  const litresConsommes = (distanceKm * consommationLitreCent) / 100;
  const emissionsKg = litresConsommes * FACTEUR_CO2_GASOIL;

  return {
    distanceKm,
    litresConsommes: Math.round(litresConsommes * 100) / 100,
    emissionsKgCO2: Math.round(emissionsKg * 100) / 100,
    facteurEmission: FACTEUR_CO2_GASOIL,
  };
};

module.exports = {
  BAREME,
  COEFFICIENTS_CARGAISON,
  PALIERS,
  DESCRIPTIONS_PALIERS,
  calculerHonoraires,
  comparerPaliers,
  calculerCoutTotal,
  calculerEmissionsCO2,
};