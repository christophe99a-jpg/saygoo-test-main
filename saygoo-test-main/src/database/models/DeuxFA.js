// src/database/models/DeuxFA.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const User = require('./User');

const DeuxFA = sequelize.define('DeuxFA', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // Code OTP
  code: {
    type: DataTypes.STRING(6),
    allowNull: false,
  },

  // Type
  type: {
    type: DataTypes.ENUM('SMS', 'EMAIL', 'CONNEXION', 'OPERATION_CRITIQUE'),
    defaultValue: 'CONNEXION',
  },

  // Statut
  utilise: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  // Expiration (5 minutes)
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },

  // Tentatives
  nombreTentatives: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  // Destinataire
  destinataire: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },

}, {
  tableName: 'deux_fa',
  timestamps: true,
  updatedAt: false,
});

DeuxFA.belongsTo(User, { foreignKey: 'userId', as: 'utilisateur' });
User.hasMany(DeuxFA, { foreignKey: 'userId', as: 'codesOTP' });

module.exports = DeuxFA;