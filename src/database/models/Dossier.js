// src/database/models/Dossier.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const User = require('./User');

const Dossier = sequelize.define('Dossier', {
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

  typeOperation: {
    type: DataTypes.ENUM('IMPORTATION', 'EXPORTATION'),
    allowNull: false,
  },
  regimeDouanier: {
    type: DataTypes.ENUM('MISE_A_CONSOMMATION', 'TRANSIT', 'ADMISSION_TEMPORAIRE', 'AUTRE'),
    allowNull: false,
  },

  descriptionMarchandises: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  categorieProduit: {
    type: DataTypes.ENUM('ALIMENTAIRE', 'ELECTRONIQUE', 'TEXTILE', 'INDUSTRIEL', 'AUTRE'),
    allowNull: false,
  },
  quantite: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  poidsTotalKg: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  volumeM3: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  valeurFOB: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  valeurCIF: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },

  modeTransport: {
    type: DataTypes.ENUM('MARITIME', 'AERIEN', 'TERRESTRE'),
    allowNull: false,
  },
  portEmbarquement: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  portDestination: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nomNavire: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  eta: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  numeroConteneur: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  typeConteneur: {
    type: DataTypes.ENUM('VINGT_PIEDS', 'QUARANTE_PIEDS', 'GROUPAGE'),
    allowNull: true,
  },

  nomFournisseur: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  paysFournisseur: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  adresseFournisseur: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  contactFournisseur: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  urlFacture:           { type: DataTypes.STRING, allowNull: true },
  urlBL:                { type: DataTypes.STRING, allowNull: true },
  urlPackingList:       { type: DataTypes.STRING, allowNull: true },
  urlCertificatOrigine: { type: DataTypes.STRING, allowNull: true },
  urlAssurance:         { type: DataTypes.STRING, allowNull: true },
  urlAutorisation:      { type: DataTypes.STRING, allowNull: true },

  consignes: { type: DataTypes.TEXT, allowNull: true },
  priorite: {
    type: DataTypes.ENUM('STANDARD', 'URGENT'),
    defaultValue: 'STANDARD',
  },

  statut: {
    type: DataTypes.ENUM(
      'BROUILLON',
      'SOUMIS',
      'VALIDATION_ADMIN',
      'VALIDATION_TECHNIQUE',
      'VALIDATION_FINANCIERE',
      'VALIDATION_LOGISTIQUE',
      'VALIDE',
      'REJETE',
      'EN_COURS_DEDOUANEMENT',
      'DEDOUANE',
      'LIVRE'
    ),
    defaultValue: 'BROUILLON',
  },

  motifRejet:     { type: DataTypes.TEXT, allowNull: true },
  dateValidation: { type: DataTypes.DATE, allowNull: true },
  dateSoumission: { type: DataTypes.DATE, allowNull: true },

  coutEstime: { type: DataTypes.BIGINT, allowNull: true },
  coutFinal:  { type: DataTypes.BIGINT, allowNull: true },

  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },

}, {
  tableName: 'dossiers',
  timestamps: true,
  paranoid: true,
});

// Génération automatique de la référence avant validation
Dossier.beforeValidate(async (dossier) => {
  if (!dossier.reference) {
    const date = new Date();
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 90000) + 10000;
    dossier.reference = `SAY-${annee}${mois}-${random}`;
  }
});

// Associations
Dossier.belongsTo(User, { foreignKey: 'userId', as: 'operateur' });
User.hasMany(Dossier, { foreignKey: 'userId', as: 'dossiers' });

module.exports = Dossier;