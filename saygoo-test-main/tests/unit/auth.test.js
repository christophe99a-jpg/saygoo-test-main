// tests/unit/auth.test.js
require('../helpers/setup');
const request = require('supertest');
const app = require('../../src/app');
const { creerUtilisateurTest } = require('../helpers/auth.helper');

describe('Module Auth', () => {

  describe('POST /api/v1/auth/inscription', () => {
    it('devrait créer un nouveau compte avec succès', async () => {
      const res = await request(app)
        .post('/api/v1/auth/inscription')
        .send({
          raisonSociale: 'Import Test SARL',
          nomRepresentant: 'Kofi',
          prenomRepresentant: 'Test',
          email: `kofi_test_${Date.now()}@saygoo.tg`,
          telephone: '90000001',
          motDePasse: 'motdepasse123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user).toHaveProperty('email');
      expect(res.body.data.user.statutKYC).toBe('EN_ATTENTE');
      expect(res.body.data.user.pack).toBe('BASIC');
      expect(res.body.data.user.role).toBe('OPERATEUR');
    });

    it('devrait rejeter une inscription avec un email déjà utilisé', async () => {
      const { donnees } = await creerUtilisateurTest();

      const res = await request(app)
        .post('/api/v1/auth/inscription')
        .send(donnees);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('devrait rejeter une inscription avec des données manquantes', async () => {
      const res = await request(app)
        .post('/api/v1/auth/inscription')
        .send({ email: 'incomplet@test.tg' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('errors');
    });

    it('devrait rejeter un mot de passe trop court', async () => {
      const res = await request(app)
        .post('/api/v1/auth/inscription')
        .send({
          raisonSociale: 'Test SARL',
          nomRepresentant: 'Test',
          prenomRepresentant: 'User',
          email: 'test@saygoo.tg',
          telephone: '90000002',
          motDePasse: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/connexion', () => {
    it('devrait connecter un utilisateur avec des identifiants valides', async () => {
      const { donnees } = await creerUtilisateurTest();

      const res = await request(app)
        .post('/api/v1/auth/connexion')
        .send({ email: donnees.email, motDePasse: donnees.motDePasse });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.message).toBe('Connexion réussie');
    });

    it('devrait rejeter des identifiants incorrects', async () => {
      const res = await request(app)
        .post('/api/v1/auth/connexion')
        .send({ email: 'inexistant@saygoo.tg', motDePasse: 'mauvais' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('devrait rejeter un mot de passe incorrect', async () => {
      const { donnees } = await creerUtilisateurTest();

      const res = await request(app)
        .post('/api/v1/auth/connexion')
        .send({ email: donnees.email, motDePasse: 'mauvaismdp' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/moi', () => {
    it('devrait retourner le profil de l\'utilisateur connecté', async () => {
      const { token, donnees } = await creerUtilisateurTest();

      const res = await request(app)
        .get('/api/v1/auth/moi')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(donnees.email);
    });

    it('devrait rejeter une requête sans token', async () => {
      const res = await request(app).get('/api/v1/auth/moi');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('devrait rejeter un token invalide', async () => {
      const res = await request(app)
        .get('/api/v1/auth/moi')
        .set('Authorization', 'Bearer token_invalide');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('devrait rafraîchir le token avec un refresh token valide', async () => {
      const { donnees } = await creerUtilisateurTest();

      const loginRes = await request(app)
        .post('/api/v1/auth/connexion')
        .send({ email: donnees.email, motDePasse: donnees.motDePasse });

      const refreshToken = loginRes.body.data.refreshToken;

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('devrait rejeter un refresh token invalide', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'token_invalide' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/deconnexion', () => {
    it('devrait déconnecter l\'utilisateur', async () => {
      const { token } = await creerUtilisateurTest();

      const res = await request(app)
        .post('/api/v1/auth/deconnexion')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});