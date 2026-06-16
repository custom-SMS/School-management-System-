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
  createSection,
  getSectionsByClass
} = require('../controllers/classroomController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Protect routes: Teachers and Admins can manage classroom tasks
router.get('/options', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), getClassroomOptions);
router.post('/attendance', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), recordAttendance);
router.get('/attendance', verifyToken, checkRole(['Admin', 'SuperAdmin']), getAttendanceSessions);
router.post('/grades', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), saveGrades);
router.get('/grades/:classId/:subject', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), getGrades);

// Classes and sections management
router.post('/classes', verifyToken, checkRole(['Admin', 'SuperAdmin']), createClass);
router.get('/classes', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Teacher']), getClasses);
router.post('/sections', verifyToken, checkRole(['Admin', 'SuperAdmin']), createSection);
router.get('/sections/:classId', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Teacher']), getSectionsByClass);

// Attendance unlocking (SuperAdmin only)
router.patch('/attendance/:id/unlock', verifyToken, checkRole(['SuperAdmin']), require('../controllers/classroomController').unlockAttendance);

// Grading structures (SuperAdmin only for set, all authenticated for get)
router.post('/grading-structure', verifyToken, checkRole(['SuperAdmin']), require('../controllers/classroomController').setGradingStructure);
router.get('/grading-structure', verifyToken, require('../controllers/classroomController').getGradingStructure);

module.exports = router;