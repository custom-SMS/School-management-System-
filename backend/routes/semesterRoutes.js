const express = require('express');

const { globalCacheMiddleware } = require('../middleware/globalCacheMiddleware');
const { setCacheResource, invalidateResource } = require('../middleware/cacheMiddleware');

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
router.get('/', verifyToken, setCacheResource('semesters'), globalCacheMiddleware, getSemesters);

/**
 * GET /api/semesters/active
 * Returns the single globally-active semester.
 * All authenticated users.
 */
router.get('/active', verifyToken, setCacheResource('semesters'), globalCacheMiddleware, getActiveSemester);

/**
 * POST /api/semesters/seed/:academicYearId
 * Idempotently create Semester 1 + Semester 2 for the given year.
 * Requires manage_academic_year permission.
 */
router.post(
  '/seed/:academicYearId',
  verifyToken,
  checkPermission('manage_academic_year'),
  invalidateResource('semesters'),
  seedSemesters
);

/**
 * PATCH /api/semesters/:id/active
 * Set this semester as globally active (SuperAdmin only).
 */
router.patch(
  '/:id/active',
  verifyToken,
  checkRole(['SuperAdmin']),
  invalidateResource('semesters'),
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
  invalidateResource('semesters'),
  updateSemester
);

module.exports = router;
