// tests/unit/health.test.js
require('../helpers/setup');
const request = require('supertest');
const app = require('../../src/app');

describe('API Health & Routes de base', () => {

  describe('GET /health', () => {
    it('devrait retourner le statut de l\'API', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('SAYGOO API opérationnelle');
      expect(res.body.version).toBe('1.0.0');
    });
  });

  describe('Routes inexistantes', () => {
    it('devrait retourner 404 pour une route inexistante', async () => {
      const res = await request(app).get('/api/v1/route-inexistante');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/docs', () => {
    it('devrait servir la documentation Swagger', async () => {
      const res = await request(app).get('/api/docs/');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/docs.json', () => {
    it('devrait retourner la spec OpenAPI en JSON', async () => {
      const res = await request(app).get('/api/docs.json');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('openapi');
      expect(res.body.info.title).toBe('SAYGOO API');
      expect(Array.isArray(res.body.tags)).toBe(true);
    });
  });
});