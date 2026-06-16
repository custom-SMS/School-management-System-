const express = require('express');
const router = express.Router();
const {
  createClassroom,
  getClassrooms,
  updateClassroom,
  deleteClassroom
} = require('../controllers/physicalClassroomController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Physical classroom management
router.post('/', verifyToken, checkRole(['Admin', 'SuperAdmin']), createClassroom);
router.get('/', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Teacher']), getClassrooms);
router.put('/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), updateClassroom);
router.delete('/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), deleteClassroom);

module.exports = router;
