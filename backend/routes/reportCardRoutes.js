const express = require('express');
const router = express.Router();
const {
  compileReportCards,
  getReportCard,
  publishReportCards,
  updateReportComments
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

module.exports = router;
