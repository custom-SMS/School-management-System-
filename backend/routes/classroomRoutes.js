const express = require('express');

const router = express.Router();

const {

  recordAttendance,
  getAttendanceRegister,
  getAttendanceSessions,

  saveGrades,

  getGrades,

  getStudentGrades,

  getClassroomOptions,

  createClass,

  getClasses,

  deleteClass,

  updateClass,

  deleteSection,

  forceDeleteClass,

  createSection,

  getSectionsByClass,

  getSectionById,

  updateSection,

  getSectionStudents,

  assignStudentsToSection,

  addSubjectToClass,
  removeSubjectFromClass,
  getClassSubjects,
  updateClassSubjectTeacher,
  getSubmittedGradesForHomeroom,
  approveGrades

} = require('../controllers/classroomController');

const { verifyToken, checkRole, injectBranchFilter } = require('../middleware/authMiddleware');



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

router.get('/options', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), injectBranchFilter, getClassroomOptions);



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

router.post('/attendance', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), injectBranchFilter, recordAttendance);



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
router.get('/attendance/register', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), injectBranchFilter, getAttendanceRegister);

router.get('/attendance', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, getAttendanceSessions);

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

router.post('/grades', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), injectBranchFilter, saveGrades);

/**
 * @swagger
 * /classroom/grades/student/{studentId}:
 *   get:
 *     summary: Get all grades for a specific student
 *     tags: [Classroom]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of student grades across all subjects
 */
// NOTE: this route MUST be declared before /grades/:classId/:subject
// otherwise Express matches "student" as the classId param.
router.get('/grades/student/:studentId', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), injectBranchFilter, getStudentGrades);

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

// Homeroom teacher grade submission workflow
router.get('/grades/submitted/:classId', verifyToken, checkRole(['Teacher']), injectBranchFilter, getSubmittedGradesForHomeroom);

router.get('/grades/:classId/:subject', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), injectBranchFilter, getGrades);
router.post('/grades/approve', verifyToken, checkRole(['Teacher']), approveGrades);



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

router.post('/classes', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, createClass);



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

router.get('/classes', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Teacher']), injectBranchFilter, getClasses);



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

router.delete('/classes/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, deleteClass);

router.put('/classes/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, updateClass);

router.delete('/classes/:id/force', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, forceDeleteClass);



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

router.post('/sections', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, createSection);



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


// NOTE: /sections/detail/* routes MUST be declared BEFORE /sections/:classId
// to prevent Express from matching 'detail' as the :classId parameter.
router.get('/sections/detail/:sectionId', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Teacher']), injectBranchFilter, getSectionById);

router.put('/sections/detail/:sectionId', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, updateSection);

router.delete('/sections/detail/:sectionId', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, deleteSection);

router.get('/sections/detail/:sectionId/students', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Teacher']), injectBranchFilter, getSectionStudents);

router.put('/sections/detail/:sectionId/students', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, assignStudentsToSection);

router.get('/sections/:classId', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Teacher']), injectBranchFilter, getSectionsByClass);





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


// Class Subject Management
router.post('/class-subjects', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, addSubjectToClass);
router.get('/class-subjects/:classId', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Teacher']), injectBranchFilter, getClassSubjects);
router.delete('/class-subjects/:classId/:subjectId', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, removeSubjectFromClass);
router.put('/class-subjects/:classId/:subjectId/teacher', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, updateClassSubjectTeacher);


module.exports = router;