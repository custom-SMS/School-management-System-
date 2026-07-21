const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');

// Create or update a timetable slot
const createTimetableSlot = async (req, res) => {
  try {
    const {
      id,
      academicYearId,
      semesterId: bodySemesterId,
      classId,
      sectionId,
      subjectId,
      dayOfWeek,
      startTime,
      endTime,
      room
    } = req.body;

    console.log('Creating timetable slot:', req.body);

    // ── Bug 4/6 fix: validate required fields FIRST before any DB calls ─────────
    if (
      !academicYearId ||
      !classId ||
      !subjectId ||
      !dayOfWeek ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        message:
          'academicYearId, classId, subjectId, dayOfWeek, startTime, and endTime are required.'
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        message: 'startTime must be before endTime.'
      });
    }
    // ─────────────────────────────────────────────────────────────────────────────

    // ── Bug 6 fix: resolve semester scoped to the given academicYearId ───────────
    // Explicit body semesterId beats active-semester fallback.
    // Fallback is now scoped to the selected academic year (not globally active).
    const activeSemester = await (async () => {
      if (bodySemesterId) {
        return prisma.semester.findUnique({ where: { id: bodySemesterId } });
      }
      return prisma.semester.findFirst({
        where: { isActive: true, academicYearId }
      });
    })();
    const resolvedSemesterId = activeSemester?.id || null;
    // ─────────────────────────────────────────────────────────────────────────────

    if (req.user.role === 'Admin') {
      const targetClass = await prisma.class.findUnique({
        where: { id: classId },
        select: { branchId: true }
      });
      if (targetClass && req.branchFilter?.branchId && targetClass.branchId !== req.branchFilter.branchId) {
        return res.status(403).json({ message: 'Access denied. Cannot assign schedule to a class in another branch.' });
      }
    }

    // ── Conflict check covers class-wide ↔ section-specific and semester-specific overlaps ─
    const timeOverlapFilter = [
      { startTime: { lt: endTime } },
      { endTime: { gt: startTime } }
    ];

    const normalizedSectionId = sectionId || null;
    const normalizedSemesterId = resolvedSemesterId || null;

    const AND_conditions = [
      ...timeOverlapFilter
    ];

    if (normalizedSectionId) {
      AND_conditions.push({
        OR: [
          { sectionId: null },
          { sectionId: normalizedSectionId }
        ]
      });
    }

    if (normalizedSemesterId) {
      AND_conditions.push({
        OR: [
          { semesterId: null },
          { semesterId: normalizedSemesterId }
        ]
      });
    }

    const conflictBaseWhere = {
      academicYearId,
      classId,
      dayOfWeek,
      AND: AND_conditions,
      ...(id ? { id: { not: id } } : {})
    };

    const conflictingSlot = await prisma.timetable.findFirst({
      where: conflictBaseWhere
    });
    // ─────────────────────────────────────────────────────────────────────────────

    if (conflictingSlot) {
      return res.status(400).json({
        message:
          'Schedule conflict detected. Another timetable slot already exists for this class during the selected time.'
      });
    }

    let slot;

    if (id) {
      slot = await prisma.timetable.update({
        where: { id },
        data: {
          academicYearId,
          semesterId: resolvedSemesterId,
          classId,
          sectionId: sectionId || null,
          subjectId,
          dayOfWeek,
          startTime,
          endTime,
          room: room || null
        }
      });

      await logActivity(
        req.user._id,
        'Update Timetable Slot',
        slot.id,
        `Updated schedule slot on ${dayOfWeek} from ${startTime} to ${endTime}`
      );
    } else {
      slot = await prisma.timetable.create({
        data: {
          academicYearId,
          semesterId: resolvedSemesterId,
          classId,
          sectionId: sectionId || null,
          subjectId,
          dayOfWeek,
          startTime,
          endTime,
          room: room || null
        }
      });

      await logActivity(
        req.user._id,
        'Create Timetable Slot',
        slot.id,
        `Created schedule slot on ${dayOfWeek} from ${startTime} to ${endTime}`
      );
    }

    res.status(201).json(slot);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// Get timetable by Class and Section
