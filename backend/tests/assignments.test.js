const request = require('supertest');
const app = require('../server');
const prisma = require('../prisma');
const { createAuthCookie } = require('./helpers');

describe('Teacher Assignments Integration Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── Get Assignment Options ─────────────────────────────────────────────────

  describe('GET /api/assignments/options (Assignment Options)', () => {
    it('should reject unauthenticated access with 401', async () => {
      const res = await request(app).get('/api/assignments/options');
      expect(res.statusCode).toBe(401);
    });

    it('should reject Student role from fetching assignment options with 403', async () => {
      const cookie = createAuthCookie({ role: 'Student' });
      const res = await request(app)
        .get('/api/assignments/options')
        .set('Cookie', [cookie]);
      expect(res.statusCode).toBe(403);
    });

    it('should reject Teacher role from fetching assignment options with 403', async () => {
      const cookie = createAuthCookie({ role: 'Teacher' });
      const res = await request(app)
        .get('/api/assignments/options')
        .set('Cookie', [cookie]);
      expect(res.statusCode).toBe(403);
    });

    it('should allow Admin to fetch assignment options', async () => {
      const cookie = createAuthCookie({ role: 'Admin', scopeType: 'BranchAdmin' });
      const res = await request(app)
        .get('/api/assignments/options')
        .set('Cookie', [cookie]);
      expect([200, 503]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        // Must return shape with teachers, classes, subjects, unassigned queues
        expect(res.body).toHaveProperty('teachers');
        expect(res.body).toHaveProperty('classes');
        expect(res.body).toHaveProperty('subjects');
        expect(res.body).toHaveProperty('unassignedSections');
        expect(res.body).toHaveProperty('unassignedClassSubjects');
        expect(Array.isArray(res.body.teachers)).toBe(true);
        expect(Array.isArray(res.body.classes)).toBe(true);
        expect(Array.isArray(res.body.unassignedSections)).toBe(true);
        expect(Array.isArray(res.body.unassignedClassSubjects)).toBe(true);
      }
    });

    it('should allow SuperAdmin to fetch assignment options', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const res = await request(app)
        .get('/api/assignments/options')
        .set('Cookie', [cookie]);
      expect([200, 503]).toContain(res.statusCode);
    }, 30000);
  });

  // ── Get All Assignments ────────────────────────────────────────────────────

  describe('GET /api/assignments (List Assignments)', () => {
    it('should reject unauthenticated access with 401', async () => {
      const res = await request(app).get('/api/assignments');
      expect(res.statusCode).toBe(401);
    });

    it('should reject Teacher role from fetching all assignments with 403', async () => {
      const cookie = createAuthCookie({ role: 'Teacher' });
      const res = await request(app)
        .get('/api/assignments')
        .set('Cookie', [cookie]);
      expect(res.statusCode).toBe(403);
    });

    it('should allow Admin to fetch all assignments', async () => {
      const cookie = createAuthCookie({ role: 'Admin', scopeType: 'BranchAdmin' });
      const res = await request(app)
        .get('/api/assignments')
        .set('Cookie', [cookie]);
      expect([200, 503]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });

  // ── Create Assignment ──────────────────────────────────────────────────────

  describe('POST /api/assignments (Create Assignment)', () => {
    it('should reject unauthenticated assignment creation with 401', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .send({ teacherId: 'abc', classId: 'def', assignmentType: 'SubjectTeacher' });
      expect(res.statusCode).toBe(401);
    });

    it('should reject Student from creating assignments with 403', async () => {
      const cookie = createAuthCookie({ role: 'Student' });
      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', [cookie])
        .send({ teacherId: 'abc', assignmentType: 'SubjectTeacher' });
      expect(res.statusCode).toBe(403);
    });

    it('should reject assignment creation with missing required fields', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', [cookie])
        .send({});
      expect([400, 422, 503]).toContain(res.statusCode);
    });

    it('should reject SubjectTeacher assignment without a subjectId', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', [cookie])
        .send({
          teacherId: '00000000-0000-0000-0000-000000000001',
          classIds: ['00000000-0000-0000-0000-000000000002'],
          assignmentType: 'SubjectTeacher'
          // missing subjectId
        });
      expect([400, 404, 503]).toContain(res.statusCode);
    });

    it('should reject assignment with invalid assignmentType', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', [cookie])
        .send({
          teacherId: '00000000-0000-0000-0000-000000000001',
          classIds: ['00000000-0000-0000-0000-000000000002'],
          assignmentType: 'InvalidType'
        });
      expect([400, 422, 503]).toContain(res.statusCode);
    });
  });

  // ── Delete Assignment ──────────────────────────────────────────────────────

  describe('DELETE /api/assignments/:id (Delete Assignment)', () => {
    it('should reject unauthenticated delete with 401', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app).delete(`/api/assignments/${fakeId}`);
      expect(res.statusCode).toBe(401);
    });

    it('should reject Teacher from deleting assignments with 403', async () => {
      const cookie = createAuthCookie({ role: 'Teacher' });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .delete(`/api/assignments/${fakeId}`)
        .set('Cookie', [cookie]);
      expect(res.statusCode).toBe(403);
    });

    it('should return 404 when deleting a non-existent assignment', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .delete(`/api/assignments/${fakeId}`)
        .set('Cookie', [cookie]);
      expect([404, 503]).toContain(res.statusCode);
    });
  });
});
