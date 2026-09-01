// src/modules/analytics/services/analytics.serviceB.js
const User = require('../../../database/models/User');
const Dossier = require('../../../database/models/Dossier');
const Cotation = require('../../../database/models/Cotation');
const Paiement = require('../../../database/models/Paiement');
const Tracking = require('../../../database/models/Tracking');
const Notification = require('../../../database/models/Notification');
const Stockage = require('../../../database/models/Stockage');
const Produit = require('../../../database/models/Produit');
const Commande = require('../../../database/models/Commande');
const { sequelize } = require('../../../config/database');
const { QueryTypes, Op } = require('sequelize');
const logger = require('../../../utils/logger');

// ─── Dashboard Opérateur ────────────────────────────────────────
const dashboardOperateur = async (userId) => {
  const [
    totalDossiers,
    dossiersBrouillon,
    dossiersEnCours,
    dossiersValides,
    dossiersRejetes,
    totalPaiements,
    paiementsConfirmes,
    montantTotalPaye,
    cotationsEnAttente,
    cotationsAcceptees,
    stockagesActifs,
    produitsPublies,
    commandesAcheteur,
    commandesVendeur,
    notificationsNonLues,
  ] = await Promise.all([
    Dossier.count({ where: { userId } }),
    Dossier.count({ where: { userId, statut: 'BROUILLON' } }),
    Dossier.count({ where: { userId, statut: { [Op.in]: ['SOUMIS', 'VALIDATION_ADMIN', 'VALIDATION_TECHNIQUE', 'VALIDATION_FINANCIERE', 'VALIDATION_LOGISTIQUE'] } } }),
    Dossier.count({ where: { userId, statut: 'VALIDE' } }),
    Dossier.count({ where: { userId, statut: 'REJETE' } }),
    Paiement.count({ where: { userId } }),
    Paiement.count({ where: { userId, statut: { [Op.in]: ['PAYE', 'ESCROW', 'LIBERE'] } } }),
    Paiement.sum('montantTotal', { where: { userId, statut: { [Op.in]: ['PAYE', 'ESCROW', 'LIBERE'] } } }),
    Cotation.count({
      include: [{ model: Dossier, as: 'dossier', where: { userId }, required: true }],
      where: { statut: { [Op.in]: ['EN_ATTENTE', 'VU'] } },
    }),
    Cotation.count({
      include: [{ model: Dossier, as: 'dossier', where: { userId }, required: true }],
      where: { statut: 'ACCEPTE' },
    }),
    Stockage.count({ where: { userId, statut: { [Op.in]: ['STOCKE', 'PARTIELLEMENT_SORTI'] } } }),
    Produit.count({ where: { userId, statut: 'PUBLIE' } }),
    Commande.count({ where: { acheteurId: userId } }),
    Commande.count({ where: { vendeurId: userId } }),
    Notification.count({ where: { userId, statut: { [Op.in]: ['EN_ATTENTE', 'ENVOYE'] } } }),
  ]);

  // Derniers dossiers
  const derniersDossiers = await Dossier.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: 5,
    attributes: ['id', 'reference', 'statut', 'typeOperation', 'createdAt'],
  });

  // Dernières notifications
  const dernieresNotifications = await Notification.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: 5,
    attributes: ['id', 'titre', 'message', 'statut', 'typeEvenement', 'createdAt'],
  });

  return {
    resume: {
      totalDossiers,
      dossiersBrouillon,
      dossiersEnCours,
      dossiersValides,
      dossiersRejetes,
      tauxValidation: totalDossiers > 0
        ? Math.round((dossiersValides / totalDossiers) * 100)
        : 0,
    },
    paiements: {
      total: totalPaiements,
      confirmes: paiementsConfirmes,
      montantTotalPayeFCFA: montantTotalPaye || 0,
    },
    cotations: {
      enAttente: cotationsEnAttente,
      acceptees: cotationsAcceptees,
    },
    marketplace: {
      stockagesActifs,
      produitsPublies,
      commandesAcheteur,
      commandesVendeur,
    },
    notifications: {
      nonLues: notificationsNonLues,
      dernieres: dernieresNotifications,
    },
    activiteRecente: {
      derniersDossiers,
    },
  };
};

