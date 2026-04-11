const express = require('express');
const router = express.Router();
const { recordAttendance, saveGrades, getGrades, getClassroomOptions } = require('../controllers/classroomController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Protect routes: Teachers and Admins can manage classroom tasks
router.get('/options', verifyToken, checkRole(['Teacher', 'Admin']), getClassroomOptions);
router.post('/attendance', verifyToken, checkRole(['Teacher', 'Admin']), recordAttendance);
router.post('/grades', verifyToken, checkRole(['Teacher', 'Admin']), saveGrades);
router.get('/grades/:classId/:subject', verifyToken, checkRole(['Teacher', 'Admin']), getGrades);

module.exports = router;