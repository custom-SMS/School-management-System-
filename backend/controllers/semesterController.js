/**
 * semesterController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the two semesters within each AcademicYear.
 *
 * Business rules (confirmed):
 *  - Q1: Active semester is GLOBAL — only one Semester row across the entire
 *        system can have isActive=true at any time.
 *  - Q2: Only SuperAdmin can switch the active semester.
 *  - Each AcademicYear has exactly two semesters: Semester 1 (order=1)
 *        and Semester 2 (order=2).
 */

const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Idempotently create Semester 1 + Semester 2 for a given academicYearId. */
const seedSemestersForYear = async (academicYearId) => {
  const existing = await prisma.semester.findMany({
    where: { academicYearId },
  });
  const existingNames = new Set(existing.map((s) => s.name));

  const toCreate = [];
  if (!existingNames.has('Semester 1')) {
    toCreate.push({ academicYearId, name: 'Semester 1', order: 1, isActive: false });
  }
  if (!existingNames.has('Semester 2')) {
    toCreate.push({ academicYearId, name: 'Semester 2', order: 2, isActive: false });
  }

  for (const data of toCreate) {
    await prisma.semester.create({ data });
  }

  return prisma.semester.findMany({
    where: { academicYearId },
    orderBy: { order: 'asc' },
  });
};

// ─── Controller functions ─────────────────────────────────────────────────────

/**
 * GET /api/semesters?academicYearId=
 * List semesters for an academic year (or all semesters if no filter).
 */
const getSemesters = async (req, res) => {
  try {
    const { academicYearId } = req.query;
    const where = academicYearId ? { academicYearId } : {};

    const semesters = await prisma.semester.findMany({
      where,
      include: { academicYear: { select: { id: true, year: true } } },
      orderBy: [{ academicYear: { year: 'desc' } }, { order: 'asc' }],
    });

    res.status(200).json(semesters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/semesters/active
 * Returns the single globally-active semester (or null).
 */
const getActiveSemester = async (req, res) => {
  try {
    const active = await prisma.semester.findFirst({
      where: { isActive: true },
      include: { academicYear: { select: { id: true, year: true } } },
    });
    res.status(200).json(active || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/semesters/seed/:academicYearId
 * Idempotently create Semester 1 + Semester 2 for the given academic year.
 * SuperAdmin / manage_academic_year permission required.
 */
const seedSemesters = async (req, res) => {
  try {
    const { academicYearId } = req.params;

    const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
    if (!year) return res.status(404).json({ message: 'Academic year not found.' });

    const semesters = await seedSemestersForYear(academicYearId);

    await logActivity(
      req.user._id,
      'Seed Semesters',
      academicYearId,
      `Seeded semesters for academic year ${year.year}`
    );

    res.status(200).json({ message: `Semesters ready for ${year.year}.`, semesters });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PATCH /api/semesters/:id/active
 * Set a semester as globally active. Deactivates ALL other semesters first.
 * SuperAdmin only.
 */
const setActiveSemester = async (req, res) => {
  try {
    const { id } = req.params;

    const target = await prisma.semester.findUnique({
      where: { id },
      include: { academicYear: { select: { id: true, year: true } } },
    });
    if (!target) return res.status(404).json({ message: 'Semester not found.' });

    await prisma.$transaction(async (tx) => {
      // Deactivate ALL semesters globally
      await tx.semester.updateMany({ data: { isActive: false } });
      // Activate the target
      await tx.semester.update({ where: { id }, data: { isActive: true } });
    });

    await logActivity(
      req.user._id,
      'Set Active Semester',
      id,
      `Set globally active semester to "${target.name}" (${target.academicYear.year})`
    );

    const updated = await prisma.semester.findUnique({
      where: { id },
      include: { academicYear: { select: { id: true, year: true } } },
    });

    res.status(200).json({
      message: `"${target.name}" (${target.academicYear.year}) is now the active semester.`,
      semester: updated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PATCH /api/semesters/:id
 * Update startDate / endDate for a semester.
 * SuperAdmin / manage_academic_year permission required.
 */
const updateSemester = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.body;

    const semester = await prisma.semester.findUnique({ where: { id } });
    if (!semester) return res.status(404).json({ message: 'Semester not found.' });

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: 'End date cannot be before start date.' });
    }

    const updated = await prisma.semester.update({
      where: { id },
      data: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      include: { academicYear: { select: { id: true, year: true } } },
    });

    await logActivity(
      req.user._id,
      'Update Semester',
      id,
      `Updated dates for "${semester.name}"`
    );

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSemesters,
  getActiveSemester,
  seedSemesters,
  setActiveSemester,
  updateSemester,
  // Export helper for use in academicYearController
  seedSemestersForYear,
};
