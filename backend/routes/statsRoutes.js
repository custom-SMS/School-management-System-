const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getSuperAdminStats,
  getStudentPortalStats,
  getParentPortalStats,
  getTeacherPortalStats
} = require('../controllers/statsController');
const { verifyToken, checkRole, injectBranchFilter } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Stats
 *   description: Dashboard Statistics
 */

router.use(verifyToken);

// Get Director/Admin 3-Card Dashboard Stats
/**
 * @swagger
 * /stats/admin:
 *   get:
 *     summary: Get Admin dashboard statistics
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats for Admin
 */
router.get('/admin', checkRole(['Admin', 'SuperAdmin', 'Cashier']), injectBranchFilter, getAdminStats);

// Get SuperAdmin dashboard stats
/**
 * @swagger
 * /stats/superadmin:
 *   get:
 *     summary: Get SuperAdmin dashboard statistics
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats for SuperAdmin
 */
router.get('/superadmin', checkRole(['SuperAdmin']), injectBranchFilter, getSuperAdminStats);

// Get current student portal profile, grades, and fee log
/**
 * @swagger
 * /stats/student/me:
 *   get:
 *     summary: Get student portal statistics
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: childStudentId
 *         schema:
 *           type: string
 *         description: Required for Parent role
 *     responses:
 *       200:
 *         description: Dashboard stats for Student
 */
router.get('/student/me', checkRole(['Student', 'Parent', 'SuperAdmin']), getStudentPortalStats);

// Get teacher portal summary for assigned classes and recent activity
/**
 * @swagger
 * /stats/teacher/me:
 *   get:
 *     summary: Get teacher portal statistics
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats for Teacher
 */
router.get('/teacher/me', checkRole(['Teacher', 'Admin', 'SuperAdmin']), getTeacherPortalStats);

// Parent portal summary for linked children
/**
 * @swagger
 * /stats/parent/me:
 *   get:
 *     summary: Get parent portal statistics
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats for Parent
 */
router.get('/parent/me', checkRole(['Parent', 'SuperAdmin']), getParentPortalStats);

module.exports = router;