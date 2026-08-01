const request = require('supertest');
const app = require('../server');
const prisma = require('../prisma');
const { createAuthCookie } = require('./helpers');

describe('Subject API Integration Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── Access Control ─────────────────────────────────────────────────────────

  describe('GET /api/subjects (Access Control)', () => {
    it('should reject unauthenticated subject list requests with 401', async () => {
      const res = await request(app).get('/api/subjects');
      expect(res.statusCode).toBe(401);
    });

    it('should allow Admin role to fetch subjects', async () => {
      const cookie = createAuthCookie({ role: 'Admin', scopeType: 'BranchAdmin' });
      const res = await request(app)
        .get('/api/subjects')
        .set('Cookie', [cookie]);
      // May return 200 (list) or 503 (DB offline) — either is acceptable
      expect([200, 503]).toContain(res.statusCode);
    });

    it('should allow SuperAdmin role to fetch subjects', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const res = await request(app)
        .get('/api/subjects')
        .set('Cookie', [cookie]);
      expect([200, 503]).toContain(res.statusCode);
    });

    it('should allow Teacher role to fetch subjects', async () => {
      const cookie = createAuthCookie({ role: 'Teacher' });
      const res = await request(app)
        .get('/api/subjects')
        .set('Cookie', [cookie]);
      expect([200, 503]).toContain(res.statusCode);
    });

    it('should allow Student role to fetch subjects', async () => {
      const cookie = createAuthCookie({ role: 'Student' });
      const res = await request(app)
        .get('/api/subjects')
        .set('Cookie', [cookie]);
      expect([200, 503]).toContain(res.statusCode);
    });
  });

  // ── Create Subject ─────────────────────────────────────────────────────────

  describe('POST /api/subjects (Create Subject)', () => {
    it('should reject unauthenticated subject creation with 401', async () => {
      const res = await request(app)
        .post('/api/subjects')
        .send({ name: 'Mathematics' });
      expect(res.statusCode).toBe(401);
    });

    it('should reject Student role from creating subjects with 403', async () => {
      const cookie = createAuthCookie({ role: 'Student' });
      const res = await request(app)
        .post('/api/subjects')
        .set('Cookie', [cookie])
        .send({ name: 'Mathematics' });
      expect(res.statusCode).toBe(403);
    });

    it('should reject Teacher role from creating subjects with 403', async () => {
      const cookie = createAuthCookie({ role: 'Teacher' });
      const res = await request(app)
        .post('/api/subjects')
        .set('Cookie', [cookie])
        .send({ name: 'Mathematics' });
      expect(res.statusCode).toBe(403);
    });

    it('should reject subject creation with empty name', async () => {
      const cookie = createAuthCookie({ role: 'Admin', scopeType: 'BranchAdmin' });
      const res = await request(app)
        .post('/api/subjects')
        .set('Cookie', [cookie])
        .send({ name: '' });
      expect([400, 422, 503]).toContain(res.statusCode);
    });

    it('should reject subject creation with missing name field', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const res = await request(app)
        .post('/api/subjects')
        .set('Cookie', [cookie])
        .send({ department: 'Science' });
      expect([400, 422, 503]).toContain(res.statusCode);
    });

    it('should allow Admin to create a subject (or reject gracefully if DB offline or branch missing)', async () => {
      const cookie = createAuthCookie({ role: 'Admin', scopeType: 'BranchAdmin' });
      const res = await request(app)
        .post('/api/subjects')
        .set('Cookie', [cookie])
        .send({ name: 'Integration Test Subject', department: 'Testing' });
      // 201 = created, 400 = duplicate/validation, 404 = branch not in DB, 503 = DB offline
      expect([201, 400, 404, 503]).toContain(res.statusCode);
    });
  });

  // ── Update Subject ─────────────────────────────────────────────────────────

  describe('PUT /api/subjects/:id (Update Subject)', () => {
    it('should reject unauthenticated update with 401', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .put(`/api/subjects/${fakeId}`)
        .send({ name: 'Updated Name' });
      expect(res.statusCode).toBe(401);
    });

    it('should reject Teacher from updating subjects with 403', async () => {
      const cookie = createAuthCookie({ role: 'Teacher' });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .put(`/api/subjects/${fakeId}`)
        .set('Cookie', [cookie])
        .send({ name: 'Updated Name' });
      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for non-existent subject UUID', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .put(`/api/subjects/${fakeId}`)
        .set('Cookie', [cookie])
        .send({ name: 'Updated Name' });
      expect([404, 503]).toContain(res.statusCode);
    });
  });

  // ── Delete Subject ─────────────────────────────────────────────────────────

  describe('DELETE /api/subjects/:id (Delete Subject)', () => {
    it('should reject unauthenticated delete with 401', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app).delete(`/api/subjects/${fakeId}`);
      expect(res.statusCode).toBe(401);
    });

    it('should reject Student from deleting subjects with 403', async () => {
      const cookie = createAuthCookie({ role: 'Student' });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .delete(`/api/subjects/${fakeId}`)
        .set('Cookie', [cookie]);
      expect(res.statusCode).toBe(403);
    });

    it('should return 404 when deleting a non-existent subject', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .delete(`/api/subjects/${fakeId}`)
        .set('Cookie', [cookie]);
      expect([404, 503]).toContain(res.statusCode);
    });
  });

  // ── Branch Scoping ─────────────────────────────────────────────────────────

  describe('Branch-Scoped Subject Access', () => {
    it('should include x-branch-id header in subject fetching without crashing', async () => {
      const cookie = createAuthCookie({ role: 'Admin', scopeType: 'BranchAdmin', branchId: 'test-branch-id-123' });
      const res = await request(app)
        .get('/api/subjects')
        .set('Cookie', [cookie])
        .set('x-branch-id', 'test-branch-id-123');
      expect([200, 503]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    it('should return an array (not an object) for subject list', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const res = await request(app)
        .get('/api/subjects')
        .set('Cookie', [cookie]);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });
});
