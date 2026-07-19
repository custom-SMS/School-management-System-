const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');
const { isRegistrationOpen } = require('../utils/academicYear');
const { seedSemestersForYear } = require('./semesterController');

// Validate a registration window pair. Returns an error string or null.
const validateWindow = (start, end) => {
  if (start && end && new Date(end) < new Date(start)) {
    return 'Registration end date cannot be before the start date.';
  }
  return null;
};

// Create a new Academic Year
const createAcademicYear = async (req, res) => {
  try {
    const { year, registrationStart, registrationEnd } = req.body;
    if (!year) {
      return res.status(400).json({ message: 'Academic year string (e.g. 2025/2026) is required.' });
    }

    const windowError = validateWindow(registrationStart, registrationEnd);
    if (windowError) {
      return res.status(400).json({ message: windowError });
    }

    const existing = await prisma.academicYear.findFirst({
      where: { year, branchId: null }
    });
    if (existing) {
      return res.status(400).json({ message: 'Academic year already exists.' });
    }

    const newYear = await prisma.academicYear.create({
      data: {
        year,
        isActive: false,
        registrationOpen: false,
        registrationStart: registrationStart ? new Date(registrationStart) : null,
        registrationEnd: registrationEnd ? new Date(registrationEnd) : null
      }
    });

    // Auto-seed Semester 1 and Semester 2 for the new year.
    // Semester 1 is NOT automatically made globally active — SuperAdmin
    // explicitly sets the active semester via /api/semesters/:id/active.
    await seedSemestersForYear(newYear.id);

    await logActivity(req.user._id, 'Create Academic Year', newYear.id, `Created academic year: ${year}`);

    // Return the year with its freshly-seeded semesters
    const withSemesters = await prisma.academicYear.findUnique({
      where: { id: newYear.id },
      include: { semesters: { orderBy: { order: 'asc' } } },
    });
    res.status(201).json(withSemesters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all Academic Years (registrationOpen is computed live from the date window)
const getAcademicYears = async (req, res) => {
  try {
    const years = await prisma.academicYear.findMany({
      orderBy: { year: 'desc' },
      include: { semesters: { orderBy: { order: 'asc' } } },
    });
    const withComputed = years.map((y) => ({
      ...y,
      registrationOpen: isRegistrationOpen(y)
    }));
    res.status(200).json(withComputed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Set an Academic Year as Active (only one can be active at a time)
const setActiveAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;

    const target = await prisma.academicYear.findUnique({
      where: { id }
    });
    if (!target) {
      return res.status(404).json({ message: 'Academic year not found.' });
    }

    await prisma.$transaction(async (tx) => {
      // Set all other academic years to inactive
      await tx.academicYear.updateMany({
        where: { id: { not: id } },
        data: { isActive: false }
      });

      // Set targeted academic year to active
      await tx.academicYear.update({
        where: { id },
        data: { isActive: true }
      });
    });

    await logActivity(req.user._id, 'Set Active Academic Year', target.id, `Activated academic year: ${target.year}`);

    res.status(200).json({ message: `Academic year ${target.year} set as active.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Set / change the Registration Period (date window) for an Academic Year.
// Extending the end date into the future reopens registration for the active year.
const updateRegistrationPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const { registrationStart, registrationEnd } = req.body;

    if (!registrationStart && !registrationEnd) {
      return res.status(400).json({ message: 'A registration start and/or end date is required.' });
    }

    const windowError = validateWindow(registrationStart, registrationEnd);
    if (windowError) {
      return res.status(400).json({ message: windowError });
    }

    const target = await prisma.academicYear.findUnique({
      where: { id }
    });
    if (!target) {
      return res.status(404).json({ message: 'Academic year not found.' });
    }

    const updated = await prisma.academicYear.update({
      where: { id },
      data: {
        registrationStart: registrationStart ? new Date(registrationStart) : null,
        registrationEnd: registrationEnd ? new Date(registrationEnd) : null
      }
    });

    await logActivity(
      req.user._id,
      'Update Registration Period',
      target.id,
      `Set registration window for ${target.year}: ${registrationStart || '—'} → ${registrationEnd || '—'}`
    );

    res.status(200).json({ ...updated, registrationOpen: isRegistrationOpen(updated) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAcademicYear,
  getAcademicYears,
  setActiveAcademicYear,
  updateRegistrationPeriod
};
