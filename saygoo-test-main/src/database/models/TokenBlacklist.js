// src/database/models/TokenBlacklist.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const TokenBlacklist = sequelize.define('TokenBlacklist', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },

  // Raison de la révocation
  raison: {
    type: DataTypes.ENUM('DECONNEXION', 'EXPIRATION', 'COMPROMIS', 'ADMIN'),
    defaultValue: 'DECONNEXION',
  },

  // Date d'expiration du token original
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },

  userId: {
    type: DataTypes.UUID,
    allowNull: true,
  },

}, {
  tableName: 'token_blacklist',
  timestamps: true,
  updatedAt: false,
});

module.exports = TokenBlacklist;