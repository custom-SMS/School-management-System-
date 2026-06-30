const express = require('express');
const router = express.Router();
const {
  compileReportCards,
  getReportCard,
  publishReportCards,
  updateReportComments,
  setPromotionStatus,
  getReportCardsByClass
} = require('../controllers/reportCardController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Report Cards
 *   description: Report Card Management
 */

// Compile report cards (Admin/SuperAdmin)
/**
 * @swagger
 * /report-cards/compile:
 *   post:
 *     summary: Compile report cards for an academic year
 *     tags: [Report Cards]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               academicYearId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Report cards compiled
 */
router.post('/compile', verifyToken, checkRole(['SuperAdmin', 'Admin']), compileReportCards);

// Publish report cards (Admin/SuperAdmin)
/**
 * @swagger
 * /report-cards/publish:
 *   post:
 *     summary: Publish report cards
 *     tags: [Report Cards]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               academicYearId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report cards published
 */
router.post('/publish', verifyToken, checkRole(['SuperAdmin', 'Admin']), publishReportCards);

// Get report card for a specific student + academic year
/**
 * @swagger
 * /report-cards/{studentId}/{academicYearId}:
 *   get:
 *     summary: Get report card for a specific student and academic year
 *     tags: [Report Cards]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: academicYearId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report card details
 */
router.get('/:studentId/:academicYearId', verifyToken, getReportCard);

// Add/update teacher comments on a report card
/**
 * @swagger
 * /report-cards/{id}/comments:
 *   patch:
 *     summary: Add or update teacher comments
 *     tags: [Report Cards]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comments updated
 */
router.patch('/:id/comments', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), updateReportComments);

// Homeroom Teacher/Admin promote student
/**
 * @swagger
 * /report-cards/{id}/promote:
 *   patch:
 *     summary: Set promotion status for a student
 *     tags: [Report Cards]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               promotionStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Promotion status updated
 */
router.patch('/:id/promote', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), setPromotionStatus);

// Get all report cards for a class
/**
 * @swagger
 * /report-cards/class/{classId}/{academicYearId}:
 *   get:
 *     summary: Get all report cards for a class
 *     tags: [Report Cards]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: academicYearId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of report cards
 */
router.get('/class/:classId/:academicYearId', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), getReportCardsByClass);

module.exports = router;
