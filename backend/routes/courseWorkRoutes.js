const express = require('express');
const router = express.Router();
const {
  // Teacher metadata
  getTeacherClasses,
  // Teacher — assignments
  getMyAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getSubmissions,
  gradeSubmission,
  // Teacher — materials
  getMyMaterials,
  createMaterial,
  deleteMaterial,
  // Admin oversight
  adminOverview,
  adminAllAssignments,
  adminAllMaterials,
  adminTeacherCompliance,
  // Student & Parent
  studentAssignments,
  studentMaterials,
  submitAssignment,
  trackDownload,
} = require('../controllers/courseWorkController');

const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// ── Teacher ──────────────────────────────────────────────────────────────────
router.get('/teacher/classes',             checkRole(['Teacher', 'SuperAdmin']), getTeacherClasses);
router.get('/teacher/assignments',         checkRole(['Teacher', 'SuperAdmin']), getMyAssignments);
router.post('/assignments',                checkRole(['Teacher', 'SuperAdmin']), createAssignment);
router.put('/assignments/:id',             checkRole(['Teacher', 'SuperAdmin']), updateAssignment);
router.delete('/assignments/:id',          checkRole(['Teacher', 'SuperAdmin']), deleteAssignment);
router.get('/assignments/:id/submissions', checkRole(['Teacher', 'SuperAdmin']), getSubmissions);
router.post('/submissions/:id/grade',      checkRole(['Teacher', 'SuperAdmin']), gradeSubmission);

router.get('/teacher/materials',           checkRole(['Teacher', 'SuperAdmin']), getMyMaterials);
router.post('/materials',                  checkRole(['Teacher', 'SuperAdmin']), createMaterial);
router.delete('/materials/:id',            checkRole(['Teacher', 'SuperAdmin']), deleteMaterial);

// ── Admin Oversight ───────────────────────────────────────────────────────────
router.get('/admin/overview',              checkRole(['SuperAdmin', 'Admin']), adminOverview);
router.get('/admin/all-assignments',       checkRole(['SuperAdmin', 'Admin']), adminAllAssignments);
router.get('/admin/all-materials',         checkRole(['SuperAdmin', 'Admin']), adminAllMaterials);
router.get('/admin/teacher-compliance',    checkRole(['SuperAdmin', 'Admin']), adminTeacherCompliance);

// ── Student & Parent ──────────────────────────────────────────────────────────
router.get('/student/assignments',         checkRole(['Student', 'Parent', 'SuperAdmin', 'Admin']), studentAssignments);
router.get('/student/materials',           checkRole(['Student', 'Parent', 'SuperAdmin', 'Admin']), studentMaterials);
router.post('/assignments/:id/submit',     checkRole(['Student', 'SuperAdmin']), submitAssignment);
router.post('/materials/:id/download',     trackDownload);

module.exports = router;
