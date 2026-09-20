// src/modules/wallet/services/wallet.service.js
const Wallet = require('../../../database/models/Wallet');
const TransactionWallet = require('../../../database/models/TransactionWallet');
const User = require('../../../database/models/User');
const paygate = require('../../../integrations/mobilemoney/paygate');
const logger = require('../../../utils/logger');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize } = require('../../../config/database');

// Taux de frais
const FRAIS = {
  RECHARGE: 0,        // Gratuit
  RETRAIT: 0.01,      // 1%
  VIREMENT: 0.005,    // 0.5%
  PAIEMENT: 0,        // Gratuit
};

// Créer un wallet pour un utilisateur
const creerWallet = async (userId) => {
  const existant = await Wallet.findOne({ where: { userId } });
  if (existant) throw { statusCode: 409, message: 'Vous avez déjà un wallet SAYGOO' };

  const wallet = await Wallet.create({ userId });
  logger.info(`Wallet créé : ${wallet.numero} pour utilisateur ${userId}`);
  return wallet;
};

// Obtenir le wallet d'un utilisateur
const obtenirWallet = async (userId) => {
  const wallet = await Wallet.findOne({
    where: { userId },
    include: [{ model: User, as: 'proprietaire', attributes: ['id', 'raisonSociale', 'email'] }],
  });
  if (!wallet) throw { statusCode: 404, message: 'Wallet introuvable. Créez votre wallet d\'abord.' };
  return wallet;
};

// Définir ou vérifier le PIN
const definirPIN = async (userId, pin) => {
  if (!/^\d{4}$/.test(pin)) throw { statusCode: 400, message: 'Le PIN doit être à 4 chiffres' };

  const wallet = await Wallet.findOne({ where: { userId } });
  if (!wallet) throw { statusCode: 404, message: 'Wallet introuvable' };

  const pinHashe = await bcrypt.hash(pin, 10);
  await wallet.update({ pin: pinHashe });

  logger.info(`PIN défini pour wallet ${wallet.numero}`);
  return { message: 'PIN défini avec succès' };
};

const verifierPIN = async (wallet, pin) => {
  if (!wallet.pin) throw { statusCode: 400, message: 'PIN non défini. Définissez votre PIN d\'abord.' };
  const valide = await bcrypt.compare(pin, wallet.pin);
  if (!valide) throw { statusCode: 401, message: 'PIN incorrect' };
};

// Recharger le wallet depuis Mobile Money
const recharger = async (userId, donnees) => {
  const { montant, operateurMobile, numeroPaiement } = donnees;

  if (montant < 1000) throw { statusCode: 400, message: 'Montant minimum de recharge : 1 000 FCFA' };
  if (montant > 5000000) throw { statusCode: 400, message: 'Montant maximum de recharge : 5 000 000 FCFA' };

  const wallet = await Wallet.findOne({ where: { userId } });
  if (!wallet) throw { statusCode: 404, message: 'Wallet introuvable' };
  if (wallet.statut !== 'ACTIF') throw { statusCode: 403, message: 'Wallet suspendu ou bloqué' };

  // Créer la transaction en attente
  const transaction = await TransactionWallet.create({
    type: 'RECHARGE',
    montant,
    frais: 0,
    montantNet: montant,
    soldeAvant: Number(wallet.solde),
    statut: 'EN_COURS',
    description: `Recharge wallet via ${operateurMobile}`,
    operateurMobile,
    numeroPaiement,
    walletId: wallet.id,
  });

  // Appel Mobile Money
  try {
    const reponse = await paygate.initierPaiement({
      montant,
      telephone: numeroPaiement,
      operateur: operateurMobile,
      reference: transaction.reference,
      description: `Recharge wallet SAYGOO ${wallet.numero}`,
    });

    // En mode dev, on confirme automatiquement
    if (process.env.NODE_ENV === 'development' || reponse.success) {
      await sequelize.transaction(async (t) => {
        const nouveauSolde = Number(wallet.solde) + montant;
        await wallet.update({
          solde: nouveauSolde,
          soldeTotal: nouveauSolde + Number(wallet.soldeBloque),
          totalRecharge: Number(wallet.totalRecharge) + montant,
        }, { transaction: t });

        await transaction.update({
          statut: 'COMPLETE',
          soldeApres: nouveauSolde,
          dateCompletion: new Date(),
          referenceExterne: reponse.transactionId,
        }, { transaction: t });
      });
    }

    logger.info(`Recharge ${montant} FCFA sur wallet ${wallet.numero}`);
    return transaction;
  } catch (err) {
    await transaction.update({ statut: 'ECHEC' });
    throw err;
  }
};

