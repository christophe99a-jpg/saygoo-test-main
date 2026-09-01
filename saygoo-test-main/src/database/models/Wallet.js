// src/database/models/Wallet.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const User = require('./User');

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // Numéro de wallet unique
  numero: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },

  // Soldes
  solde: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: 'Solde disponible en FCFA',
  },
  soldeBloque: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: 'Solde bloqué (escrow en cours)',
  },
  soldeTotal: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: 'Solde disponible + bloqué',
  },

  // Statut
  statut: {
    type: DataTypes.ENUM('ACTIF', 'SUSPENDU', 'BLOQUE', 'FERME'),
    defaultValue: 'ACTIF',
  },

  // Limites
  plafondJournalier: {
    type: DataTypes.BIGINT,
    defaultValue: 5000000, // 5 millions FCFA/jour
  },
  plafondMensuel: {
    type: DataTypes.BIGINT,
    defaultValue: 50000000, // 50 millions FCFA/mois
  },

  // Montants cumulés
  totalRecharge: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
  },
  totalDepense: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
  },
  totalRecu: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
  },
  totalRetrait: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
  },

  // KYC wallet
  niveauKYC: {
    type: DataTypes.ENUM('BASIQUE', 'STANDARD', 'PREMIUM'),
    defaultValue: 'BASIQUE',
  },

  // PIN de sécurité (hashé)
  pin: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Devise
  devise: {
    type: DataTypes.STRING,
    defaultValue: 'XOF',
  },

  // Relation
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'users', key: 'id' },
  },

}, {
  tableName: 'wallets',
  timestamps: true,
  paranoid: true,
});

// Numéro de wallet auto-généré
Wallet.beforeValidate(async (wallet) => {
  if (!wallet.numero) {
    const random = Math.floor(Math.random() * 9000000000) + 1000000000;
    wallet.numero = `SAY-W${random}`;
  }
});

// Associations
Wallet.belongsTo(User, { foreignKey: 'userId', as: 'proprietaire' });
User.hasOne(Wallet, { foreignKey: 'userId', as: 'wallet' });

module.exports = Wallet;