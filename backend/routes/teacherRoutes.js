const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { registerTeacher, getTeachers, deleteTeacher } = require('../controllers/teacherController');

router.get('/', verifyToken, checkRole(['Admin']), getTeachers);
router.post('/', verifyToken, checkRole(['Admin']), registerTeacher);
router.delete('/:id', verifyToken, checkRole(['Admin']), deleteTeacher);

module.exports = router;