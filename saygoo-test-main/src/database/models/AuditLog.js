// src/database/models/AuditLog.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const User = require('./User');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // Action effectuée
  action: {
    type: DataTypes.ENUM(
      'INSCRIPTION',
      'CONNEXION',
      'DECONNEXION',
      'CONNEXION_ECHOUEE',
      'TOKEN_REFRESH',
      'KYC_UPLOAD',
      'KYC_VALIDE',
      'KYC_REJETE',
      'DOSSIER_CREE',
      'DOSSIER_SOUMIS',
      'DOSSIER_VALIDE',
      'DOSSIER_REJETE',
      'COTATION_SOUMISE',
      'COTATION_ACCEPTEE',
      'PAIEMENT_INITIE',
      'PAIEMENT_CONFIRME',
      'ESCROW_LIBERE',
      'PRODUIT_PUBLIE',
      'COMMANDE_PASSEE',
      'STOCKAGE_CREE',
      '2FA_ACTIVE',
      '2FA_DESACTIVE',
      '2FA_VERIFIE',
      '2FA_ECHEC',
      'MODIFICATION_PROFIL',
      'SUPPRESSION_COMPTE',
      'ACCES_ADMIN',
      'EXPORT_DONNEES',
    ),
    allowNull: false,
  },

  // Entité concernée
  entiteType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  entiteId: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Détails
  details: {
    type: DataTypes.JSON,
    allowNull: true,
  },

  // Résultat
  succes: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  messageErreur: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Contexte réseau
  adresseIP: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Relation
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },

}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false, // Les logs ne sont jamais modifiés
});

AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'utilisateur' });
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });

module.exports = AuditLog;