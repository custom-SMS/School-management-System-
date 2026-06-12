const express = require('express');
const router = express.Router();
const { createSubject, getSubjects, deleteSubject } = require('../controllers/subjectController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getSubjects);
router.post('/', verifyToken, checkRole(['Admin', 'SuperAdmin']), createSubject);
router.delete('/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), deleteSubject);

module.exports = router;
