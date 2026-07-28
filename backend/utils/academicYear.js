const prisma = require('../prisma');

// Shared academic-year registration logic.
// Registration is open only while the ACTIVE year's date window covers "now".
// Used by both the academic-year controller (to report status) and the student
// registration gate (to enforce it).
function isRegistrationOpen(year, now = new Date()) {
  if (!year || !year.isActive) return false;
  if (!year.registrationStart || !year.registrationEnd) return false;

  const start = new Date(year.registrationStart);
  const end = new Date(year.registrationEnd);
  end.setHours(23, 59, 59, 999); // include the whole closing day

  return now >= start && now <= end;
}

/**
 * Resolves the active academic year with persistent multi-level fallback logic.
 * Ensures critical school operations (e.g. section assignments, registration)
 * never fail due to missing or misconfigured active academic year flags.
 */
async function getActiveAcademicYear(options = {}) {
  const { branchId, selectedAcademicYear } = options;

  if (selectedAcademicYear && selectedAcademicYear.id) {
    return selectedAcademicYear;
  }

  // 1. Active academic year matching specific branchId (if branchId provided)
  if (branchId) {
    const activeBranchYear = await prisma.academicYear.findFirst({
      where: { isActive: true, branchId }
    });
    if (activeBranchYear) return activeBranchYear;
  }

  // 2. Any active academic year (global or any branch)
  const activeYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });
  if (activeYear) return activeYear;

  // 3. Any academic year matching branchId (even if isActive is false)
  if (branchId) {
    const branchYear = await prisma.academicYear.findFirst({
      where: { branchId },
      orderBy: { createdAt: 'desc' }
    });
    if (branchYear) {
      // Auto-activate this year so subsequent queries succeed natively
      await prisma.academicYear.update({
        where: { id: branchYear.id },
        data: { isActive: true }
      }).catch(() => {});
      return { ...branchYear, isActive: true };
    }
  }

  // 4. Fallback to any academic year in the database (most recent)
  const latestYear = await prisma.academicYear.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (latestYear) {
    // Auto-activate to heal inconsistent database state
    await prisma.academicYear.update({
      where: { id: latestYear.id },
      data: { isActive: true }
    }).catch(() => {});
    return { ...latestYear, isActive: true };
  }

  // 5. Emergency Auto-Creation: If ZERO academic years exist in DB, create default active year
  const currentYear = new Date().getFullYear();
  const yearString = `${currentYear}/${currentYear + 1}`;

  try {
    const autoCreatedYear = await prisma.academicYear.create({
      data: {
        year: yearString,
        isActive: true,
        registrationOpen: true
      }
    });

    try {
      const { seedSemestersForYear } = require('../controllers/semesterController');
      if (seedSemestersForYear) await seedSemestersForYear(autoCreatedYear.id);
    } catch (_) {}

    return autoCreatedYear;
  } catch (error) {
    console.error('Failed to auto-create default academic year:', error);
    return null;
  }
}

/**
 * Resolve the academic year a request is scoped to.
 * - If the middleware already attached a selectedAcademicYear (SuperAdmin historical
 *   view via X-Super-Admin-Year-View-Id header), return it directly.
 * - Otherwise fall back to the active academic year.
 *
 * Use this in every controller that needs to scope data to a year, so that
 * switching years in the SuperAdmin navbar is automatically honoured.
 */
async function resolveYearFromRequest(req) {
  if (req.selectedAcademicYear) return req.selectedAcademicYear;
  return getActiveAcademicYear({});
}

module.exports = { isRegistrationOpen, getActiveAcademicYear, resolveYearFromRequest };
