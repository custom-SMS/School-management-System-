const express = require('express');
const router = express.Router();
const {
  registerStudent,
  getStudents,
  getStudentSubjectSummaries,
  getStudentSubjectResults,
  getStudentPerformance,
  setGradeFee,
  getGradeFees,
  getRegistrationClasses,
  updateStudent,
  deleteStudent,
  promoteStudent,
  repeatStudent,
  setStudentStatus
} = require('../controllers/studentController');
const { verifyToken, verifyTokenOptional, checkRole, checkPermission, injectBranchFilter } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: Student Management
 */

// Get students
/**
 * @swagger
 * /students:
 *   get:
 *     summary: Get all students
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of students
 */
router.get('/', verifyToken, checkRole(['Admin', 'Teacher', 'SuperAdmin']), injectBranchFilter, getStudents);

router.get('/me/subjects', verifyToken, checkRole(['Student', 'Parent', 'SuperAdmin']), getStudentSubjectSummaries);
router.get('/me/subjects/:subjectKey/results', verifyToken, checkRole(['Student', 'Parent', 'SuperAdmin']), getStudentSubjectResults);

// Aggregated performance (grades + attendance) for one student
/**
 * @swagger
 * /students/{id}/performance:
 *   get:
 *     summary: Get student performance (grades + attendance)
 *     tags: [Students]
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
 *         description: Performance data
 */
router.get('/:id/performance', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), getStudentPerformance);

// Register a new student
/**
 * @swagger
 * /students:
 *   post:
 *     summary: Register a new student
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Student registered
 */
router.post('/', verifyTokenOptional, registerStudent);

// Manage grade fee rules
/**
 * @swagger
 * /students/grade-fee:
 *   post:
 *     summary: Set fee for a grade
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Grade fee set
 */
router.post('/grade-fee', verifyToken, checkPermission('student_registration'), setGradeFee);

/**
 * @swagger
 * /students/grade-fee:
 *   get:
 *     summary: Get grade fees
 *     tags: [Students]
 *     responses:
 *       200:
 *         description: List of grade fees
 */
router.get('/grade-fee', getGradeFees);

/**
 * @swagger
 * /students/classes:
 *   get:
 *     summary: Get classes for registration
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of classes
 */
router.get('/classes', verifyToken, checkPermission('student_registration'), getRegistrationClasses);

/**
 * @swagger
 * /students/{id}:
 *   get:
 *     summary: Get a specific student
 *     tags: [Students]
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
 *         description: Student data
 *   put:
 *     summary: Update a student
 *     tags: [Students]
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
 *     responses:
 *       200:
 *         description: Student updated
 *   delete:
 *     summary: Delete a student
 *     tags: [Students]
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
 *         description: Student deleted
 */
router.get('/:id', verifyToken, checkPermission('student_registration'), getStudents);
router.put('/:id', verifyToken, checkPermission('student_registration'), updateStudent);
router.delete('/:id', verifyToken, checkPermission('student_registration'), deleteStudent);

// Promotion & Status routes
/**
 * @swagger
 * /students/promote:
 *   post:
 *     summary: Promote students to the next grade
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Students promoted
 */
router.post('/promote', verifyToken, checkPermission('student_registration'), promoteStudent);

/**
 * @swagger
 * /students/repeat:
 *   post:
 *     summary: Set students to repeat a grade
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Students set to repeat
 */
router.post('/repeat', verifyToken, checkPermission('student_registration'), repeatStudent);

/**
 * @swagger
 * /students/{id}/status:
 *   patch:
 *     summary: Update student status
 *     tags: [Students]
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
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', verifyToken, checkPermission('student_registration'), setStudentStatus);

module.exports = router;