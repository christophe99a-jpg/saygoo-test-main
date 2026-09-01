// src/database/models/User.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../src/config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // Infos entreprise
  raisonSociale: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nomCommercial: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  formeJuridique: {
    type: DataTypes.ENUM('SARL', 'SA', 'EI', 'AUTRE'),
    allowNull: true,
  },
  numeroRCCM: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  numeroIFU: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  paysEnregistrement: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Représentant légal
  nomRepresentant: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  prenomRepresentant: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dateNaissance: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  nationalite: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  typePiece: {
    type: DataTypes.ENUM('CNI', 'PASSEPORT', 'AUTRE'),
    allowNull: true,
  },
  numeroPiece: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dateExpirationPiece: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },

  // Contact
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  telephone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  telephoneSecondaire: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  canalCommunication: {
    type: DataTypes.ENUM('SMS', 'WHATSAPP', 'EMAIL'),
    defaultValue: 'WHATSAPP',
  },

  // Authentification
  motDePasse: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Infos opérationnelles
  typeActivite: {
    type: DataTypes.ENUM('IMPORTATEUR', 'EXPORTATEUR', 'DISTRIBUTEUR', 'TRADER', 'AUTRE'),
    allowNull: true,
  },
  natureMarchandises: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  frequenceOperations: {
    type: DataTypes.ENUM('OCCASIONNELLE', 'MENSUELLE', 'HEBDOMADAIRE'),
    allowNull: true,
  },
  volumeMensuelFCFA: {
    type: DataTypes.ENUM('MOINS_1M', '1_5M', '5_20M', 'PLUS_20M'),
    allowNull: true,
  },

  // KYC
  statutKYC: {
    type: DataTypes.ENUM('EN_ATTENTE', 'EN_COURS', 'VALIDE', 'REJETE'),
    defaultValue: 'EN_ATTENTE',
  },
  scoreRisque: {
    type: DataTypes.INTEGER,
    allowNull: true, // 0-100, calculé par l'IA
  },
  dateValidationKYC: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  motifRejetKYC: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Documents uploadés
  urlCarteOE: { type: DataTypes.STRING, allowNull: true },
  urlPieceIdentite: { type: DataTypes.STRING, allowNull: true },
  urlCarteCFE: { type: DataTypes.STRING, allowNull: true },

  // Pack souscrit
  pack: {
    type: DataTypes.ENUM('BASIC', 'GOLD', 'DIAMOND'),
    defaultValue: 'BASIC',
  },

  // Statut compte
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  role: {
    type: DataTypes.ENUM('OPERATEUR', 'ADMIN', 'CDA', 'CONSIGNATEUR', 'TRANSPORTEUR', 'ENTREPOSEUR'),
    defaultValue: 'OPERATEUR',
  },
}, {
  tableName: 'users',
  timestamps: true,
  paranoid: true, // soft delete avec deletedAt
});

// Hook : hash du mot de passe avant sauvegarde
User.beforeSave(async (user) => {
  if (user.changed('motDePasse')) {
    const salt = await bcrypt.genSalt(12);
    user.motDePasse = await bcrypt.hash(user.motDePasse, salt);
  }
});

// Méthode instance : vérification du mot de passe
User.prototype.verifierMotDePasse = async function (motDePasseSaisi) {
  return bcrypt.compare(motDePasseSaisi, this.motDePasse);
};

// Méthode instance : données publiques (sans infos sensibles)
User.prototype.toPublic = function () {
  const { motDePasse, refreshToken, ...public_data } = this.toJSON();
  return public_data;
};

module.exports = User;