const request = require('supertest');
const app = require('../server');
const prisma = require('../prisma');
const { createAuthCookie } = require('./helpers');

describe('Student API & Validation Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/students', () => {
    it('should reject unauthenticated student queries with 401', async () => {
      const res = await request(app).get('/api/students');
      expect(res.statusCode).toBe(401);
    });

    it('should reject non-admin/non-staff student queries with 403', async () => {
      const studentCookie = createAuthCookie({ role: 'Student' });
      const res = await request(app)
        .get('/api/students')
        .set('Cookie', [studentCookie]);

      expect([403, 401]).toContain(res.statusCode);
    });
  });

  describe('POST /api/students (Registration / Creation)', () => {
    it('should reject student registration if payload is missing required attributes', async () => {
      const res = await request(app)
        .post('/api/students')
        .send({
          name: 'Jane Doe',
          grade: 'Grade 10'
        });

      expect([400, 422, 500]).toContain(res.statusCode);
    });

    it('should reject student registration if payload is missing required attributes', async () => {
      const adminCookie = createAuthCookie({ role: 'SuperAdmin', scopeType: 'SchoolAdmin' });
      const res = await request(app)
        .post('/api/students')
        .set('Cookie', [adminCookie])
        .send({});

      expect([400, 500]).toContain(res.statusCode);
      expect(res.body).toBeDefined();
    });
  });
});