// Retrait vers Mobile Money
const retirer = async (userId, donnees) => {
  const { montant, operateurMobile, numeroPaiement, pin } = donnees;

  const wallet = await Wallet.findOne({ where: { userId } });
  if (!wallet) throw { statusCode: 404, message: 'Wallet introuvable' };
  if (wallet.statut !== 'ACTIF') throw { statusCode: 403, message: 'Wallet suspendu ou bloqué' };

  // Vérifier PIN
  await verifierPIN(wallet, pin);

  if (montant < 1000) throw { statusCode: 400, message: 'Montant minimum de retrait : 1 000 FCFA' };

  const frais = Math.round(montant * FRAIS.RETRAIT);
  const montantNet = montant - frais;

  if (Number(wallet.solde) < montant) {
    throw { statusCode: 400, message: `Solde insuffisant. Solde disponible : ${wallet.solde} FCFA` };
  }

  // Vérifier plafond journalier
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);

  const totalRetraitsJour = await TransactionWallet.sum('montant', {
    where: {
      walletId: wallet.id,
      type: 'RETRAIT',
      statut: 'COMPLETE',
      dateTransaction: { [Op.gte]: debutJour },
    },
  }) || 0;

  if (totalRetraitsJour + montant > Number(wallet.plafondJournalier)) {
    throw { statusCode: 400, message: `Plafond journalier atteint : ${wallet.plafondJournalier} FCFA` };
  }

  const transaction = await TransactionWallet.create({
    type: 'RETRAIT',
    montant,
    frais,
    montantNet,
    soldeAvant: Number(wallet.solde),
    statut: 'EN_COURS',
    description: `Retrait vers ${operateurMobile} - ${numeroPaiement}`,
    operateurMobile,
    numeroPaiement,
    walletId: wallet.id,
  });

  try {
    await sequelize.transaction(async (t) => {
      const nouveauSolde = Number(wallet.solde) - montant;
      await wallet.update({
        solde: nouveauSolde,
        soldeTotal: nouveauSolde + Number(wallet.soldeBloque),
        totalRetrait: Number(wallet.totalRetrait) + montant,
      }, { transaction: t });

      await transaction.update({
        statut: 'COMPLETE',
        soldeApres: nouveauSolde,
        dateCompletion: new Date(),
      }, { transaction: t });
    });

    logger.info(`Retrait ${montant} FCFA depuis wallet ${wallet.numero}`);
    return transaction;
  } catch (err) {
    await transaction.update({ statut: 'ECHEC' });
    throw err;
  }
};

