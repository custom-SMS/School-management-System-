const request = require('supertest');
const app = require('../server');
const prisma = require('../prisma');

describe('Authentication API Endpoint Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/login', () => {
    it('should return error status when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect([400, 401, 500]).toContain(res.statusCode);
      expect(res.body).toBeDefined();
    });

    it('should reject invalid user credentials gracefully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'nonexistent.user@school.test',
          password: 'WrongPassword123'
        });

      expect([400, 401, 404]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/auth/permissions/me (Protected Route)', () => {
    it('should deny access (401) when authorization header/token is missing', async () => {
      const res = await request(app).get('/api/auth/permissions/me');
      expect([401, 403]).toContain(res.statusCode);
    });
  });
});
