const express = require('express');
const router = express.Router();
const { getAssignmentOptions, createAssignment, getMyAssignments, getAllAssignments } = require('../controllers/assignmentController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.get('/options', verifyToken, checkRole(['Admin']), getAssignmentOptions);
router.post('/', verifyToken, checkRole(['Admin']), createAssignment);
router.get('/me', verifyToken, checkRole(['Teacher']), getMyAssignments);
router.get('/', verifyToken, checkRole(['Admin']), getAllAssignments);

module.exports = router;