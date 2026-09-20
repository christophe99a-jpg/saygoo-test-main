// ─────────────────────────────────────────────────────────────────────────────
// Moteur de calculs douaniers SAYGOO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule la valeur CIF
 * CIF = FOB + Fret + Assurance
 */
const calculerCIF = (fob, fret, assurance) => {
    return parseFloat(fob || 0) + parseFloat(fret || 0) + parseFloat(assurance || 0);
  };
  
  /**
   * Calcule l'assurance
   * Assurance = FOB x Taux assurance
   */
  const calculerAssurance = (fob, taux = 0.005) => {
    return parseFloat(fob || 0) * taux;
  };
  
  /**
   * Calcule les droits de douane
   * DD = CIF x Taux douanier
   */
  const calculerDroitsDouane = (cif, tauxDouane) => {
    return parseFloat(cif || 0) * parseFloat(tauxDouane || 0);
  };
  
  /**
   * Calcule la TVA à l'importation
   * TVA = (CIF + DD + Autres taxes) x Taux TVA
   */
  const calculerTVA = (cif, droitsDouane, autresTaxes = 0, tauxTVA = 0.18) => {
    const base = parseFloat(cif || 0) + parseFloat(droitsDouane || 0) + parseFloat(autresTaxes || 0);
    return base * tauxTVA;
  };
  
  /**
   * Calcule la Redevance Statistique
   * RS = CIF x Taux RS
   */
  const calculerRS = (cif, tauxRS = 0.01) => {
    return parseFloat(cif || 0) * tauxRS;
  };
  
  /**
   * Calcule la Taxe Spéciale sur les Produits
   * TSP = CIF x Taux TSP
   */
  const calculerTSP = (cif, tauxTSP = 0.005) => {
    return parseFloat(cif || 0) * tauxTSP;
  };
  
  /**
   * Calcule le total des droits et taxes
   * TDT = DD + TVA + RS + TSP
   */
  const calculerTotalDroitsTaxes = (droitsDouane, tva, rs, tsp) => {
    return parseFloat(droitsDouane || 0) +
           parseFloat(tva || 0) +
           parseFloat(rs || 0) +
           parseFloat(tsp || 0);
  };
  
  /**
   * Calcule les honoraires CDA
   * Mode FORFAIT : selon type conteneur/véhicule
   * Mode POURCENTAGE : CIF x Taux CDA
   */
  const calculerHonorairesCDA = (params) => {
    const {
      mode, cif, tauxCDA,
      typeMarchandise, typeVehicule,
      nombreConteneurs = 1, nombreVehicules = 1
    } = params;
  
    if (mode === 'POURCENTAGE') {
      return parseFloat(cif || 0) * parseFloat(tauxCDA || 0);
    }
  
    // Mode FORFAIT selon barème SAYGOO
    if (typeMarchandise === 'CONTENEUR_20') {
      return 50000 * nombreConteneurs;
    }
    if (typeMarchandise === 'CONTENEUR_40') {
      return 100000 * nombreConteneurs;
    }
    if (typeMarchandise === 'VEHICULE') {
      const tarifs = {
        CATEGORIE_A: 50000,
        CATEGORIE_B: 70000,
        CATEGORIE_C: 100000
      };
      return (tarifs[typeVehicule] || 50000) * nombreVehicules;
    }
  
    // Autres : pourcentage par défaut 2%
    return parseFloat(cif || 0) * 0.02;
  };
  
  /**
   * Calcule les surestaries (pénalités de retard)
   * P = Nb jours x Tarif jour x Nb conteneurs
   */
  const calculerSurestaries = (nbJours, tarifJour, nbConteneurs = 1) => {
    return parseInt(nbJours || 0) * parseFloat(tarifJour || 0) * parseInt(nbConteneurs || 1);
  };
  
  /**
   * Calcule le poids volumétrique (transport aérien)
   * PV = (L x l x H) / 6000
   */
  const calculerPoidsVolumetrique = (longueur, largeur, hauteur) => {
    return (parseFloat(longueur) * parseFloat(largeur) * parseFloat(hauteur)) / 6000;
  };
  
  /**
   * Calcule le poids taxable
   * PT = max(Poids réel, Poids volumétrique)
   */
  const calculerPoidsTaxable = (poidsReel, poidsVolumetrique) => {
    return Math.max(parseFloat(poidsReel || 0), parseFloat(poidsVolumetrique || 0));
  };
  
  /**
   * Calcule le coût total logistique
   */
  const calculerCoutTotal = (params) => {
    const {
      totalDroitsTaxes, honorairesCDA,
      fraisConsignataire, fraisTransport,
      fraisStockage, fraisManutention, autresFrais
    } = params;
  
    return parseFloat(totalDroitsTaxes || 0) +
           parseFloat(honorairesCDA || 0) +
           parseFloat(fraisConsignataire || 0) +
           parseFloat(fraisTransport || 0) +
           parseFloat(fraisStockage || 0) +
           parseFloat(fraisManutention || 0) +
           parseFloat(autresFrais || 0);
  };
  
  /**
   * Calcule une cotation complète
   */
  const calculerCotationComplete = (params) => {
    const {
      valeurFOB, valeurFret, valeurAssurance,
      tauxDouane, tauxTVA = 0.18, tauxRS = 0.01, tauxTSP = 0.005,
      modeCDA = 'FORFAIT', tauxCDA,
      typeMarchandise, typeVehicule,
      nombreConteneurs = 1, nombreVehicules = 1,
      fraisConsignataire = 0, fraisTransport = 0,
      fraisStockage = 0, fraisManutention = 0, autresFrais = 0
    } = params;
  
    // 1. Valeur CIF
    const valeurCIF = calculerCIF(valeurFOB, valeurFret, valeurAssurance);
  
    // 2. Droits douaniers
    const droitsDouane = calculerDroitsDouane(valeurCIF, tauxDouane);
  
    // 3. Taxes
    const montantTVA = calculerTVA(valeurCIF, droitsDouane, 0, tauxTVA);
    const montantRS  = calculerRS(valeurCIF, tauxRS);
    const montantTSP = calculerTSP(valeurCIF, tauxTSP);
  
    // 4. Total droits & taxes
    const totalDroitsTaxes = calculerTotalDroitsTaxes(
      droitsDouane, montantTVA, montantRS, montantTSP
    );
  
    // 5. Honoraires CDA
    const honorairesCDA = calculerHonorairesCDA({
      mode: modeCDA, cif: valeurCIF, tauxCDA,
      typeMarchandise, typeVehicule,
      nombreConteneurs, nombreVehicules
    });
  
    // 6. Total général
    const totalGeneral = calculerCoutTotal({
      totalDroitsTaxes, honorairesCDA,
      fraisConsignataire, fraisTransport,
      fraisStockage, fraisManutention, autresFrais
    });
  
    return {
      valeurCIF,
      droitsDouane,
      tauxDouane,
      montantTVA,
      tauxTVA,
      montantRS,
      tauxRS,
      montantTSP,
      tauxTSP,
      totalDroitsTaxes,
      honorairesCDA,
      fraisConsignataire: parseFloat(fraisConsignataire),
      fraisTransport: parseFloat(fraisTransport),
      fraisStockage: parseFloat(fraisStockage),
      fraisManutention: parseFloat(fraisManutention),
      autresFrais: parseFloat(autresFrais),
      totalFrais: parseFloat(fraisConsignataire) +
                  parseFloat(fraisTransport) +
                  parseFloat(fraisStockage) +
                  parseFloat(fraisManutention) +
                  parseFloat(autresFrais),
      totalGeneral
    };
  };
  
  module.exports = {
    calculerCIF,
    calculerAssurance,
    calculerDroitsDouane,
    calculerTVA,
    calculerRS,
    calculerTSP,
    calculerTotalDroitsTaxes,
    calculerHonorairesCDA,
    calculerSurestaries,
    calculerPoidsVolumetrique,
    calculerPoidsTaxable,
    calculerCoutTotal,
    calculerCotationComplete
  };