// ─── Dashboard Admin ────────────────────────────────────────────
const dashboardAdmin = async () => {
  const debut30j = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUtilisateurs,
    utilisateursActifs,
    kycEnAttente,
    kycValides,
    totalDossiers,
    dossiersEnCours,
    dossiersValides,
    totalPaiements,
    montantTotalTransactions,
    paiementsEscrow,
    totalStockages,
    totalProduits,
    totalCommandes,
    commandesLivrees,
    chiffreAffairesMarketplace,
    commissionsMarketplace,
    nouveauxUtilisateurs30j,
    nouveauxDossiers30j,
  ] = await Promise.all([
    User.count({ where: { role: 'OPERATEUR' } }),
    User.count({ where: { role: 'OPERATEUR', isActive: true } }),
    User.count({ where: { statutKYC: 'EN_COURS' } }),
    User.count({ where: { statutKYC: 'VALIDE' } }),
    Dossier.count(),
    Dossier.count({ where: { statut: { [Op.in]: ['SOUMIS', 'VALIDATION_ADMIN', 'VALIDATION_TECHNIQUE', 'VALIDATION_FINANCIERE', 'VALIDATION_LOGISTIQUE'] } } }),
    Dossier.count({ where: { statut: 'VALIDE' } }),
    Paiement.count(),
    Paiement.sum('montantTotal', { where: { statut: { [Op.in]: ['PAYE', 'ESCROW', 'LIBERE'] } } }),
    Paiement.sum('montantTotal', { where: { statut: 'ESCROW' } }),
    Stockage.count(),
    Produit.count({ where: { statut: 'PUBLIE' } }),
    Commande.count(),
    Commande.count({ where: { statut: 'LIVRE' } }),
    Commande.sum('montantTotal', { where: { statut: 'LIVRE' } }),
    Commande.sum('commissionSaygoo', { where: { statut: 'LIVRE' } }),
    User.count({ where: { createdAt: { [Op.gte]: debut30j } } }),
    Dossier.count({ where: { createdAt: { [Op.gte]: debut30j } } }),
  ]);

  const isSqlite = sequelize.options.dialect === 'sqlite';

  // Évolution mensuelle des dossiers (6 derniers mois)
  const evolutionDossiers = isSqlite
    ? await sequelize.query(`
        SELECT 
          strftime('%Y-%m', "createdAt") as mois,
          COUNT(*) as nombre,
          SUM(CASE WHEN statut = 'VALIDE' THEN 1 ELSE 0 END) as valides
        FROM dossiers
        WHERE "createdAt" >= datetime('now', '-6 months')
        AND "deletedAt" IS NULL
        GROUP BY strftime('%Y-%m', "createdAt")
        ORDER BY mois ASC
      `, { type: QueryTypes.SELECT })
    : await sequelize.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as mois,
          COUNT(*) as nombre,
          SUM(CASE WHEN statut = 'VALIDE' THEN 1 ELSE 0 END) as valides
        FROM dossiers
        WHERE "createdAt" >= NOW() - INTERVAL '6 months'
        AND "deletedAt" IS NULL
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY mois ASC
      `, { type: QueryTypes.SELECT });

  // Évolution mensuelle des paiements
  const evolutionPaiements = isSqlite
    ? await sequelize.query(`
        SELECT 
          strftime('%Y-%m', "createdAt") as mois,
          COUNT(*) as nombre,
          SUM("montantTotal") as montant
        FROM paiements
        WHERE "createdAt" >= datetime('now', '-6 months')
        AND statut IN ('PAYE', 'ESCROW', 'LIBERE')
        AND "deletedAt" IS NULL
        GROUP BY strftime('%Y-%m', "createdAt")
        ORDER BY mois ASC
      `, { type: QueryTypes.SELECT })
    : await sequelize.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as mois,
          COUNT(*) as nombre,
          SUM("montantTotal") as montant
        FROM paiements
        WHERE "createdAt" >= NOW() - INTERVAL '6 months'
        AND statut IN ('PAYE', 'ESCROW', 'LIBERE')
        AND "deletedAt" IS NULL
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY mois ASC
      `, { type: QueryTypes.SELECT });

  // Répartition par type d'opération
  const repartitionOperations = await sequelize.query(`
    SELECT "typeOperation", COUNT(*) as nombre
    FROM dossiers
    WHERE "deletedAt" IS NULL
    GROUP BY "typeOperation"
  `, { type: QueryTypes.SELECT });

  // Répartition par catégorie de produit
  const repartitionProduits = await sequelize.query(`
    SELECT categorie, COUNT(*) as nombre
    FROM produits
    WHERE "deletedAt" IS NULL
    GROUP BY categorie
    ORDER BY nombre DESC
  `, { type: QueryTypes.SELECT });

  // Top 5 opérateurs par nombre de dossiers
  const topOperateurs = await sequelize.query(`
    SELECT u."raisonSociale", COUNT(d.id) as nombre_dossiers,
           SUM(d."coutFinal") as chiffre_affaires
    FROM users u
    LEFT JOIN dossiers d ON d."userId" = u.id
    WHERE u.role = 'OPERATEUR'
    AND d."deletedAt" IS NULL
    GROUP BY u.id, u."raisonSociale"
    ORDER BY nombre_dossiers DESC
    LIMIT 5
  `, { type: QueryTypes.SELECT });

  return {
    utilisateurs: {
      total: totalUtilisateurs,
      actifs: utilisateursActifs,
      kycEnAttente,
      kycValides,
      nouveaux30j: nouveauxUtilisateurs30j,
      tauxKYC: totalUtilisateurs > 0
        ? Math.round((kycValides / totalUtilisateurs) * 100)
        : 0,
    },
    dossiers: {
      total: totalDossiers,
      enCours: dossiersEnCours,
      valides: dossiersValides,
      nouveaux30j: nouveauxDossiers30j,
      tauxValidation: totalDossiers > 0
        ? Math.round((dossiersValides / totalDossiers) * 100)
        : 0,
    },
    financier: {
      totalTransactionsFCFA: montantTotalTransactions || 0,
      montantEscrowFCFA: paiementsEscrow || 0,
      totalPaiements,
      chiffreAffairesMarketplaceFCFA: chiffreAffairesMarketplace || 0,
      commissionsMarketplaceFCFA: commissionsMarketplace || 0,
    },
    marketplace: {
      totalProduits,
      totalCommandes,
      commandesLivrees,
      tauxLivraison: totalCommandes > 0
        ? Math.round((commandesLivrees / totalCommandes) * 100)
        : 0,
    },
    stockage: { total: totalStockages },
    graphiques: {
      evolutionDossiers,
      evolutionPaiements,
      repartitionOperations,
      repartitionProduits,
    },
    topOperateurs,
  };
};