// Virement entre wallets
const virer = async (userId, donnees) => {
  const { montant, numeroWalletDestinataire, description, pin } = donnees;

  const walletSource = await Wallet.findOne({ where: { userId } });
  if (!walletSource) throw { statusCode: 404, message: 'Wallet source introuvable' };
  if (walletSource.statut !== 'ACTIF') throw { statusCode: 403, message: 'Wallet suspendu ou bloqué' };

  // Vérifier PIN
  await verifierPIN(walletSource, pin);

  if (walletSource.numero === numeroWalletDestinataire) {
    throw { statusCode: 400, message: 'Impossible de vous virer à vous-même' };
  }

  const walletDestinataire = await Wallet.findOne({
    where: { numero: numeroWalletDestinataire, statut: 'ACTIF' },
    include: [{ model: User, as: 'proprietaire', attributes: ['id', 'raisonSociale'] }],
  });
  if (!walletDestinataire) throw { statusCode: 404, message: 'Wallet destinataire introuvable' };

  if (montant < 100) throw { statusCode: 400, message: 'Montant minimum : 100 FCFA' };

  const frais = Math.round(montant * FRAIS.VIREMENT);
  const montantNet = montant - frais;

  if (Number(walletSource.solde) < montant + frais) {
    throw { statusCode: 400, message: `Solde insuffisant. Solde disponible : ${walletSource.solde} FCFA` };
  }

  await sequelize.transaction(async (t) => {
    const nouveauSoldeSource = Number(walletSource.solde) - montant - frais;
    const nouveauSoldeDestinataire = Number(walletDestinataire.solde) + montantNet;

    // Débiter la source
    await walletSource.update({
      solde: nouveauSoldeSource,
      soldeTotal: nouveauSoldeSource + Number(walletSource.soldeBloque),
      totalDepense: Number(walletSource.totalDepense) + montant,
    }, { transaction: t });

    // Créditer le destinataire
    await walletDestinataire.update({
      solde: nouveauSoldeDestinataire,
      soldeTotal: nouveauSoldeDestinataire + Number(walletDestinataire.soldeBloque),
      totalRecu: Number(walletDestinataire.totalRecu) + montantNet,
    }, { transaction: t });

    const desc = description || `Virement de ${walletSource.numero}`;

    // Transaction source (débit)
    await TransactionWallet.create({
      type: 'VIREMENT_ENVOYE',
      montant,
      frais,
      montantNet: -(montant + frais),
      soldeAvant: Number(walletSource.solde),
      soldeApres: nouveauSoldeSource,
      statut: 'COMPLETE',
      description: `Virement vers ${numeroWalletDestinataire} - ${desc}`,
      walletId: walletSource.id,
      walletDestinataireId: walletDestinataire.id,
      dateCompletion: new Date(),
    }, { transaction: t });

    // Transaction destinataire (crédit)
    await TransactionWallet.create({
      type: 'VIREMENT_RECU',
      montant: montantNet,
      frais: 0,
      montantNet,
      soldeAvant: Number(walletDestinataire.solde),
      soldeApres: nouveauSoldeDestinataire,
      statut: 'COMPLETE',
      description: `Virement reçu de ${walletSource.numero} - ${desc}`,
      walletId: walletDestinataire.id,
      walletDestinataireId: walletSource.id,
      dateCompletion: new Date(),
    }, { transaction: t });
  });

  logger.info(`Virement ${montant} FCFA : ${walletSource.numero} → ${numeroWalletDestinataire}`);

  return {
    message: `Virement de ${montant} FCFA effectué avec succès`,
    destinataire: walletDestinataire.proprietaire?.raisonSociale,
    montant,
    frais,
    montantRecu: montantNet,
  };
};

// Payer depuis le wallet (dossier, stockage, etc.)
const payer = async (userId, montant, type, referenceExterne, description) => {
  const wallet = await Wallet.findOne({ where: { userId } });
  if (!wallet) throw { statusCode: 404, message: 'Wallet introuvable' };
  if (wallet.statut !== 'ACTIF') throw { statusCode: 403, message: 'Wallet suspendu ou bloqué' };

  if (Number(wallet.solde) < montant) {
    throw { statusCode: 400, message: `Solde insuffisant. Solde disponible : ${wallet.solde} FCFA` };
  }

  await sequelize.transaction(async (t) => {
    const nouveauSolde = Number(wallet.solde) - montant;
    await wallet.update({
      solde: nouveauSolde,
      soldeTotal: nouveauSolde + Number(wallet.soldeBloque),
      totalDepense: Number(wallet.totalDepense) + montant,
    }, { transaction: t });

    await TransactionWallet.create({
      type,
      montant,
      frais: 0,
      montantNet: -montant,
      soldeAvant: Number(wallet.solde),
      soldeApres: nouveauSolde,
      statut: 'COMPLETE',
      description,
      referenceExterne,
      walletId: wallet.id,
      dateCompletion: new Date(),
    }, { transaction: t });
  });

  logger.info(`Paiement ${montant} FCFA depuis wallet ${wallet.numero} pour ${referenceExterne}`);
  return { success: true, montant, nouveauSolde: Number(wallet.solde) - montant };
};

