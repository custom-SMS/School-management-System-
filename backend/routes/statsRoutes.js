const express = require('express');
const router = express.Router();
const { getAdminStats, getStudentPortalStats, getParentPortalStats, getTeacherPortalStats } = require('../controllers/statsController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Operational school dashboard stats
router.get('/admin', verifyToken, checkRole(['Admin', 'Cashier']), getAdminStats);

// Get current student portal profile, grades, and fee log
router.get('/student/me', verifyToken, checkRole(['Student']), getStudentPortalStats);

// Get teacher portal summary for assigned classes and recent activity
router.get('/teacher/me', verifyToken, checkRole(['Teacher']), getTeacherPortalStats);

// Parent portal summary for linked children
router.get('/parent/me', verifyToken, checkRole(['Parent']), getParentPortalStats);

module.exports = router;