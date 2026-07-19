const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');
const { isRegistrationOpen } = require('../utils/academicYear');
const { seedSemestersForYear } = require('./semesterController');
const { generateEditToken } = require('../middleware/historicalEditProtection');

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
    await seedSemestersForYear(newYear.id);

    await logActivity(req.user._id, 'Create Academic Year', newYear.id, `Created academic year: ${year}`);

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
      where: req.user?.role === 'SuperAdmin' ? {} : { isActive: true },
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

    const target = await prisma.academicYear.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ message: 'Academic year not found.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.academicYear.updateMany({
        where: { id: { not: id } },
        data: { isActive: false }
      });
      await tx.academicYear.update({
        where: { id },
        data: { isActive: true }
      });

      await tx.semester.updateMany({ data: { isActive: false } });
      const firstSemester = await tx.semester.findFirst({
        where: { academicYearId: id },
        orderBy: { order: 'asc' }
      });
      if (firstSemester) {
        await tx.semester.update({ where: { id: firstSemester.id }, data: { isActive: true } });
      }
    });

    await logActivity(req.user._id, 'Set Active Academic Year', target.id, `Activated academic year: ${target.year}`);

    res.status(200).json({ message: `Academic year ${target.year} set as active.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Clone the reusable school structure from an existing year into a target year.
const cloneAcademicYearStructure = async (req, res) => {
  try {
    const targetYearId = req.params.id;
    const { sourceAcademicYearId } = req.body;
    if (!sourceAcademicYearId || sourceAcademicYearId === targetYearId) {
      return res.status(400).json({ message: 'Choose a different source academic year.' });
    }

    const [targetYear, sourceYear] = await Promise.all([
      prisma.academicYear.findUnique({ where: { id: targetYearId } }),
      prisma.academicYear.findUnique({ where: { id: sourceAcademicYearId } }),
    ]);
    if (!targetYear || !sourceYear) {
      return res.status(404).json({ message: 'Source or target academic year was not found.' });
    }

    const sourceClasses = await prisma.class.findMany({
      where: { academicYearId: sourceAcademicYearId },
      include: { sections: true, classSubjects: true, assignments: true },
    });
    const [sourceFeeStructures, sourceGradingStructures] = await Promise.all([
      prisma.feeStructure.findMany({ where: { academicYearId: sourceAcademicYearId } }),
      prisma.gradingStructure.findMany({ where: { academicYearId: sourceAcademicYearId } }),
    ]);

    const result = { classes: 0, sections: 0, subjects: 0, teacherAssignments: 0, feeStructures: 0, gradingStructures: 0 };

    await prisma.$transaction(async (tx) => {
      for (const sourceClass of sourceClasses) {
        let targetClass = await tx.class.findFirst({
          where: { branchId: sourceClass.branchId, name: sourceClass.name, academicYearId: targetYearId },
        });
        if (!targetClass) {
          targetClass = await tx.class.create({
            data: {
              name: sourceClass.name, grade: sourceClass.grade, teacherId: sourceClass.teacherId,
              subject: sourceClass.subject, schedule: sourceClass.schedule, branchId: sourceClass.branchId,
              levelId: sourceClass.levelId, stream: sourceClass.stream, academicYearId: targetYearId,
            },
          });
          result.classes += 1;
        }

        for (const sourceSection of sourceClass.sections) {
          const existing = await tx.section.findFirst({
            where: { classId: targetClass.id, name: sourceSection.name, academicYearId: targetYearId },
          });
          if (!existing) {
            await tx.section.create({ data: {
              name: sourceSection.name, classId: targetClass.id, academicYearId: targetYearId,
              capacity: sourceSection.capacity, homeroomTeacherId: sourceSection.homeroomTeacherId,
            }});
            result.sections += 1;
          }
        }

        for (const sourceSubject of sourceClass.classSubjects) {
          const existing = await tx.classSubject.findUnique({
            where: { classId_subjectId: { classId: targetClass.id, subjectId: sourceSubject.subjectId } },
          });
          if (!existing) {
            await tx.classSubject.create({ data: { classId: targetClass.id, subjectId: sourceSubject.subjectId, teacherId: sourceSubject.teacherId } });
            result.subjects += 1;
          }
        }

        for (const sourceAssignment of sourceClass.assignments) {
          const existing = await tx.teacherAssignment.findFirst({
            where: {
              teacherId: sourceAssignment.teacherId, classId: targetClass.id,
              subjectId: sourceAssignment.subjectId, assignmentType: sourceAssignment.assignmentType,
              academicYearId: targetYearId,
            },
          });
          if (!existing) {
            await tx.teacherAssignment.create({ data: {
              teacherId: sourceAssignment.teacherId, classId: targetClass.id, subjectId: sourceAssignment.subjectId,
              assignmentType: sourceAssignment.assignmentType, notes: sourceAssignment.notes,
              assignedById: req.user._id, academicYearId: targetYearId,
            }});
            result.teacherAssignments += 1;
          }
        }
      }

      for (const fee of sourceFeeStructures) {
        const existing = await tx.feeStructure.findFirst({ where: { branchId: fee.branchId, name: fee.name, academicYearId: targetYearId } });
        if (!existing) {
          await tx.feeStructure.create({ data: {
            name: fee.name, grade: fee.grade, branchId: fee.branchId, academicYearId: targetYearId,
            tuitionFee: fee.tuitionFee, registrationFee: fee.registrationFee, libraryFee: fee.libraryFee,
            labFee: fee.labFee, sportsFee: fee.sportsFee, otherFees: fee.otherFees, description: fee.description,
          }});
          result.feeStructures += 1;
        }
      }

      for (const grading of sourceGradingStructures) {
        const existing = await tx.gradingStructure.findFirst({
          where: { branchId: grading.branchId, levelId: grading.levelId, academicYearId: targetYearId },
        });
        if (!existing) {
          await tx.gradingStructure.create({ data: {
            name: grading.name, branchId: grading.branchId, levelId: grading.levelId, academicYearId: targetYearId,
            quizWeight: grading.quizWeight, assignmentWeight: grading.assignmentWeight,
            midtermWeight: grading.midtermWeight, finalWeight: grading.finalWeight,
            components: grading.components, passMark: grading.passMark, isActive: grading.isActive,
          }});
          result.gradingStructures += 1;
        }
      }
    });

    await logActivity(req.user._id, 'Clone Academic Year Structure', targetYearId,
      `Copied reusable structure from ${sourceYear.year} to ${targetYear.year}: ${JSON.stringify(result)}`);
    res.status(200).json({ message: 'Academic-year structure prepared successfully.', ...result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Set / change the Registration Period (date window) for an Academic Year.
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

    const target = await prisma.academicYear.findUnique({ where: { id } });
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

// Confirm historical edit (for Super Admin) — returns a short-lived edit token
const confirmHistoricalEdit = async (req, res) => {
  try {
    const { reason, targetData } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: 'Reason is required for historical edit' });
    }

    // Log the confirmation
    await logActivity(req.user._id, 'HISTORICAL_EDIT_CONFIRMED', null, {
      reason,
      targetData,
      timestamp: new Date()
    });

    // Generate temporary edit token (15-minute expiry)
    const editToken = generateEditToken({
      userId: req.user._id,
      reason,
      expiry: Date.now() + 15 * 60 * 1000
    });

    res.json({ editToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get the single active academic year with its semesters
const getActiveAcademicYear = async (req, res) => {
  try {
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
      include: { semesters: { orderBy: { order: 'asc' } } }
    });

    if (!activeYear) {
      return res.status(404).json({ message: 'No active academic year found' });
    }

    res.json({
      ...activeYear,
      registrationOpen: isRegistrationOpen(activeYear)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Archive all published/reviewed report cards for an academic year (year-end operation)
const archiveReportCards = async (req, res) => {
  try {
    const { id } = req.params;

    const year = await prisma.academicYear.findUnique({ where: { id } });
    if (!year) return res.status(404).json({ message: 'Academic year not found.' });

    const result = await prisma.reportCard.updateMany({
      where: {
        academicYearId: id,
        workflowStatus: { not: 'Draft' }
      },
      data: { status: 'Archived' }
    });

    await logActivity(
      req.user._id,
      'Archive Report Cards',
      id,
      `Archived ${result.count} report cards for academic year: ${year.year}`
    );

    res.json({
      message: `Archived ${result.count} report card(s) for ${year.year}.`,
      archivedCount: result.count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Bulk promote all currently Enrolled students from one year to the next grade in a target year
const promoteStudentsBulk = async (req, res) => {
  try {
    const { id: targetYearId } = req.params;
    const { sourceAcademicYearId } = req.body;

    if (!sourceAcademicYearId) {
      return res.status(400).json({ message: 'sourceAcademicYearId is required.' });
    }
    if (sourceAcademicYearId === targetYearId) {
      return res.status(400).json({ message: 'Source and target academic years must be different.' });
    }

    const [sourceYear, targetYear] = await Promise.all([
      prisma.academicYear.findUnique({ where: { id: sourceAcademicYearId } }),
      prisma.academicYear.findUnique({ where: { id: targetYearId } })
    ]);
    if (!sourceYear) return res.status(404).json({ message: 'Source academic year not found.' });
    if (!targetYear) return res.status(404).json({ message: 'Target academic year not found.' });

    const enrollments = await prisma.enrollment.findMany({
      where: { academicYearId: sourceAcademicYearId, status: 'Enrolled' },
      include: { student: { select: { id: true, grade: true, studentId: true } } }
    });

    const gradeOrder = [
      'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
      'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
    ];

    const getNextGrade = (currentGrade) => {
      const idx = gradeOrder.indexOf(currentGrade);
      if (idx === -1 || idx === gradeOrder.length - 1) return null;
      return gradeOrder[idx + 1];
    };

    let promoted = 0;
    let skipped = 0;
    let graduated = 0;
    const errors = [];

    for (const enrollment of enrollments) {
      const student = enrollment.student;

      // Skip if already enrolled in target year
      const existing = await prisma.enrollment.findFirst({
        where: { studentId: student.id, academicYearId: targetYearId }
      });
      if (existing) { skipped++; continue; }

      const nextGrade = getNextGrade(enrollment.grade);

      try {
        if (nextGrade === null) {
          // Final grade — mark as graduated
          await prisma.enrollment.create({
            data: {
              studentId: student.id,
              academicYearId: targetYearId,
              grade: enrollment.grade,
              status: 'Graduated'
            }
          });
          graduated++;
        } else {
          await prisma.enrollment.create({
            data: {
              studentId: student.id,
              academicYearId: targetYearId,
              grade: nextGrade,
              status: 'Promoted'
            }
          });
          await prisma.student.update({
            where: { id: student.id },
            data: { grade: nextGrade }
          });
          promoted++;
        }
      } catch (err) {
        errors.push({ studentId: student.studentId, error: err.message });
      }
    }

    await logActivity(
      req.user._id,
      'Bulk Promote Students',
      targetYearId,
      `Bulk promotion from ${sourceYear.year} to ${targetYear.year}: ${promoted} promoted, ${graduated} graduated, ${skipped} skipped, ${errors.length} errors`
    );

    res.json({
      message: 'Bulk promotion complete.',
      promoted,
      graduated,
      skipped,
      errors,
      sourceYear: sourceYear.year,
      targetYear: targetYear.year
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAcademicYear,
  getAcademicYears,
  setActiveAcademicYear,
  updateRegistrationPeriod,
  cloneAcademicYearStructure,
  confirmHistoricalEdit,
  getActiveAcademicYear,
  archiveReportCards,
  promoteStudentsBulk
};
