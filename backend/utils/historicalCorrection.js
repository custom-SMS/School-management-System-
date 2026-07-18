const prisma = require('../prisma');

/**
 * Validates if a user has permission to modify data in the specified academic year.
 * If the academic year is archived (inactive), only SuperAdmin can modify it,
 * and a valid reason is required in the X-Modification-Reason header.
 */
async function checkHistoricalAccess(req, academicYearId) {
  if (!academicYearId) {
    return { ok: true }; // No academic year context specified (let other validations handle it)
  }

  const targetYear = await prisma.academicYear.findUnique({
    where: { id: academicYearId }
  });

  if (!targetYear) {
    return { ok: false, status: 404, message: 'Academic year not found.' };
  }

  // If the target academic year is active, normal role checks apply
  if (targetYear.isActive) {
    return { ok: true };
  }

  // If archived/inactive, only SuperAdmin can modify
  if (req.user?.role !== 'SuperAdmin') {
    return {
      ok: false,
      status: 403,
      message: 'Archived academic records are read-only. Only a Super Admin can edit historical data.'
    };
  }

  // Require modification reason header
  const reason = req.headers['x-modification-reason'];
  if (!reason || !reason.trim() || reason.trim().length < 4) {
    return {
      ok: false,
      status: 400,
      message: 'A valid reason for modification is required for archived records (minimum 4 characters).'
    };
  }

  return { ok: true, reason: reason.trim() };
}

module.exports = {
  checkHistoricalAccess
};
