const express = require('express');
const router = express.Router();
const { 
  registerStudent, 
  getStudents,
  getAllStudents, 
  setGradeFee, 
  getGradeFees, 
  deleteStudent,
  promoteStudent,
  repeatStudent,
  setStudentStatus,
  updateStudent
} = require('../controllers/studentController');
const { verifyToken, checkRole, checkPermission, requireRegistrationAccess } = require('../middleware/authMiddleware');

// Get students (teachers see only assigned students, admins see all)
router.get('/', verifyToken, checkRole(['Admin', 'Teacher', 'SuperAdmin']), getStudents);

// Get all students from the database without teacher-based filtering
router.get('/all', verifyToken, checkRole(['Admin', 'SuperAdmin']), getAllStudents);

// Register a new student (Now public so students can register themselves)
router.post('/', registerStudent);

// Update student details
router.put('/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), updateStudent);

// Manage grade fee rules
router.post('/grade-fee', verifyToken, requireRegistrationAccess, setGradeFee);
router.get('/grade-fee', getGradeFees);
router.delete('/:id', verifyToken, requireRegistrationAccess, deleteStudent);

// Promotion & Status routes
router.post('/promote', verifyToken, requireRegistrationAccess, promoteStudent);
router.post('/repeat', verifyToken, requireRegistrationAccess, repeatStudent);
router.patch('/:id/status', verifyToken, requireRegistrationAccess, setStudentStatus);

module.exports = router;