// src/database/models/Notification.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const User = require('./User');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // Type de canal
  canal: {
    type: DataTypes.ENUM('SMS', 'WHATSAPP', 'EMAIL', 'PUSH'),
    allowNull: false,
  },

  // Type d'événement
  typeEvenement: {
    type: DataTypes.ENUM(
      'INSCRIPTION',
      'KYC_SOUMIS',
      'KYC_VALIDE',
      'KYC_REJETE',
      'DOSSIER_CREE',
      'DOSSIER_SOUMIS',
      'DOSSIER_VALIDE',
      'DOSSIER_REJETE',
      'COTATION_RECUE',
      'COTATION_ACCEPTEE',
      'PAIEMENT_INITIE',
      'PAIEMENT_CONFIRME',
      'PAIEMENT_ECHOUE',
      'TRACKING_MISE_A_JOUR',
      'LIVRAISON_EN_COURS',
      'LIVRAISON_EFFECTUEE',
      'INCIDENT_SIGNALE',
      'ALERTE_STOCK',
      'CUSTOM'
    ),
    allowNull: false,
  },

  // Contenu
  titre: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  // Destinataire
  destinataire: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Numéro de téléphone ou email',
  },

  // Statut envoi
  statut: {
    type: DataTypes.ENUM('EN_ATTENTE', 'ENVOYE', 'ECHEC', 'LU'),
    defaultValue: 'EN_ATTENTE',
  },

  // Réponse de l'opérateur
  reponseOperateur: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Tentatives
  nombreTentatives: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  dateDerniereTentative: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  dateEnvoi: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  dateLecture: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // Référence à l'entité concernée
  entiteType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'dossier, cotation, paiement, etc.',
  },
  entiteId: {
    type: DataTypes.UUID,
    allowNull: true,
  },

  // Relation
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },

}, {
  tableName: 'notifications',
  timestamps: true,
});

// Associations
Notification.belongsTo(User, { foreignKey: 'userId', as: 'utilisateur' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

module.exports = Notification;