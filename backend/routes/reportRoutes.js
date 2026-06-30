const express = require('express');
const router = express.Router();
const {
  getAcademicReport,
  getAttendanceReport,
  getEnrollmentReport,
  getFinancialReport,
} = require('../controllers/reportController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: System Reports
 */

router.use(verifyToken, checkRole(['Admin', 'SuperAdmin']));

/**
 * @swagger
 * /reports/academic:
 *   get:
 *     summary: Get academic report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Academic report data
 */
router.get('/academic', getAcademicReport);

/**
 * @swagger
 * /reports/attendance:
 *   get:
 *     summary: Get attendance report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Attendance report data
 */
router.get('/attendance', getAttendanceReport);

/**
 * @swagger
 * /reports/enrollment:
 *   get:
 *     summary: Get enrollment report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Enrollment report data
 */
router.get('/enrollment', getEnrollmentReport);

/**
 * @swagger
 * /reports/financial:
 *   get:
 *     summary: Get financial report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Financial report data
 */
router.get('/financial', getFinancialReport);

module.exports = router;
