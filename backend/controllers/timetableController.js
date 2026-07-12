const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');

// Create or update a timetable slot
const createTimetableSlot = async (req, res) => {
  try {
    const {
      id,
      academicYearId,
      classId,
      sectionId,
      subjectId,
      dayOfWeek,
      startTime,
      endTime,
      room
    } = req.body;

    if (req.user.role === 'Admin') {
      const targetClass = await prisma.class.findUnique({
        where: { id: classId },
        select: { branchId: true }
      });
      if (targetClass && req.branchFilter?.branchId && targetClass.branchId !== req.branchFilter.branchId) {
        return res.status(403).json({ message: 'Access denied. Cannot assign schedule to a class in another branch.' });
      }
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        message: 'startTime must be before endTime.'
      });
    }

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

    // Check for timetable conflicts
    const conflictingSlot = await prisma.timetable.findFirst({
      where: {
        academicYearId,
        classId,
        sectionId: sectionId || null,
        dayOfWeek,

        // Ignore the current record when updating
        ...(id && {
          id: {
            not: id
          }
        }),

        AND: [
          {
            startTime: {
              lt: endTime
            }
          },
          {
            endTime: {
              gt: startTime
            }
          }
        ]
      }
    });

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
    const { sectionId } = req.query;

    if (req.user.role === 'Admin') {
      const targetClass = await prisma.class.findUnique({
        where: { id: classId },
        select: { branchId: true }
      });
      if (targetClass && req.branchFilter?.branchId && targetClass.branchId !== req.branchFilter.branchId) {
        return res.status(403).json({ message: 'Access denied. Class is in another branch.' });
      }
    }

    const whereClause = {
      classId,
      academicYearId
    };
    if (sectionId) {
      whereClause.sectionId = sectionId;
    }

    const timetable = await prisma.timetable.findMany({
      where: whereClause,
      include: {
        class: true,
        section: true,
        subject: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    res.status(200).json(timetable);
  } catch (error) {
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
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });
    if (!activeYear) {
      return res.status(404).json({ message: 'No active academic year found.' });
    }

    // Get teacher classes
    const classes = await prisma.class.findMany({
      where: { teacherId: teacher.id }
    });
    const classIds = classes.map(c => c.id);

    // Also check teacher assignments
    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: teacher.id }
    });
    assignments.forEach(a => {
      if (a.classId) classIds.push(a.classId);
    });

    const uniqueClassIds = [...new Set(classIds)];

    const timetable = await prisma.timetable.findMany({
      where: {
        academicYearId: activeYear.id,
        classId: { in: uniqueClassIds }
      },
      include: {
        class: true,
        section: true,
        subject: true
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

    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });
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
      }
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'No active enrollment found for the student in this academic year.' });
    }

    // Retrieve classes matching the student's grade level
    const classes = await prisma.class.findMany({
      where: { name: `Class ${enrollment.grade}` }
    });
    const classIds = classes.map(c => c.id);

    const timetable = await prisma.timetable.findMany({
      where: {
        academicYearId: activeYear.id,
        OR: [
          { classId: { in: classIds } },
          { sectionId: enrollment.sectionId }
        ]
      },
      include: {
        class: true,
        section: true,
        subject: true
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