// ─── Dashboard Opérateur — stats détaillées ─────────────────────
const statsOperateur = async (userId, periode = '30j') => {
  const joursMap = { '7j': 7, '30j': 30, '90j': 90, '1an': 365 };
  const jours = joursMap[periode] || 30;
  const debut = new Date(Date.now() - jours * 24 * 60 * 60 * 1000);

  const isSqlite = sequelize.options.dialect === 'sqlite';

  const evolutionDossiers = isSqlite
    ? await sequelize.query(`
        SELECT 
          strftime('%Y-%m-%d', "createdAt", 'weekday 0', '-6 days') as semaine,
          COUNT(*) as nombre
        FROM dossiers
        WHERE "userId" = :userId
        AND "createdAt" >= :debut
        AND "deletedAt" IS NULL
        GROUP BY strftime('%Y-%m-%d', "createdAt", 'weekday 0', '-6 days')
        ORDER BY semaine ASC
      `, {
        type: QueryTypes.SELECT,
        replacements: { userId, debut },
      })
    : await sequelize.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('week', "createdAt"), 'YYYY-MM-DD') as semaine,
          COUNT(*) as nombre
        FROM dossiers
        WHERE "userId" = :userId
        AND "createdAt" >= :debut
        AND "deletedAt" IS NULL
        GROUP BY DATE_TRUNC('week', "createdAt")
        ORDER BY semaine ASC
      `, {
        type: QueryTypes.SELECT,
        replacements: { userId, debut },
      });

  const evolutionPaiements = isSqlite
    ? await sequelize.query(`
        SELECT 
          strftime('%Y-%m-%d', "createdAt", 'weekday 0', '-6 days') as semaine,
          SUM("montantTotal") as montant,
          COUNT(*) as nombre
        FROM paiements
        WHERE "userId" = :userId
        AND "createdAt" >= :debut
        AND statut IN ('PAYE', 'ESCROW', 'LIBERE')
        AND "deletedAt" IS NULL
        GROUP BY strftime('%Y-%m-%d', "createdAt", 'weekday 0', '-6 days')
        ORDER BY semaine ASC
      `, {
        type: QueryTypes.SELECT,
        replacements: { userId, debut },
      })
    : await sequelize.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('week', "createdAt"), 'YYYY-MM-DD') as semaine,
          SUM("montantTotal") as montant,
          COUNT(*) as nombre
        FROM paiements
        WHERE "userId" = :userId
        AND "createdAt" >= :debut
        AND statut IN ('PAYE', 'ESCROW', 'LIBERE')
        AND "deletedAt" IS NULL
        GROUP BY DATE_TRUNC('week', "createdAt")
        ORDER BY semaine ASC
      `, {
        type: QueryTypes.SELECT,
        replacements: { userId, debut },
      });

  return {
    periode,
    debut,
    evolutionDossiers,
    evolutionPaiements,
  };
};

module.exports = { dashboardOperateur, dashboardAdmin, statsOperateur };
