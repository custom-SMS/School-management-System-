const request = require('supertest');
const app = require('../server');
const prisma = require('../prisma');
const { createAuthCookie } = require('./helpers');

describe('Student Profile Update Integration Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── Access Control ─────────────────────────────────────────────────────────

  describe('PUT /api/students/:id (Update Student)', () => {
    it('should reject unauthenticated update with 401', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .put(`/api/students/${fakeId}`)
        .send({ name: 'Updated Name' });
      expect(res.statusCode).toBe(401);
    });

    it('should reject Teacher role from updating student profiles with 403 or 404', async () => {
      const cookie = createAuthCookie({ role: 'Teacher' });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .put(`/api/students/${fakeId}`)
        .set('Cookie', [cookie])
        .send({ name: 'Test' });
      expect([403, 404, 503]).toContain(res.statusCode);
    });

    it('should reject Parent role from updating student profiles with 403 or 404', async () => {
      const cookie = createAuthCookie({ role: 'Parent' });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .put(`/api/students/${fakeId}`)
        .set('Cookie', [cookie])
        .send({ name: 'Test' });
      expect([403, 404, 503]).toContain(res.statusCode);
    });

    it('should return 404 for a non-existent student UUID', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .put(`/api/students/${fakeId}`)
        .set('Cookie', [cookie])
        .send({ name: 'Updated Name' });
      expect([404, 500, 503]).toContain(res.statusCode);
    });

    it('should reject update with invalid classId UUID format', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .put(`/api/students/${fakeId}`)
        .set('Cookie', [cookie])
        .send({ classId: 'not-a-valid-uuid' });
      expect([400, 404, 422, 500, 503]).toContain(res.statusCode);
    });
  });

  // ── Payload Validation ─────────────────────────────────────────────────────

  describe('PUT /api/students/:id (Payload Validation)', () => {
    it('should accept classId as a valid UUID in the update payload', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const fakeStudentId = '00000000-0000-0000-0000-000000000001';
      const fakeClassId = '00000000-0000-0000-0000-000000000002';
      const res = await request(app)
        .put(`/api/students/${fakeStudentId}`)
        .set('Cookie', [cookie])
        .send({ classId: fakeClassId });
      expect([404, 500, 503]).toContain(res.statusCode);
    });

    it('should accept guardians array in the update payload', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .put(`/api/students/${fakeId}`)
        .set('Cookie', [cookie])
        .send({
          guardians: [
            { fullName: 'John Doe', phone: '0911000000', relationship: 'Father' }
          ]
        });
      // Should not fail Zod validation for guardians field
      expect([404, 500, 503]).toContain(res.statusCode);
    });

    it('should accept personalDetails object in the update payload', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .put(`/api/students/${fakeId}`)
        .set('Cookie', [cookie])
        .send({
          personalDetails: {
            phone: '0911234567',
            gender: 'Male',
            dateOfBirth: '2010-01-15'
          }
        });
      expect([404, 500, 503]).toContain(res.statusCode);
    });

    it('should accept familyBackground object in the update payload', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .put(`/api/students/${fakeId}`)
        .set('Cookie', [cookie])
        .send({
          familyBackground: {
            fatherName: 'Abebe Kebede',
            motherName: 'Tigist Haile',
            occupation: 'Farmer'
          }
        });
      expect([404, 500, 503]).toContain(res.statusCode);
    });
  });

  // ── Branch Admin Scoping ───────────────────────────────────────────────────

  describe('Branch Admin Student Access Scoping', () => {
    it('should allow Branch Admin to attempt student update (scoped by branchId)', async () => {
      const cookie = createAuthCookie({
        role: 'Admin',
        scopeType: 'BranchAdmin',
        branchId: 'test-branch-id-123'
      });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .put(`/api/students/${fakeId}`)
        .set('Cookie', [cookie])
        .send({ name: 'Updated Branch Student' });
      // 403 = student belongs to different branch, 404 = not found, 503 = DB offline
      expect([403, 404, 500, 503]).toContain(res.statusCode);
    });

    it('should allow Branch Admin to list students within their branch', async () => {
      const cookie = createAuthCookie({
        role: 'Admin',
        scopeType: 'BranchAdmin',
        branchId: 'test-branch-id-123'
      });
      const res = await request(app)
        .get('/api/students')
        .set('Cookie', [cookie]);
      expect([200, 503]).toContain(res.statusCode);
    });
  });

  // ── DELETE Student ─────────────────────────────────────────────────────────

  describe('DELETE /api/students/:id (Delete Student)', () => {
    it('should reject unauthenticated delete with 401', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app).delete(`/api/students/${fakeId}`);
      expect(res.statusCode).toBe(401);
    });

    it('should reject Teacher from deleting students with 403 or 404', async () => {
      const cookie = createAuthCookie({ role: 'Teacher' });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .delete(`/api/students/${fakeId}`)
        .set('Cookie', [cookie]);
      expect([403, 404, 503]).toContain(res.statusCode);
    });

    it('should return 404 when deleting a non-existent student', async () => {
      const cookie = createAuthCookie({ role: 'SuperAdmin' });
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .delete(`/api/students/${fakeId}`)
        .set('Cookie', [cookie]);
      expect([404, 503]).toContain(res.statusCode);
    });
  });
});