const getTimetablesByClass = async (req, res) => {
  try {
    const { classId, academicYearId } = req.params;
    const { sectionId, semesterId } = req.query;

    console.log('Fetching timetable - classId:', classId, 'academicYearId:', academicYearId, 'sectionId:', sectionId, 'semesterId:', semesterId);

    if (req.user.role === 'Admin') {
      const targetClass = await prisma.class.findUnique({
        where: { id: classId },
        select: { branchId: true }
      });
      if (targetClass && req.branchFilter?.branchId && targetClass.branchId !== req.branchFilter.branchId) {
        return res.status(403).json({ message: 'Access denied. Class is in another branch.' });
      }
    }

    // ── Build where clause for Prisma query ───────────────────────────────────────
    // If semesterId is passed, include slots matching semesterId OR semesterId=null.
    // If sectionId is passed, include slots matching sectionId OR sectionId=null.
    const AND_conditions = [];

    if (semesterId) {
      AND_conditions.push({
        OR: [
          { semesterId: semesterId },
          { semesterId: null }
        ]
      });
    }

    if (sectionId) {
      AND_conditions.push({
        OR: [
          { sectionId: sectionId },
          { sectionId: null }
        ]
      });
    }

    const whereClause = {
      classId,
      academicYearId,
      ...(AND_conditions.length > 0 ? { AND: AND_conditions } : {})
    };
    // ─────────────────────────────────────────────────────────────────────────────

    console.log('Where clause:', JSON.stringify(whereClause));

    const timetable = await prisma.timetable.findMany({
      where: whereClause,
      include: {
        class: true,
        section: true,
        subject: true,
        semester: { select: { id: true, name: true, order: true } },
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    console.log('Found timetable slots:', timetable.length);

    res.status(200).json(timetable);
  } catch (error) {
    console.error('Error fetching timetable:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get timetable for logged-in Teacher
const getTeacherTimetable = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user._id }
    });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found.' });
    }

    // Find active academic year
    const activeYear = req.selectedAcademicYear || await prisma.academicYear.findFirst({ where: { isActive: true } });
    if (!activeYear) {
      return res.status(404).json({ message: 'No active academic year found.' });
    }

    // Collect class IDs and section IDs associated with this teacher
    const classIds = [];
    const sectionIds = [];

    // 1. Direct class teacher
    const classes = await prisma.class.findMany({
      where: { teacherId: teacher.id, academicYearId: activeYear.id }
    });
    classes.forEach(c => classIds.push(c.id));

    // 2. Teacher assignments
    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: teacher.id, academicYearId: activeYear.id }
    });
    assignments.forEach(a => {
      if (a.classId) classIds.push(a.classId);
      if (a.sectionId) sectionIds.push(a.sectionId);
    });

    // 3. Homeroom sections
    const homeroomSections = await prisma.section.findMany({
      where: { homeroomTeacherId: teacher.id, academicYearId: activeYear.id }
    });
    homeroomSections.forEach(s => {
      sectionIds.push(s.id);
      if (s.classId) classIds.push(s.classId);
    });

    // 4. Class subjects
    const classSubjects = await prisma.classSubject.findMany({
      where: { teacherId: teacher.id }
    });
    classSubjects.forEach(cs => {
      if (cs.classId) classIds.push(cs.classId);
    });

    const uniqueClassIds = [...new Set(classIds)];
    const uniqueSectionIds = [...new Set(sectionIds)];

    const activeSemester = await prisma.semester.findFirst({
      where: { isActive: true, academicYearId: activeYear.id }
    });

    const targetConditions = [];
    if (uniqueClassIds.length) targetConditions.push({ classId: { in: uniqueClassIds } });
    if (uniqueSectionIds.length) targetConditions.push({ sectionId: { in: uniqueSectionIds } });

    // Fallback: if teacher has no explicit assignments yet, return empty list
    if (targetConditions.length === 0) {
      return res.status(200).json({ academicYear: activeYear, timetable: [] });
    }

    const timetable = await prisma.timetable.findMany({
      where: {
        academicYearId: activeYear.id,
        OR: targetConditions,
        ...(activeSemester ? {
          AND: [
            {
              OR: [
                { semesterId: activeSemester.id },
                { semesterId: null }
              ]
            }
          ]
        } : {})
      },
      include: {
        class: true,
        section: true,
        subject: true,
        semester: { select: { id: true, name: true, order: true } }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    res.status(200).json({
      academicYear: activeYear,
      timetable
    });
  } catch (error) {
    console.error('Error in getTeacherTimetable:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get timetable for logged-in Student or Parent
const getStudentTimetable = async (req, res) => {
  try {
    let studentId = null;

    if (req.user.role === 'Student') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user._id }
      });
      if (!student) return res.status(404).json({ message: 'Student profile not found.' });
      studentId = student.id;
    } else if (req.user.role === 'Parent') {
      const { childStudentId } = req.query; // If parent, they must specify child ID
      if (!childStudentId) {
        return res.status(400).json({ message: 'childStudentId query parameter is required for parents.' });
      }
      studentId = childStudentId;
    }

    const activeYear = req.selectedAcademicYear || await prisma.academicYear.findFirst({ where: { isActive: true } });
    if (!activeYear) {
      return res.status(404).json({ message: 'No active academic year found.' });
    }

    // Find student enrollment for active year
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_academicYearId: {
          studentId,
          academicYearId: activeYear.id
        }
      },
      include: {
        section: { select: { id: true, classId: true } },
        student: {
          include: {
            classes: { select: { id: true } }
          }
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'No active enrollment found for the student in this academic year.' });
    }

    // Collect all class IDs matching the student
    const classIds = [];
    if (enrollment.section?.classId) {
      classIds.push(enrollment.section.classId);
    }
    if (enrollment.student?.classes) {
      enrollment.student.classes.forEach(c => classIds.push(c.id));
    }
    if (enrollment.grade) {
      const matchingClasses = await prisma.class.findMany({
        where: {
          academicYearId: activeYear.id,
          OR: [
            { grade: enrollment.grade },
            { name: enrollment.grade },
            { name: `Class ${enrollment.grade}` },
            { name: `Grade ${enrollment.grade}` }
          ]
        }
      });
      matchingClasses.forEach(c => classIds.push(c.id));
    }

    const uniqueClassIds = [...new Set(classIds)];

    if (uniqueClassIds.length === 0) {
      return res.status(200).json({
        enrollment,
        academicYear: activeYear,
        timetable: []
      });
    }

    const activeSemester = await prisma.semester.findFirst({
      where: { isActive: true, academicYearId: activeYear.id }
    });

    // Student section filter:
    // If student is in Section X: show slots for Section X OR sectionId: null (class-wide).
    // If student is not in a section: show sectionId: null (class-wide).
    const studentSectionFilter = enrollment.sectionId
      ? [{ OR: [{ sectionId: enrollment.sectionId }, { sectionId: null }] }]
      : [{ sectionId: null }];

    const AND_conditions = [
      ...studentSectionFilter
    ];

    if (activeSemester) {
      AND_conditions.push({
        OR: [
          { semesterId: activeSemester.id },
          { semesterId: null }
        ]
      });
    }

    const timetable = await prisma.timetable.findMany({
      where: {
        academicYearId: activeYear.id,
        classId: { in: uniqueClassIds },
        AND: AND_conditions
      },
      include: {
        class: true,
        section: true,
        subject: true,
        semester: { select: { id: true, name: true, order: true } }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    res.status(200).json({
      enrollment,
      academicYear: activeYear,
      timetable
    });
  } catch (error) {
    console.error('Error in getStudentTimetable:', error);
    res.status(500).json({ message: error.message });
  }
};

const deleteTimetableSlot = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.timetable.delete({
      where: { id }
    });
    await logActivity(req.user._id, 'Delete Timetable Slot', id, 'Deleted schedule slot');
    res.status(200).json({ message: 'Slot deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTimetableSlot,
  getTimetablesByClass,
  getTeacherTimetable,
  getStudentTimetable,
  deleteTimetableSlot
};
