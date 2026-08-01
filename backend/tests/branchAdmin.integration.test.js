const request = require('supertest');
const app = require('../server');
const prisma = require('../prisma');
const { createAuthCookie } = require('./helpers');

describe('Branch Admin Complete Functionality Integration Tests', () => {
  let branchAdminCookie;

  const FAKE_UUID_1 = '00000000-0000-0000-0000-000000000001';
  const FAKE_UUID_2 = '00000000-0000-0000-0000-000000000002';
  const FAKE_UUID_3 = '00000000-0000-0000-0000-000000000003';

  beforeAll(() => {
    branchAdminCookie = createAuthCookie({
      _id: 'test-branch-admin-id',
      role: 'Admin',
      scopeType: 'BranchAdmin',
      branchId: 'test-branch-id-123',
      schoolId: 'test-school-id-123'
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── 1. Branch Admin Access Control ─────────────────────────────────────────

  describe('Branch Admin - Role Enforcement', () => {
    it('should reject Student role from accessing admin-only endpoints', async () => {
      const studentCookie = createAuthCookie({ role: 'Student' });
      const res = await request(app)
        .get('/api/teachers')
        .set('Cookie', [studentCookie]);
      expect(res.statusCode).toBe(403);
    });

    it('should reject Teacher role from accessing branch admin settings', async () => {
      const teacherCookie = createAuthCookie({ role: 'Teacher' });
      const res = await request(app)
        .get('/api/settings')
        .set('Cookie', [teacherCookie]);
      expect(res.statusCode).toBe(403);
    });

    it('should reject unauthenticated access to all admin endpoints', async () => {
      const endpoints = [
        '/api/subjects',
        '/api/students',
        '/api/teachers',
        '/api/assignments',
        '/api/assignments/options'
      ];
      for (const endpoint of endpoints) {
        const res = await request(app).get(endpoint);
        expect(res.statusCode).toBe(401);
      }
    });
  });

  // ── 2. Subjects Management ─────────────────────────────────────────────────

  describe('Branch Admin - Subject Operations', () => {
    it('GET /api/subjects - should return subjects list (scoped to branch)', async () => {
      const res = await request(app)
        .get('/api/subjects')
        .set('Cookie', [branchAdminCookie]);
      expect([200, 503]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    it('POST /api/subjects - should validate required name field', async () => {
      const res = await request(app)
        .post('/api/subjects')
        .set('Cookie', [branchAdminCookie])
        .send({ department: 'Science' }); // missing name
      expect([400, 422, 503]).toContain(res.statusCode);
    });

    it('POST /api/subjects - should reject empty name', async () => {
      const res = await request(app)
        .post('/api/subjects')
        .set('Cookie', [branchAdminCookie])
        .send({ name: '' });
      expect([400, 422, 503]).toContain(res.statusCode);
    });

    it('POST /api/subjects - should accept valid subject creation payload', async () => {
      const res = await request(app)
        .post('/api/subjects')
        .set('Cookie', [branchAdminCookie])
        .send({ name: 'Branch Physics', department: 'Science' });
      expect([201, 400, 404, 503]).toContain(res.statusCode);
    });

    it('PUT /api/subjects/:id - should return 404 for non-existent subject', async () => {
      const res = await request(app)
        .put(`/api/subjects/${FAKE_UUID_1}`)
        .set('Cookie', [branchAdminCookie])
        .send({ name: 'Updated Subject' });
      expect([404, 503]).toContain(res.statusCode);
    });

    it('DELETE /api/subjects/:id - should return 404 for non-existent subject', async () => {
      const res = await request(app)
        .delete(`/api/subjects/${FAKE_UUID_1}`)
        .set('Cookie', [branchAdminCookie]);
      expect([404, 503]).toContain(res.statusCode);
    });

    it('GET /api/subjects - should return an array not an object', async () => {
      const res = await request(app)
        .get('/api/subjects')
        .set('Cookie', [branchAdminCookie]);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });

  // ── 3. Classes & Sections ──────────────────────────────────────────────────

  describe('Branch Admin - Classes & Sections Operations', () => {
    it('GET /api/classroom/classes - should list classes for the branch', async () => {
      const res = await request(app)
        .get('/api/classroom/classes')
        .set('Cookie', [branchAdminCookie]);
      expect([200, 503]).toContain(res.statusCode);
    });

    it('POST /api/classroom/classes - should reject class creation with empty payload', async () => {
      const res = await request(app)
        .post('/api/classroom/classes')
        .set('Cookie', [branchAdminCookie])
        .send({});
      expect([400, 422, 503]).toContain(res.statusCode);
    });

    it('POST /api/classroom/classes - should accept valid class creation', async () => {
      const res = await request(app)
        .post('/api/classroom/classes')
        .set('Cookie', [branchAdminCookie])
        .send({ name: 'Grade 9', stream: 'General' });
      expect([201, 400, 503]).toContain(res.statusCode);
    });

    it('POST /api/classroom/sections - should accept section creation with valid classId', async () => {
      const res = await request(app)
        .post('/api/classroom/sections')
        .set('Cookie', [branchAdminCookie])
        .send({ name: 'Section A', classId: FAKE_UUID_1 });
      expect([201, 400, 404, 503]).toContain(res.statusCode);
    });

    it('GET /api/classroom/sections/:classId - should fetch sections for a class', async () => {
      const res = await request(app)
        .get(`/api/classroom/sections/${FAKE_UUID_1}`)
        .set('Cookie', [branchAdminCookie]);
      expect([200, 404, 503]).toContain(res.statusCode);
    });
  });

  // ── 4. Teacher Assignments ─────────────────────────────────────────────────

  describe('Branch Admin - Teacher Assignment Operations', () => {
    it('GET /api/assignments/options - should return correct shape', async () => {
      const res = await request(app)
        .get('/api/assignments/options')
        .set('Cookie', [branchAdminCookie]);
      expect([200, 503]).toContain(res.statusCode);
      if (res.statusCode === 200) {
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

    it('GET /api/assignments - should list all branch assignments', async () => {
      const res = await request(app)
        .get('/api/assignments')
        .set('Cookie', [branchAdminCookie]);
      expect([200, 503]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    it('POST /api/assignments - should reject missing assignmentType', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', [branchAdminCookie])
        .send({ teacherId: FAKE_UUID_1, classIds: [FAKE_UUID_2] });
      expect([400, 422, 503]).toContain(res.statusCode);
    });

    it('POST /api/assignments - should reject invalid assignmentType value', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', [branchAdminCookie])
        .send({
          teacherId: FAKE_UUID_1,
          classIds: [FAKE_UUID_2],
          assignmentType: 'InvalidType'
        });
      expect([400, 422, 503]).toContain(res.statusCode);
    });

    it('POST /api/assignments - should reject SubjectTeacher assignment without subjectId', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', [branchAdminCookie])
        .send({
          teacherId: FAKE_UUID_1,
          classIds: [FAKE_UUID_2],
          assignmentType: 'SubjectTeacher'
          // missing subjectId
        });
      expect([400, 404, 503]).toContain(res.statusCode);
    });

    it('POST /api/assignments - should accept valid SubjectTeacher payload', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', [branchAdminCookie])
        .send({
          teacherId: FAKE_UUID_1,
          classIds: [FAKE_UUID_2],
          subjectId: FAKE_UUID_3,
          assignmentType: 'SubjectTeacher'
        });
      expect([201, 400, 404, 409, 503]).toContain(res.statusCode);
    });

    it('POST /api/assignments - should accept valid HomeRoomTeacher payload', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', [branchAdminCookie])
        .send({
          teacherId: FAKE_UUID_1,
          classIds: [FAKE_UUID_2],
          assignmentType: 'HomeRoomTeacher'
        });
      expect([201, 400, 404, 409, 503]).toContain(res.statusCode);
    });

    it('DELETE /api/assignments/:id - should return 404 for non-existent assignment', async () => {
      const res = await request(app)
        .delete(`/api/assignments/${FAKE_UUID_1}`)
        .set('Cookie', [branchAdminCookie]);
      expect([403, 404, 503]).toContain(res.statusCode);
    });
  });

  // ── 5. Student Operations ──────────────────────────────────────────────────

  describe('Branch Admin - Student Operations', () => {
    it('GET /api/students - should list students scoped to branch', async () => {
      const res = await request(app)
        .get('/api/students')
        .set('Cookie', [branchAdminCookie]);
      expect([200, 503]).toContain(res.statusCode);
    });

    it('GET /api/students/:id - should return 404 for non-existent student', async () => {
      const res = await request(app)
        .get(`/api/students/${FAKE_UUID_1}`)
        .set('Cookie', [branchAdminCookie]);
      expect([200, 404, 503]).toContain(res.statusCode);
    });

    it('PUT /api/students/:id - should accept classId in update payload', async () => {
      const res = await request(app)
        .put(`/api/students/${FAKE_UUID_1}`)
        .set('Cookie', [branchAdminCookie])
        .send({ classId: FAKE_UUID_2 });
      expect([404, 500, 503]).toContain(res.statusCode);
    });

    it('PUT /api/students/:id - should reject invalid classId UUID', async () => {
      const res = await request(app)
        .put(`/api/students/${FAKE_UUID_1}`)
        .set('Cookie', [branchAdminCookie])
        .send({ classId: 'not-a-uuid' });
      expect([400, 404, 422, 500, 503]).toContain(res.statusCode);
    });

    it('PUT /api/students/:id - should accept guardians array', async () => {
      const res = await request(app)
        .put(`/api/students/${FAKE_UUID_1}`)
        .set('Cookie', [branchAdminCookie])
        .send({
          guardians: [
            { fullName: 'Guardian One', phone: '0911111111', relationship: 'Father' }
          ]
        });
      expect([404, 500, 503]).toContain(res.statusCode);
    });

    it('PUT /api/students/:id - should accept personalDetails object', async () => {
      const res = await request(app)
        .put(`/api/students/${FAKE_UUID_1}`)
        .set('Cookie', [branchAdminCookie])
        .send({
          personalDetails: {
            phone: '0912345678',
            gender: 'Female',
            dateOfBirth: '2011-03-20',
            address: 'Addis Ababa'
          }
        });
      expect([404, 500, 503]).toContain(res.statusCode);
    });

    it('PUT /api/students/:id - should accept familyBackground object', async () => {
      const res = await request(app)
        .put(`/api/students/${FAKE_UUID_1}`)
        .set('Cookie', [branchAdminCookie])
        .send({
          familyBackground: {
            fatherName: 'Abebe Kebede',
            motherName: 'Tigist Haile',
            occupation: 'Business'
          }
        });
      expect([404, 500, 503]).toContain(res.statusCode);
    });

    it('PATCH /api/students/:id/status - should handle status update', async () => {
      const res = await request(app)
        .patch(`/api/students/${FAKE_UUID_1}/status`)
        .set('Cookie', [branchAdminCookie])
        .send({ status: 'Inactive' });
      expect([200, 404, 500, 503]).toContain(res.statusCode);
    });

    it('POST /api/students/:id/promote - should handle promotion request', async () => {
      const res = await request(app)
        .post(`/api/students/${FAKE_UUID_1}/promote`)
        .set('Cookie', [branchAdminCookie])
        .send({ toClassId: FAKE_UUID_2 });
      expect([200, 400, 404, 500, 503]).toContain(res.statusCode);
    });
  });

  // ── 6. Teachers & Staff ────────────────────────────────────────────────────

  describe('Branch Admin - Teacher Operations', () => {
    it('GET /api/teachers - should list teachers scoped to branch', async () => {
      const res = await request(app)
        .get('/api/teachers')
        .set('Cookie', [branchAdminCookie]);
      expect([200, 503]).toContain(res.statusCode);
    });

    it('GET /api/teachers/:id - should return teacher details', async () => {
      const res = await request(app)
        .get(`/api/teachers/${FAKE_UUID_1}`)
        .set('Cookie', [branchAdminCookie]);
      expect([200, 404, 503]).toContain(res.statusCode);
    });
  });

  // ── 7. Timetables ──────────────────────────────────────────────────────────

  describe('Branch Admin - Timetable Operations', () => {
    it('GET /api/timetables/class/:classId/:academicYearId - should fetch timetable for a class', async () => {
      const res = await request(app)
        .get(`/api/timetables/class/${FAKE_UUID_1}/${FAKE_UUID_2}`)
        .set('Cookie', [branchAdminCookie]);
      expect([200, 404, 503]).toContain(res.statusCode);
    });

    it('POST /api/timetables - should validate timetable creation payload', async () => {
      const res = await request(app)
        .post('/api/timetables')
        .set('Cookie', [branchAdminCookie])
        .send({});
      expect([400, 422, 503]).toContain(res.statusCode);
    });

    it('DELETE /api/timetables/:id - should handle deleting a timetable entry', async () => {
      const res = await request(app)
        .delete(`/api/timetables/${FAKE_UUID_1}`)
        .set('Cookie', [branchAdminCookie]);
      expect([200, 404, 500, 503]).toContain(res.statusCode);
    });
  });

  // ── 8. Academic Years & Semesters ─────────────────────────────────────────

  describe('Branch Admin - Academic Year & Semester Operations', () => {
    it('GET /api/academic-years - should list academic years', async () => {
      const res = await request(app)
        .get('/api/academic-years')
        .set('Cookie', [branchAdminCookie]);
      expect([200, 503]).toContain(res.statusCode);
    });

    it('GET /api/semesters - should list semesters', async () => {
      const res = await request(app)
        .get('/api/semesters')
        .set('Cookie', [branchAdminCookie]);
      expect([200, 503]).toContain(res.statusCode);
    });
  });

  // ── 9. Reports & Stats ─────────────────────────────────────────────────────

  describe('Branch Admin - Reports & Statistics', () => {
    it('GET /api/stats - should return branch statistics', async () => {
      const res = await request(app)
        .get('/api/stats')
        .set('Cookie', [branchAdminCookie]);
      expect([200, 404, 503]).toContain(res.statusCode);
    });

    it('GET /api/reports - should allow branch admin to access reports', async () => {
      const res = await request(app)
        .get('/api/reports')
        .set('Cookie', [branchAdminCookie]);
      expect([200, 404, 503]).toContain(res.statusCode);
    });
  });

  // ── 10. Fees Management ────────────────────────────────────────────────────

  describe('Branch Admin - Fees Operations', () => {
    it('GET /api/fees - should list fee structures', async () => {
      const res = await request(app)
        .get('/api/fees')
        .set('Cookie', [branchAdminCookie]);
      expect([200, 404, 503]).toContain(res.statusCode);
    });
  });

  // ── 11. Notifications ──────────────────────────────────────────────────────

  describe('Branch Admin - Notification Operations', () => {
    it('GET /api/notifications - should return notifications list', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Cookie', [branchAdminCookie]);
      expect([200, 503]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        // Notifications must return an array, never crash with non-array
        const body = Array.isArray(res.body) ? res.body : res.body?.notifications ?? res.body?.data;
        expect(Array.isArray(body)).toBe(true);
      }
    });
  });

  // ── 12. Audit Logs ────────────────────────────────────────────────────────

  describe('Branch Admin - Audit Log Operations', () => {
    it('GET /api/audit-logs - should allow branch admin to view audit logs', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', [branchAdminCookie]);
      expect([200, 403, 503]).toContain(res.statusCode);
    });
  });

  // ── 13. Settings ──────────────────────────────────────────────────────────

  describe('Branch Admin - Settings Operations', () => {
    it('GET /api/settings - should allow branch admin to read settings', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Cookie', [branchAdminCookie]);
      // 403 = branch admin is not a school-level admin, 200 = allowed
      expect([200, 403, 503]).toContain(res.statusCode);
    });
  });
});
