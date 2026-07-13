const express = require('express');
const router = express.Router();
const {
  getSemesters,
  getActiveSemester,
  seedSemesters,
  setActiveSemester,
  updateSemester,
} = require('../controllers/semesterController');
const { verifyToken, checkRole, checkPermission } = require('../middleware/authMiddleware');

/**
 * GET /api/semesters
 * List semesters (optionally filtered by ?academicYearId=)
 * All authenticated users may read semester data.
 */
router.get('/', verifyToken, getSemesters);

/**
 * GET /api/semesters/active
 * Returns the single globally-active semester.
 * All authenticated users.
 */
router.get('/active', verifyToken, getActiveSemester);

/**
 * POST /api/semesters/seed/:academicYearId
 * Idempotently create Semester 1 + Semester 2 for the given year.
 * Requires manage_academic_year permission.
 */
router.post(
  '/seed/:academicYearId',
  verifyToken,
  checkPermission('manage_academic_year'),
  seedSemesters
);

/**
 * PATCH /api/semesters/:id/active
 * Set this semester as globally active (SuperAdmin only per Q2).
 */
router.patch(
  '/:id/active',
  verifyToken,
  checkRole(['SuperAdmin']),
  setActiveSemester
);

/**
 * PATCH /api/semesters/:id
 * Update start/end dates.
 * Requires manage_academic_year permission.
 */
router.patch(
  '/:id',
  verifyToken,
  checkPermission('manage_academic_year'),
  updateSemester
);

module.exports = router;
