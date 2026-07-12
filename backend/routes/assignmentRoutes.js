const express = require('express');
const router = express.Router();
const { getAssignmentOptions, createAssignment, getMyAssignments, getAllAssignments, removeHomeRoomAssignment } = require('../controllers/assignmentController');
const { verifyToken, checkRole, injectBranchFilter } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Teacher Assignments
 *   description: Teacher Assignment Management
 */

/**
 * @swagger
 * /assignments/options:
 *   get:
 *     summary: Get assignment options (teachers, classes)
 *     tags: [Teacher Assignments]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of assignment options
 */
router.get('/options', verifyToken, checkRole(['Admin']), injectBranchFilter, getAssignmentOptions);

/**
 * @swagger
 * /assignments:
 *   post:
 *     summary: Create a teacher assignment
 *     tags: [Teacher Assignments]
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
 *               teacherId:
 *                 type: string
 *               classIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               specificClassNames:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Assignment created
 */
router.post('/', verifyToken, checkRole(['Admin']), createAssignment);

/**
 * @swagger
 * /assignments/me:
 *   get:
 *     summary: Get assignments for the logged-in teacher
 *     tags: [Teacher Assignments]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of teacher assignments
 */
router.get('/me', verifyToken, checkRole(['Teacher']), getMyAssignments);

/**
 * @swagger
 * /assignments/homeroom/{classId}:
 *   delete:
 *     summary: Remove the homeroom teacher from a class
 *     tags: [Teacher Assignments]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Homeroom teacher removed
 */
router.delete('/homeroom/:classId', verifyToken, checkRole(['Admin', 'SuperAdmin']), removeHomeRoomAssignment);

/**
 * @swagger
 * /assignments:
 *   get:
 *     summary: Get all teacher assignments
 *     tags: [Teacher Assignments]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all assignments
 */
router.get('/', verifyToken, checkRole(['Admin', 'SuperAdmin']), getAllAssignments);

module.exports = router;