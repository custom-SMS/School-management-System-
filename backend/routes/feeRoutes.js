const express = require('express');
const router = express.Router();
const { recordPayment, getDefaulters, getPaidStudentsByClass } = require('../controllers/feeController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Admins and Parents can submit fee payments
router.post('/', verifyToken, checkRole(['Admin', 'Parent']), recordPayment);
router.get('/defaulters/:month', verifyToken, checkRole(['Admin']), getDefaulters);
router.get('/paid/:month/:classId', verifyToken, checkRole(['Admin']), getPaidStudentsByClass);

module.exports = router;