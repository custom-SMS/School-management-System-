const express = require('express');
const router = express.Router();
const {
  compileReportCards,
  getReportCard,
  publishReportCards,
  updateReportComments,
  setPromotionStatus,
  getReportCardsByClass
} = require('../controllers/reportCardController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Compile report cards (Admin/SuperAdmin)
router.post('/compile', verifyToken, checkRole(['SuperAdmin', 'Admin']), compileReportCards);

// Publish report cards (Admin/SuperAdmin)
router.post('/publish', verifyToken, checkRole(['SuperAdmin', 'Admin']), publishReportCards);

// Get report card for a specific student + academic year (any authenticated user)
router.get('/:studentId/:academicYearId', verifyToken, getReportCard);

// Add/update teacher comments on a report card
router.patch('/:id/comments', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), updateReportComments);

// Homeroom Teacher/Admin promote student
router.patch('/:id/promote', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), setPromotionStatus);

// Get all report cards for a class
router.get('/class/:classId/:academicYearId', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), getReportCardsByClass);

module.exports = router;
