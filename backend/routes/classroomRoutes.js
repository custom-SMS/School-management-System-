const express = require('express');
const router = express.Router();
const {
  recordAttendance,
  getAttendanceSessions,
  saveGrades,
  getGrades,
  getClassroomOptions,
  createClass,
  getClasses,
  deleteClass,
  deleteSection,
  forceDeleteClass,
  createSection,
  getSectionsByClass,
  getSectionById,
  updateSection,
  getSectionStudents,
  assignStudentsToSection
} = require('../controllers/classroomController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Protect routes: Teachers and Admins can manage classroom tasks
/**
 * @swagger
 * tags:
 *   name: Classroom
 *   description: Classes, Sections, Attendance, and Grades
 */

/**
 * @swagger
 * /classroom/options:
 *   get:
 *     summary: Get classroom options (classes for grades/attendance)
 *     tags: [Classroom]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of options
 */
router.get('/options', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), getClassroomOptions);

/**
 * @swagger
 * /classroom/attendance:
 *   post:
 *     summary: Record class attendance
 *     tags: [Classroom]
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
 *               date:
 *                 type: string
 *                 format: date
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Attendance recorded
 */
router.post('/attendance', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), recordAttendance);

/**
 * @swagger
 * /classroom/attendance:
 *   get:
 *     summary: Get recent attendance sessions
 *     tags: [Classroom]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of attendance sessions
 */
router.get('/attendance', verifyToken, checkRole(['Admin', 'SuperAdmin']), getAttendanceSessions);

/**
 * @swagger
 * /classroom/grades:
 *   post:
 *     summary: Record student grades
 *     tags: [Classroom]
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
 *               gradesData:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Grades saved
 */
router.post('/grades', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), saveGrades);

/**
 * @swagger
 * /classroom/grades/{classId}/{subject}:
 *   get:
 *     summary: Get grades for a specific class and subject
 *     tags: [Classroom]
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
 *         name: subject
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of grades
 */
router.get('/grades/:classId/:subject', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), getGrades);

// Classes and sections management

/**
 * @swagger
 * /classroom/classes:
 *   post:
 *     summary: Create a new class
 *     tags: [Classroom]
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
 *               name:
 *                 type: string
 *               subject:
 *                 type: string
 *     responses:
 *       201:
 *         description: Class created
 */
router.post('/classes', verifyToken, checkRole(['Admin', 'SuperAdmin']), createClass);

/**
 * @swagger
 * /classroom/classes:
 *   get:
 *     summary: Get all classes
 *     tags: [Classroom]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of classes
 */
router.get('/classes', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Teacher']), getClasses);

/**
 * @swagger
 * /classroom/classes/{id}:
 *   delete:
 *     summary: Delete a class
 *     tags: [Classroom]
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
 *         description: Class deleted
 */
router.delete('/classes/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), deleteClass);
router.delete('/classes/:id/force', verifyToken, checkRole(['Admin', 'SuperAdmin']), forceDeleteClass);

/**
 * @swagger
 * /classroom/sections:
 *   post:
 *     summary: Create a new section
 *     tags: [Classroom]
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
 *               name:
 *                 type: string
 *               classId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Section created
 */
router.post('/sections', verifyToken, checkRole(['Admin', 'SuperAdmin']), createSection);

/**
 * @swagger
 * /classroom/sections/{classId}:
 *   get:
 *     summary: Get sections for a specific class
 *     tags: [Classroom]
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
 *         description: List of sections
 */
router.get('/sections/:classId', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Teacher']), getSectionsByClass);
router.get('/sections/detail/:sectionId', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Teacher']), getSectionById);
router.put('/sections/detail/:sectionId', verifyToken, checkRole(['Admin', 'SuperAdmin']), updateSection);
router.delete('/sections/detail/:sectionId', verifyToken, checkRole(['Admin', 'SuperAdmin']), deleteSection);
router.get('/sections/detail/:sectionId/students', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Teacher']), getSectionStudents);
router.put('/sections/detail/:sectionId/students', verifyToken, checkRole(['Admin', 'SuperAdmin']), assignStudentsToSection);

// Attendance unlocking (SuperAdmin only)

/**
 * @swagger
 * /classroom/attendance/{id}/unlock:
 *   patch:
 *     summary: Unlock an attendance session
 *     tags: [Classroom]
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
 *         description: Attendance unlocked
 */
router.patch('/attendance/:id/unlock', verifyToken, checkRole(['SuperAdmin']), require('../controllers/classroomController').unlockAttendance);

// Grading structures

/**
 * @swagger
 * /classroom/grading-structure:
 *   post:
 *     summary: Set grading structure weights
 *     tags: [Classroom]
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
 *               quizWeight:
 *                 type: number
 *               assignmentWeight:
 *                 type: number
 *               midtermWeight:
 *                 type: number
 *               finalWeight:
 *                 type: number
 *     responses:
 *       200:
 *         description: Grading structure updated
 */
router.post('/grading-structure', verifyToken, checkRole(['SuperAdmin']), require('../controllers/classroomController').setGradingStructure);

/**
 * @swagger
 * /classroom/grading-structure:
 *   get:
 *     summary: Get current grading structure weights
 *     tags: [Classroom]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Grading structure returned
 */
router.get('/grading-structure', verifyToken, require('../controllers/classroomController').getGradingStructure);

module.exports = router;