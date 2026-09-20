// src/database/models/TransactionWallet.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const Wallet = require('./Wallet');
const User = require('./User');

const TransactionWallet = sequelize.define('TransactionWallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  reference: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },

  // Type de transaction
  type: {
    type: DataTypes.ENUM(
      'RECHARGE',          // Dépôt depuis Mobile Money
      'RETRAIT',           // Retrait vers Mobile Money
      'VIREMENT_ENVOYE',   // Transfert vers un autre wallet
      'VIREMENT_RECU',     // Transfert reçu d'un autre wallet
      'PAIEMENT_DOSSIER',  // Paiement frais dédouanement
      'PAIEMENT_STOCKAGE', // Paiement frais stockage
      'PAIEMENT_TRANSPORT',// Paiement transport
      'PAIEMENT_MARKETPLACE',// Paiement achat marketplace
      'REMBOURSEMENT',     // Remboursement
      'COMMISSION',        // Commission SAYGOO prélevée
      'BONUS',             // Bonus/promotion
      'ESCROW_BLOQUE',     // Fonds mis en escrow
      'ESCROW_LIBERE',     // Escrow libéré
      'AJUSTEMENT'         // Ajustement admin
    ),
    allowNull: false,
  },

  // Montants
  montant: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  frais: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
  },
  montantNet: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },

  // Soldes avant/après
  soldeAvant: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  soldeApres: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },

  // Statut
  statut: {
    type: DataTypes.ENUM(
      'EN_ATTENTE',
      'EN_COURS',
      'COMPLETE',
      'ECHEC',
      'ANNULE',
      'REMBOURSE'
    ),
    defaultValue: 'EN_ATTENTE',
  },

  // Description
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Référence externe (Mobile Money, dossier, etc.)
  referenceExterne: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Canal Mobile Money
  operateurMobile: {
    type: DataTypes.ENUM('FLOOZ', 'TMONEY', 'MOOV', 'MTN', 'ORANGE', 'AUTRE'),
    allowNull: true,
  },
  numeroPaiement: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Dates
  dateTransaction: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  dateCompletion: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // Relations
  walletId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'wallets', key: 'id' },
  },
  walletDestinataireId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'wallets', key: 'id' },
    comment: 'Pour les virements',
  },

}, {
  tableName: 'transactions_wallet',
  timestamps: true,
  updatedAt: false,
});

// Référence auto-générée
TransactionWallet.beforeValidate(async (tx) => {
  if (!tx.reference) {
    const date = new Date();
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 900000) + 100000;
    tx.reference = `TXW-${annee}${mois}-${random}`;
  }
});

// Associations
TransactionWallet.belongsTo(Wallet, { foreignKey: 'walletId', as: 'wallet' });
TransactionWallet.belongsTo(Wallet, { foreignKey: 'walletDestinataireId', as: 'walletDestinataire' });
Wallet.hasMany(TransactionWallet, { foreignKey: 'walletId', as: 'transactions' });

module.exports = TransactionWallet;