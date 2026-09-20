// tests/helpers/auth.helper.js
const request = require('supertest');
const app = require('../../src/app');

const creerUtilisateurTest = async (overrides = {}) => {
  const donnees = {
    raisonSociale: 'Test SARL',
    nomRepresentant: 'Test',
    prenomRepresentant: 'User',
    email: `test_${Date.now()}@saygoo.tg`,
    telephone: '90000099',
    motDePasse: 'motdepasse123',
    ...overrides,
  };

  const res = await request(app)
    .post('/api/v1/auth/inscription')
    .send(donnees);

  return { user: res.body.data?.user, token: res.body.data?.accessToken, donnees };
};

const connecterUtilisateur = async (email, motDePasse = 'motdepasse123') => {
  const res = await request(app)
    .post('/api/v1/auth/connexion')
    .send({ email, motDePasse });

  return res.body.data?.accessToken;
};

const validerKYC = async (userId) => {
  const User = require('../../src/database/models/User');
  await User.update({ statutKYC: 'VALIDE' }, { where: { id: userId } });
};

module.exports = { creerUtilisateurTest, connecterUtilisateur, validerKYC };