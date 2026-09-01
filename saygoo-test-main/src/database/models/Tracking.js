// src/database/models/Tracking.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const Dossier = require('./Dossier');
const User = require('./User');

const Tracking = sequelize.define('Tracking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // Étape du tracking
  etape: {
    type: DataTypes.ENUM(
      'DOSSIER_SOUMIS',
      'DOSSIER_VALIDE',
      'EN_ATTENTE_DEDOUANEMENT',
      'DEDOUANEMENT_EN_COURS',
      'DOCUMENTS_CONTROLES',
      'DROITS_PAYES',
      'MARCHANDISE_LIBEREE',
      'SORTIE_PORT',
      'EN_TRANSIT',
      'EN_LIVRAISON',
      'LIVRE',
      'INCIDENT'
    ),
    allowNull: false,
  },

  // Description de l'étape
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Localisation
  lieu: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },

  // Statut
  statut: {
    type: DataTypes.ENUM('EN_COURS', 'COMPLETE', 'INCIDENT'),
    defaultValue: 'COMPLETE',
  },

  // Responsable de cette étape
  responsable: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nom de l\'agent ou du service responsable',
  },

  // ETA (temps estimé d'arrivée à l'étape suivante)
  etaSuivante: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // Notes internes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Notification envoyée
  notificationEnvoyee: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  // Date de l'événement
  dateEvenement: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },

  // Relations
  dossierId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'dossiers', key: 'id' },
  },
  creePar: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },

}, {
  tableName: 'trackings',
  timestamps: true,
});

// Associations
Tracking.belongsTo(Dossier, { foreignKey: 'dossierId', as: 'dossier' });
Tracking.belongsTo(User, { foreignKey: 'creePar', as: 'agent' });
Dossier.hasMany(Tracking, { foreignKey: 'dossierId', as: 'trackings' });

module.exports = Tracking;