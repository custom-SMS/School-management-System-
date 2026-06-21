const express = require('express');
const router = express.Router();
const {
  getAcademicReport,
  getAttendanceReport,
  getEnrollmentReport,
  getFinancialReport,
} = require('../controllers/reportController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.use(verifyToken, checkRole(['Admin', 'SuperAdmin']));

router.get('/academic', getAcademicReport);
router.get('/attendance', getAttendanceReport);
router.get('/enrollment', getEnrollmentReport);
router.get('/financial', getFinancialReport);

module.exports = router;
