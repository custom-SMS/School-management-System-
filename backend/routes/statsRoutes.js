const express = require('express');
const router = express.Router();
const { 
  getAdminStats, 
  getSuperAdminStats,
  getStudentPortalStats, 
  getParentPortalStats, 
  getTeacherPortalStats 
} = require('../controllers/statsController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Get Director/Admin 3-Card Dashboard Stats
router.get('/admin', checkRole(['Admin', 'SuperAdmin', 'Cashier']), getAdminStats);

// Get SuperAdmin dashboard stats
router.get('/superadmin', checkRole(['SuperAdmin']), getSuperAdminStats);

// Get current student portal profile, grades, and fee log
router.get('/student/me', checkRole(['Student', 'Parent', 'SuperAdmin']), getStudentPortalStats);

// Get teacher portal summary for assigned classes and recent activity
router.get('/teacher/me', checkRole(['Teacher', 'Admin', 'SuperAdmin']), getTeacherPortalStats);

// Parent portal summary for linked children
router.get('/parent/me', checkRole(['Parent', 'SuperAdmin']), getParentPortalStats);

module.exports = router;