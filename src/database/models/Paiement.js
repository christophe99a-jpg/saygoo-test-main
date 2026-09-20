// src/database/models/Paiement.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const User = require('./User');
const Cotation = require('./Cotation');
const Dossier = require('./Dossier');

const Paiement = sequelize.define('Paiement', {
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

  montantTotal: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  montantPaye: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
  },
  montantRestant: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },

  modePaiement: {
    type: DataTypes.ENUM('MOBILE_MONEY', 'CARTE_BANCAIRE', 'CREDIT_SAYGOO', 'VIREMENT'),
    allowNull: false,
  },

  numeroPaiement: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Numéro de téléphone Mobile Money',
  },
  operateurMobile: {
    type: DataTypes.ENUM('FLOOZ', 'TMONEY', 'MOOV', 'MTN', 'ORANGE', 'AUTRE'),
    allowNull: true,
  },

  statut: {
    type: DataTypes.ENUM(
      'EN_ATTENTE',
      'EN_COURS',
      'PARTIELLEMENT_PAYE',
      'PAYE',
      'ESCROW',
      'LIBERE',
      'REMBOURSE',
      'ECHEC'
    ),
    defaultValue: 'EN_ATTENTE',
  },

  typePaiement: {
    type: DataTypes.ENUM('COMPLET', 'FRACTIONNE', 'ACOMPTE'),
    defaultValue: 'COMPLET',
  },

  nombreFractions: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  fractionActuelle: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },

  escrowActif: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  dateEscrowLibere: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  transactionId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reponseOperateur: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  datePaiement: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  dateExpiration: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  cotationId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'cotations', key: 'id' },
  },
  dossierId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'dossiers', key: 'id' },
  },

}, {
  tableName: 'paiements',
  timestamps: true,
  paranoid: true,
});

// Référence auto-générée
Paiement.beforeValidate(async (paiement) => {
  if (!paiement.reference) {
    const date = new Date();
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 90000) + 10000;
    paiement.reference = `PAY-${annee}${mois}-${random}`;
  }
  if (paiement.montantTotal && paiement.montantPaye !== undefined) {
    paiement.montantRestant = Number(paiement.montantTotal) - Number(paiement.montantPaye);
  }
});

// Associations
Paiement.belongsTo(User, { foreignKey: 'userId', as: 'payeur' });
Paiement.belongsTo(Cotation, { foreignKey: 'cotationId', as: 'cotation' });
Paiement.belongsTo(Dossier, { foreignKey: 'dossierId', as: 'dossier' });
User.hasMany(Paiement, { foreignKey: 'userId', as: 'paiements' });
Dossier.hasMany(Paiement, { foreignKey: 'dossierId', as: 'paiements' });

module.exports = Paiement;