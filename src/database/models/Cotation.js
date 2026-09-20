// src/database/models/Cotation.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const Dossier = require('./Dossier');
const User = require('./User');

const Cotation = sequelize.define('Cotation', {
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

  // Montants
  montantHT: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  tva: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 18,
  },
  montantTTC: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  droitsDouane: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  fraisPortuaires: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  fraisDivers: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },

  // Délai
  delaiTraitement: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Délai en jours ouvrables',
  },

  // Détails de l offre
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  conditionsPaiement: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  validiteOffre: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date limite de validité de la cotation',
  },

  // Statut
  statut: {
    type: DataTypes.ENUM('EN_ATTENTE', 'VU', 'ACCEPTE', 'REFUSE', 'EXPIRE'),
    defaultValue: 'EN_ATTENTE',
  },

  // Note de performance du CDA (calculée automatiquement)
  scoreCDA: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },

  dateAcceptation: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // Relations
  dossierId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'dossiers', key: 'id' },
  },
  cdaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    comment: 'ID du CDA qui soumet la cotation',
  },

}, {
  tableName: 'cotations',
  timestamps: true,
  paranoid: true,
});

// Référence auto-générée
Cotation.beforeValidate(async (cotation) => {
  if (!cotation.reference) {
    const date = new Date();
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 90000) + 10000;
    cotation.reference = `COT-${annee}${mois}-${random}`;
  }
});

// Associations
Cotation.belongsTo(Dossier, { foreignKey: 'dossierId', as: 'dossier' });
Cotation.belongsTo(User, { foreignKey: 'cdaId', as: 'cda' });
Dossier.hasMany(Cotation, { foreignKey: 'dossierId', as: 'cotations' });
User.hasMany(Cotation, { foreignKey: 'cdaId', as: 'cotationsEmises' });

module.exports = Cotation;