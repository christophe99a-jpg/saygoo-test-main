// tests/unit/transport.test.js
require('../helpers/setup');
const request = require('supertest');
const app = require('../../src/app');
const { creerUtilisateurTest } = require('../helpers/auth.helper');

describe('Module Transport', () => {
  let token;

  beforeAll(async () => {
    const { token: t } = await creerUtilisateurTest();
    token = t;
  });

  describe('POST /api/v1/transport/simuler', () => {
    it('devrait simuler un coût de transport', async () => {
      const res = await request(app)
        .post('/api/v1/transport/simuler')
        .set('Authorization', `Bearer ${token}`)
        .send({
          depart: 'Lome',
          destination: 'Kara',
          distanceKm: 420,
          typeCamion: 'MOYEN',
          poidsTonnes: 10,
          valeurMarchandise: 5000000,
          niveauRisque: 'moyen',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totaux');
      expect(res.body.data.totaux.coutTotal).toBeGreaterThan(0);
      expect(res.body.data.totaux.prixRecommande).toBeGreaterThan(
        res.body.data.totaux.coutTotal
      );
      expect(res.body.data).toHaveProperty('detail');
      expect(res.body.data.detail).toHaveProperty('coutCarburant');
      expect(res.body.data.detail).toHaveProperty('coutAssurance');
    });

    it('devrait appliquer le facteur nuit', async () => {
      const [resNormal, resNuit] = await Promise.all([
        request(app)
          .post('/api/v1/transport/simuler')
          .set('Authorization', `Bearer ${token}`)
          .send({ distanceKm: 100, poidsTonnes: 5, conditions: { nuit: false } }),
        request(app)
          .post('/api/v1/transport/simuler')
          .set('Authorization', `Bearer ${token}`)
          .send({ distanceKm: 100, poidsTonnes: 5, conditions: { nuit: true } }),
      ]);

      expect(resNuit.body.data.totaux.coutTotal)
        .toBeGreaterThan(resNormal.body.data.totaux.coutTotal);
    });

    it('devrait rejeter une distance invalide', async () => {
      const res = await request(app)
        .post('/api/v1/transport/simuler')
        .set('Authorization', `Bearer ${token}`)
        .send({ distanceKm: -10, poidsTonnes: 5 });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/transport/comparer', () => {
    it('devrait comparer tous les types de camions', async () => {
      const res = await request(app)
        .post('/api/v1/transport/comparer')
        .set('Authorization', `Bearer ${token}`)
        .send({ distanceKm: 300, poidsTonnes: 8 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('resultats');
      expect(res.body.data).toHaveProperty('recommande');
      expect(Array.isArray(res.body.data.resultats)).toBe(true);
      expect(res.body.data.resultats.length).toBeGreaterThan(0);
      expect(res.body.data.recommande).not.toBeNull();
    });
  });

  describe('GET /api/v1/transport/distance', () => {
    it('devrait retourner la distance entre deux villes', async () => {
      const res = await request(app)
        .get('/api/v1/transport/distance?depart=lome&destination=kara')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.distanceKm).toBe(420);
    });

    it('devrait retourner 404 pour une route inconnue', async () => {
      const res = await request(app)
        .get('/api/v1/transport/distance?depart=paris&destination=tokyo')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/transport/tarifs', () => {
    it('devrait retourner les tarifs disponibles', async () => {
      const res = await request(app)
        .get('/api/v1/transport/tarifs')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('camions');
      expect(res.body.data).toHaveProperty('prixGasoil');
      expect(res.body.data.camions).toHaveProperty('LEGER');
      expect(res.body.data.camions).toHaveProperty('LOURD');
    });
  });
});