const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { registerTeacher, getTeachers, deleteTeacher, updateTeacher } = require('../controllers/teacherController');

router.get('/', verifyToken, checkRole(['Admin', 'SuperAdmin']), getTeachers);
router.post('/', verifyToken, checkRole(['Admin', 'SuperAdmin']), registerTeacher);
router.put('/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), updateTeacher);
router.delete('/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), deleteTeacher);

module.exports = router;