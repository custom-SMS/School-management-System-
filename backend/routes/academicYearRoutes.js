const express = require('express');

const { globalCacheMiddleware } = require('../middleware/globalCacheMiddleware');
const { setCacheResource, invalidateResource } = require('../middleware/cacheMiddleware');

const router = express.Router();

const {
  createAcademicYear,
  getAcademicYears,
  setActiveAcademicYear,
  updateRegistrationPeriod
} = require('../controllers/academicYearController');

const { verifyToken, checkPermission } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Academic Years
 *   description: Academic Year Management
 */

/**
 * @swagger
 * /academic-years:
 *   get:
 *     summary: Get all academic years
 *     tags: [Academic Years]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of academic years
 */
router.get('/', verifyToken, setCacheResource('semesters'), globalCacheMiddleware, getAcademicYears);

/**
 * @swagger
 * /academic-years:
 *   post:
 *     summary: Create a new academic year
 *     tags: [Academic Years]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - year
 *             properties:
 *               year:
 *                 type: string
 *                 example: '2026/2027'
 *     responses:
 *       201:
 *         description: Academic year created successfully
 *       400:
 *         description: Academic year already exists
 *       500:
 *         description: Server error
 */
router.post('/', verifyToken, checkPermission('manage_academic_year'), invalidateResource('semesters'), createAcademicYear);

/**
 * @swagger
 * /academic-years/{id}/active:
 *   patch:
 *     summary: Set an academic year as active
 *     tags: [Academic Years]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The academic year ID
 *     responses:
 *       200:
 *         description: Academic year set as active
 *       404:
 *         description: Academic year not found
 */
router.patch('/:id/active', verifyToken, checkPermission('manage_academic_year'), invalidateResource('semesters'), setActiveAcademicYear);

/**
 * @swagger
 * /academic-years/{id}/registration-period:
 *   patch:
 *     summary: Update the registration period for an academic year
 *     tags: [Academic Years]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The academic year ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               registrationStart:
 *                 type: string
 *                 format: date
 *                 example: '2026-06-01'
 *               registrationEnd:
 *                 type: string
 *                 format: date
 *                 example: '2026-07-01'
 *     responses:
 *       200:
 *         description: Registration period updated
 *       404:
 *         description: Academic year not found
 */
router.patch('/:id/registration-period', verifyToken, checkPermission('manage_academic_year'), invalidateResource('semesters'), updateRegistrationPeriod);

module.exports = router;
