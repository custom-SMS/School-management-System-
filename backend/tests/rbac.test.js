const request = require('supertest');
const app = require('../server');
const prisma = require('../prisma');
const { createAuthCookie } = require('./helpers');

describe('Role-Based Access Control (RBAC) & Scope Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/settings (Admin-only Endpoint)', () => {
    it('should deny unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Access Denied/i);
    });

    it('should deny Student role access to settings with 403', async () => {
      const studentCookie = createAuthCookie({ role: 'Student' });
      const res = await request(app)
        .get('/api/settings')
        .set('Cookie', [studentCookie]);

      expect([403, 401]).toContain(res.statusCode);
      expect(res.body.message).toMatch(/Access Denied|Insufficient/i);
    });

    it('should deny Teacher role access to admin settings with 403', async () => {
      const teacherCookie = createAuthCookie({ role: 'Teacher' });
      const res = await request(app)
        .get('/api/settings')
        .set('Cookie', [teacherCookie]);

      expect([403, 401]).toContain(res.statusCode);
      expect(res.body.message).toMatch(/Access Denied|Insufficient/i);
    });
  });

  describe('GET /api/teachers (Restricted Staff Route)', () => {
    it('should deny Student role from accessing teacher list with 403', async () => {
      const studentCookie = createAuthCookie({ role: 'Student' });
      const res = await request(app)
        .get('/api/teachers')
        .set('Cookie', [studentCookie]);

      expect([403, 401]).toContain(res.statusCode);
    });
  });
});
