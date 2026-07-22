const request = require('supertest');
const app = require('../server');
const prisma = require('../prisma');
const { createAuthCookie } = require('./helpers');

describe('Grading API & Validation Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/classroom/grades/:classId/:subject', () => {
    it('should reject unauthenticated access to class grades with 401', async () => {
      const res = await request(app).get('/api/classroom/grades/class-123/Math');
      expect(res.statusCode).toBe(401);
    });

    it('should reject Student attempt to view class grade sheet with 403', async () => {
      const studentCookie = createAuthCookie({ role: 'Student' });
      const res = await request(app)
        .get('/api/classroom/grades/class-123/Math')
        .set('Cookie', [studentCookie]);

      expect([403, 401]).toContain(res.statusCode);
    });
  });

  describe('POST /api/classroom/grades (Grade Submission)', () => {
    it('should reject grade submission when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/classroom/grades')
        .send({
          classId: 'class-123',
          subject: 'Math',
          gradesData: []
        });

      expect(res.statusCode).toBe(401);
    });

    it('should reject grade submission with empty/malformed payload', async () => {
      const teacherCookie = createAuthCookie({ role: 'Teacher' });
      const res = await request(app)
        .post('/api/classroom/grades')
        .set('Cookie', [teacherCookie])
        .send({});

      expect([400, 500]).toContain(res.statusCode);
      expect(res.body).toBeDefined();
    });
  });
});
