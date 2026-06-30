const express = require('express');
const router = express.Router();
const {
  createTimetableSlot,
  getTimetablesByClass,
  getTeacherTimetable,
  getStudentTimetable,
  deleteTimetableSlot
} = require('../controllers/timetableController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Timetable
 *   description: Class Timetables
 */

/**
 * @swagger
 * /timetable/class/{classId}/{academicYearId}:
 *   get:
 *     summary: Get timetable for a class
 *     tags: [Timetable]
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
 *         description: Timetable data
 */
router.get('/class/:classId/:academicYearId', verifyToken, getTimetablesByClass);

/**
 * @swagger
 * /timetable/teacher/me:
 *   get:
 *     summary: Get timetable for logged-in teacher
 *     tags: [Timetable]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Teacher timetable
 */
router.get('/teacher/me', verifyToken, checkRole(['Teacher', 'SuperAdmin']), getTeacherTimetable);

/**
 * @swagger
 * /timetable/student/me:
 *   get:
 *     summary: Get timetable for logged-in student or parent's child
 *     tags: [Timetable]
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
 *         description: Student timetable
 */
router.get('/student/me', verifyToken, checkRole(['Student', 'Parent', 'SuperAdmin']), getStudentTimetable);

/**
 * @swagger
 * /timetable:
 *   post:
 *     summary: Create a timetable slot
 *     tags: [Timetable]
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
 *               classId:
 *                 type: string
 *               subject:
 *                 type: string
 *               teacherId:
 *                 type: string
 *               dayOfWeek:
 *                 type: string
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *     responses:
 *       201:
 *         description: Timetable slot created
 */
router.post('/', verifyToken, checkRole(['Admin', 'SuperAdmin']), createTimetableSlot);

/**
 * @swagger
 * /timetable/{id}:
 *   delete:
 *     summary: Delete a timetable slot
 *     tags: [Timetable]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Slot deleted
 */
router.delete('/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), deleteTimetableSlot);

module.exports = router;
