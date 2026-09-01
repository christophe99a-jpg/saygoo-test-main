// tests/unit/dossier.test.js
require('../helpers/setup');
const request = require('supertest');
const app = require('../../src/app');
const { creerUtilisateurTest, validerKYC } = require('../helpers/auth.helper');

describe('Module Dossiers', () => {
  let token;
  let userId;
  let dossierId;

  const donneesDossier = {
    typeOperation: 'IMPORTATION',
    regimeDouanier: 'MISE_A_CONSOMMATION',
    descriptionMarchandises: 'Téléphones mobiles Samsung',
    categorieProduit: 'ELECTRONIQUE',
    quantite: '500 unités',
    poidsTotalKg: 250,
    valeurFOB: 15000000,
    modeTransport: 'MARITIME',
    portDestination: 'Lomé',
    nomFournisseur: 'Samsung China',
    paysFournisseur: 'Chine',
  };

  beforeAll(async () => {
    const { user, token: t } = await creerUtilisateurTest();
    token = t;
    userId = user.id;
    await validerKYC(userId);
    // Rafraîchir le token après validation KYC
    const loginRes = await request(app)
      .post('/api/v1/auth/connexion')
      .send({ email: user.email, motDePasse: 'motdepasse123' });
    token = loginRes.body.data.accessToken;
  });

  describe('POST /api/v1/dossiers', () => {
    it('devrait créer un dossier avec succès', async () => {
      const res = await request(app)
        .post('/api/v1/dossiers')
        .set('Authorization', `Bearer ${token}`)
        .send(donneesDossier);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('reference');
      expect(res.body.data.reference).toMatch(/^SAY-/);
      expect(res.body.data.statut).toBe('BROUILLON');

      dossierId = res.body.data.id;
    });

    it('devrait rejeter sans token', async () => {
      const res = await request(app)
        .post('/api/v1/dossiers')
        .send(donneesDossier);

      expect(res.status).toBe(401);
    });

    it('devrait rejeter avec des données manquantes', async () => {
      const res = await request(app)
        .post('/api/v1/dossiers')
        .set('Authorization', `Bearer ${token}`)
        .send({ typeOperation: 'IMPORTATION' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/dossiers', () => {
    it('devrait lister les dossiers de l\'opérateur', async () => {
      const res = await request(app)
        .get('/api/v1/dossiers')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('devrait filtrer par statut', async () => {
      const res = await request(app)
        .get('/api/v1/dossiers?statut=BROUILLON')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.data.forEach(d => {
        expect(d.statut).toBe('BROUILLON');
      });
    });
  });

  describe('GET /api/v1/dossiers/:id', () => {
    it('devrait retourner les détails d\'un dossier', async () => {
      const res = await request(app)
        .get(`/api/v1/dossiers/${dossierId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(dossierId);
      expect(res.body.data).toHaveProperty('reference');
    });

    it('devrait retourner 404 pour un dossier inexistant', async () => {
      const res = await request(app)
        .get('/api/v1/dossiers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/dossiers/:id/dupliquer', () => {
    it('devrait dupliquer un dossier', async () => {
      const res = await request(app)
        .post(`/api/v1/dossiers/${dossierId}/dupliquer`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(res.body.data.id).not.toBe(dossierId);
      expect(res.body.data.reference).not.toBe(dossierId);
      expect(res.body.data.statut).toBe('BROUILLON');
    });
  });
});