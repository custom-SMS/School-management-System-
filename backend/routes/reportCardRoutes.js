const express = require('express');
const router = express.Router();
const {
  compileReportCards,
  getReportCard,
  publishReportCards,
  unpublishReportCards,
  togglePublishOne,
  updateReportComments,
  updateHomeroomReview,
  submitToAdmin,
  setPromotionStatus,
  getReportCardsByClass,
} = require('../controllers/reportCardController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Compile (Admin/SuperAdmin)
router.post('/compile', verifyToken, checkRole(['SuperAdmin', 'Admin']), compileReportCards);

// Publish all / unpublish all (Admin/SuperAdmin)
router.post('/publish', verifyToken, checkRole(['SuperAdmin', 'Admin']), publishReportCards);
router.post('/unpublish', verifyToken, checkRole(['SuperAdmin', 'Admin']), unpublishReportCards);

// Homeroom teacher: bulk submit to Admin
router.post('/submit-to-admin', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), submitToAdmin);

// Get report cards by class (Teacher/Admin/SuperAdmin)
// MUST be before /:studentId/:academicYearId to avoid route conflict
router.get('/class/:classId/:academicYearId', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), getReportCardsByClass);

// Get one report card (Teacher/Admin/SuperAdmin only)
router.get('/:studentId/:academicYearId', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), getReportCard);

// Toggle publish for a single report card (Admin/SuperAdmin)
router.patch('/:id/publish', verifyToken, checkRole(['SuperAdmin', 'Admin']), togglePublishOne);

// Teacher comments
router.patch('/:id/comments', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), updateReportComments);

// Homeroom teacher review (remarks + conduct + promotion per card)
router.patch('/:id/homeroom-review', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), updateHomeroomReview);

// Promotion status
router.patch('/:id/promote', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), setPromotionStatus);

module.exports = router;
