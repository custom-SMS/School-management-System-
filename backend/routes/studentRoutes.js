const express = require('express');
const router = express.Router();
const { 
  registerStudent, 
  getStudents, 
  setGradeFee, 
  getGradeFees, 
  deleteStudent,
  promoteStudent,
  repeatStudent,
  setStudentStatus,
  updateStudent
} = require('../controllers/studentController');
const { verifyToken, checkRole, checkPermission } = require('../middleware/authMiddleware');

// Get students (teachers see only assigned students, admins see all)
router.get('/', verifyToken, checkRole(['Admin', 'Teacher', 'SuperAdmin']), getStudents);

// Register a new student (Now public so students can register themselves)
router.post('/', registerStudent);

// Update student details
router.put('/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), updateStudent);

// Manage grade fee rules
router.post('/grade-fee', verifyToken, checkPermission('student_registration'), setGradeFee);
router.get('/grade-fee', getGradeFees);
router.delete('/:id', verifyToken, checkPermission('student_registration'), deleteStudent);

// Promotion & Status routes
router.post('/promote', verifyToken, checkPermission('student_registration'), promoteStudent);
router.post('/repeat', verifyToken, checkPermission('student_registration'), repeatStudent);
router.patch('/:id/status', verifyToken, checkPermission('student_registration'), setStudentStatus);

module.exports = router;