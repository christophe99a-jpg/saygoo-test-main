// src/database/models/MouvementStock.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const Stockage = require('./Stockage');
const User = require('./User');

const MouvementStock = sequelize.define('MouvementStock', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  type: {
    type: DataTypes.ENUM('ENTREE', 'SORTIE', 'TRANSFERT', 'AJUSTEMENT'),
    allowNull: false,
  },

  quantite: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },

  stockAvant: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },

  stockApres: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },

  motif: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  dateEvenement: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },

  stockageId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'stockages', key: 'id' },
  },

  effectuePar: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },

}, {
  tableName: 'mouvements_stock',
  timestamps: true,
});

MouvementStock.belongsTo(Stockage, { foreignKey: 'stockageId', as: 'stockage' });
MouvementStock.belongsTo(User, { foreignKey: 'effectuePar', as: 'agent' });
Stockage.hasMany(MouvementStock, { foreignKey: 'stockageId', as: 'mouvements' });

module.exports = MouvementStock;