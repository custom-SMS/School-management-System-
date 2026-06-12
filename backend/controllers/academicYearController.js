const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');

// Create a new Academic Year
const createAcademicYear = async (req, res) => {
  try {
    const { year } = req.body;
    if (!year) {
      return res.status(400).json({ message: 'Academic year string (e.g. 2025/2026) is required.' });
    }

    const existing = await prisma.academicYear.findUnique({
      where: { year }
    });
    if (existing) {
      return res.status(400).json({ message: 'Academic year already exists.' });
    }

    const newYear = await prisma.academicYear.create({
      data: {
        year,
        isActive: false,
        registrationOpen: false
      }
    });

    await logActivity(req.user._id, 'Create Academic Year', newYear.id, `Created academic year: ${year}`);

    res.status(201).json(newYear);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all Academic Years
const getAcademicYears = async (req, res) => {
  try {
    const years = await prisma.academicYear.findMany({
      orderBy: { year: 'desc' }
    });
    res.status(200).json(years);
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

// Open/Close Registration Period for an Academic Year
const toggleRegistrationPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const { registrationOpen } = req.body;

    if (registrationOpen === undefined) {
      return res.status(400).json({ message: 'registrationOpen state is required.' });
    }

    const target = await prisma.academicYear.findUnique({
      where: { id }
    });
    if (!target) {
      return res.status(404).json({ message: 'Academic year not found.' });
    }

    const updated = await prisma.academicYear.update({
      where: { id },
      data: { registrationOpen: Boolean(registrationOpen) }
    });

    await logActivity(
      req.user._id, 
      registrationOpen ? 'Open Registration Period' : 'Close Registration Period', 
      target.id, 
      `${registrationOpen ? 'Opened' : 'Closed'} registration window for: ${target.year}`
    );

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAcademicYear,
  getAcademicYears,
  setActiveAcademicYear,
  toggleRegistrationPeriod
};
