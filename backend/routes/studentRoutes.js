const express = require('express');
const router = express.Router();
const { registerStudent, getStudents, setGradeFee, getGradeFees, deleteStudent } = require('../controllers/studentController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Get students (teachers see only assigned students, admins see all)
router.get('/', verifyToken, checkRole(['Admin', 'Teacher']), getStudents);

// Register a new student (Now public so students can register themselves)
router.post('/', registerStudent);

// Manage grade fee rules
router.post('/grade-fee', verifyToken, checkRole(['Admin']), setGradeFee);
router.get('/grade-fee', getGradeFees);
router.delete('/:id', verifyToken, checkRole(['Admin']), deleteStudent);

module.exports = router;