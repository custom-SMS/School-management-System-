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

router.get('/class/:classId/:academicYearId', verifyToken, getTimetablesByClass);
router.get('/teacher/me', verifyToken, checkRole(['Teacher', 'SuperAdmin']), getTeacherTimetable);
router.get('/student/me', verifyToken, checkRole(['Student', 'Parent', 'SuperAdmin']), getStudentTimetable);

router.post('/', verifyToken, checkRole(['Admin', 'SuperAdmin']), createTimetableSlot);
router.delete('/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), deleteTimetableSlot);

module.exports = router;
