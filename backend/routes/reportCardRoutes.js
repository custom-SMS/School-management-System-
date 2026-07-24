const express = require('express');

const { globalCacheMiddleware } = require('../middleware/globalCacheMiddleware');
const { setCacheResource, invalidateResource } = require('../middleware/cacheMiddleware');

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
  upsertHomeroomReview,
} = require('../controllers/reportCardController');
const { verifyToken, checkRole, checkScope, injectBranchFilter } = require('../middleware/authMiddleware');

// Compile (Admin/SuperAdmin/BranchAdmin/Teacher)
router.post('/compile', verifyToken, checkScope({ allowedScopes: ['SchoolAdmin', 'BranchAdmin', 'LevelAdmin'], allowedRoles: ['SuperAdmin', 'Admin', 'Teacher'] }), injectBranchFilter, invalidateResource('report-cards'), compileReportCards);

// Publish all / unpublish all (Admin/SuperAdmin/BranchAdmin)
router.post('/publish', verifyToken, checkScope({ allowedScopes: ['SchoolAdmin', 'BranchAdmin', 'LevelAdmin'], allowedRoles: ['SuperAdmin', 'Admin'] }), injectBranchFilter, invalidateResource('report-cards'), publishReportCards);
router.post('/unpublish', verifyToken, checkScope({ allowedScopes: ['SchoolAdmin', 'BranchAdmin', 'LevelAdmin'], allowedRoles: ['SuperAdmin', 'Admin'] }), injectBranchFilter, invalidateResource('report-cards'), unpublishReportCards);

// Homeroom teacher: bulk submit to Admin
router.post('/submit-to-admin', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), invalidateResource('report-cards'), submitToAdmin);

// Get report cards by class (Teacher/Admin/SuperAdmin)
// MUST be before /:studentId/:academicYearId to avoid route conflict
router.get('/class/:classId/:academicYearId', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), injectBranchFilter, setCacheResource('report-cards'), globalCacheMiddleware, getReportCardsByClass);

// Get one report card (Teacher/Admin/SuperAdmin only)
router.get('/:studentId/:academicYearId', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), injectBranchFilter, setCacheResource('report-cards'), globalCacheMiddleware, getReportCard);

// Toggle publish for a single report card (Admin/SuperAdmin/BranchAdmin)
router.patch('/:id/publish', verifyToken, checkScope({ allowedScopes: ['SchoolAdmin', 'BranchAdmin', 'LevelAdmin'], allowedRoles: ['SuperAdmin', 'Admin'] }), invalidateResource('report-cards'), togglePublishOne);

// Teacher comments
router.patch('/:id/comments', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), invalidateResource('report-cards'), updateReportComments);

// Homeroom teacher review (remarks + conduct + promotion per card)
router.patch('/homeroom-review/upsert', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), invalidateResource('report-cards'), upsertHomeroomReview);
router.patch('/:id/homeroom-review', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), invalidateResource('report-cards'), updateHomeroomReview);

// Promotion status
router.patch('/:id/promote', verifyToken, checkRole(['SuperAdmin', 'Admin', 'Teacher']), invalidateResource('report-cards'), setPromotionStatus);

module.exports = router;
