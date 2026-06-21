const express = require('express');
const router = express.Router();
const {
  createAcademicYear,
  getAcademicYears,
  setActiveAcademicYear,
  updateRegistrationPeriod
} = require('../controllers/academicYearController');
const { verifyToken, checkPermission } = require('../middleware/authMiddleware');

// Anyone authenticated can view academic years
router.get('/', verifyToken, getAcademicYears);

// Only users with 'manage_academic_year' permission or SuperAdmin can modify
router.post('/', verifyToken, checkPermission('manage_academic_year'), createAcademicYear);
router.patch('/:id/active', verifyToken, checkPermission('manage_academic_year'), setActiveAcademicYear);
router.patch('/:id/registration-period', verifyToken, checkPermission('manage_academic_year'), updateRegistrationPeriod);

module.exports = router;