// Historique des transactions
const historique = async (userId, filtres = {}) => {
  const wallet = await Wallet.findOne({ where: { userId } });
  if (!wallet) throw { statusCode: 404, message: 'Wallet introuvable' };

  const where = { walletId: wallet.id };
  if (filtres.type) where.type = filtres.type;
  if (filtres.statut) where.statut = filtres.statut;

  if (filtres.dateDebut || filtres.dateFin) {
    where.dateTransaction = {};
    if (filtres.dateDebut) where.dateTransaction[Op.gte] = new Date(filtres.dateDebut);
    if (filtres.dateFin) where.dateTransaction[Op.lte] = new Date(filtres.dateFin);
  }

  return TransactionWallet.findAll({
    where,
    order: [['dateTransaction', 'DESC']],
    limit: parseInt(filtres.limit) || 50,
    offset: parseInt(filtres.offset) || 0,
  });
};

// Statistiques du wallet
const statistiques = async (userId) => {
  const wallet = await Wallet.findOne({ where: { userId } });
  if (!wallet) throw { statusCode: 404, message: 'Wallet introuvable' };

  const debut30j = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalTransactions,
    transactionsMois,
    rechargesMois,
    depensesMois,
  ] = await Promise.all([
    TransactionWallet.count({ where: { walletId: wallet.id } }),
    TransactionWallet.count({
      where: { walletId: wallet.id, dateTransaction: { [Op.gte]: debut30j } },
    }),
    TransactionWallet.sum('montant', {
      where: { walletId: wallet.id, type: 'RECHARGE', statut: 'COMPLETE', dateTransaction: { [Op.gte]: debut30j } },
    }),
    TransactionWallet.sum('montant', {
      where: {
        walletId: wallet.id,
        type: { [Op.in]: ['RETRAIT', 'VIREMENT_ENVOYE', 'PAIEMENT_DOSSIER', 'PAIEMENT_MARKETPLACE'] },
        statut: 'COMPLETE',
        dateTransaction: { [Op.gte]: debut30j },
      },
    }),
  ]);

  return {
    wallet: {
      numero: wallet.numero,
      solde: wallet.solde,
      soldeBloque: wallet.soldeBloque,
      soldeTotal: wallet.soldeTotal,
      statut: wallet.statut,
      niveauKYC: wallet.niveauKYC,
    },
    cumuls: {
      totalRecharge: wallet.totalRecharge,
      totalDepense: wallet.totalDepense,
      totalRecu: wallet.totalRecu,
      totalRetrait: wallet.totalRetrait,
    },
    derniers30jours: {
      totalTransactions: transactionsMois,
      recharges: rechargesMois || 0,
      depenses: depensesMois || 0,
    },
    totalTransactions,
  };
};

// Rechercher un wallet par numéro (pour virement)
const rechercherWallet = async (numero) => {
  const wallet = await Wallet.findOne({
    where: { numero, statut: 'ACTIF' },
    include: [{ model: User, as: 'proprietaire', attributes: ['id', 'raisonSociale'] }],
  });
  if (!wallet) throw { statusCode: 404, message: 'Wallet introuvable ou inactif' };
  return {
    numero: wallet.numero,
    proprietaire: wallet.proprietaire?.raisonSociale,
    statut: wallet.statut,
  };
};

module.exports = {
  creerWallet,
  obtenirWallet,
  definirPIN,
  recharger,
  retirer,
  virer,
  payer,
  historique,
  statistiques,
  rechercherWallet,
};