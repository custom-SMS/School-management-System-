const express = require('express');

const { globalCacheMiddleware } = require('../middleware/globalCacheMiddleware');
const { setCacheResource, invalidateResource } = require('../middleware/cacheMiddleware');

const router = express.Router();
const {
  createTimetableSlot,
  getTimetablesByClass,
  getTeacherTimetable,
  getStudentTimetable,
  deleteTimetableSlot
} = require('../controllers/timetableController');
const { verifyToken, checkRole, injectBranchFilter } = require('../middleware/authMiddleware');

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
router.get('/class/:classId/:academicYearId', verifyToken, injectBranchFilter, setCacheResource('classrooms'), globalCacheMiddleware, getTimetablesByClass);

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
router.get('/teacher/me', verifyToken, checkRole(['Teacher', 'SuperAdmin']), setCacheResource('classrooms'), globalCacheMiddleware, getTeacherTimetable);

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
router.get('/student/me', verifyToken, checkRole(['Student', 'Parent', 'SuperAdmin']), setCacheResource('classrooms'), globalCacheMiddleware, getStudentTimetable);

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
router.post('/', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, invalidateResource('classrooms'), createTimetableSlot);

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
router.delete('/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), invalidateResource('classrooms'), deleteTimetableSlot);

module.exports = router;
