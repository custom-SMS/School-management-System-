const prisma = require('../prisma');

const getTeacherProfile = async (userId) => {
  return prisma.teacher.findUnique({
    where: { userId }
  });
};

const mapGradeToResponse = (grade) => ({
  _id: grade.id,
  student: grade.studentId,
  class: grade.classId,
  subject: grade.subject,
  teacher: grade.teacherId,
  marks: {
    quiz: grade.quiz,
    assignment: grade.assignment,
    test: grade.test,
    midterm: grade.midterm,
    final: grade.final
  },
  maxTotal: grade.maxTotal,
  total: grade.total,
  percentage: grade.percentage,
  createdAt: grade.createdAt,
  updatedAt: grade.updatedAt
});

const isTeacherAssignedToClass = async (teacherId, classId) => {
  if (!classId) return false;
  const assignment = await prisma.teacherAssignment.findFirst({
    where: { teacherId, classId }
  });
  if (assignment) return true;

  const klass = await prisma.class.findUnique({
    where: { id: classId }
  });
  return !!klass && !!klass.teacherId && klass.teacherId === teacherId;
};

const isTeacherAssignedToStudents = async (teacherId, studentIds = []) => {
  if (!studentIds.length) return false;

  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId },
    include: {
      class: {
        include: {
          students: { select: { id: true } }
        }
      }
    }
  });

  const allowed = new Set();
  assignments.forEach((assignment) => {
    (assignment.class?.students || []).forEach((student) => {
      if (student?.id) {
        allowed.add(student.id);
      }
    });
  });

  return studentIds.every((studentId) => allowed.has(studentId));
};

const resolveTeacherClass = async (teacherId, classId, studentIds = []) => {
  if (classId && classId !== 'General') {
    const klass = await prisma.class.findUnique({
      where: { id: classId }
    });
    if (klass) return klass;
  }

  const assignedClass = await prisma.class.findFirst({
    where: { teacherId }
  });
  if (assignedClass) return assignedClass;

  const defaultClass = await prisma.class.findFirst({
    where: { name: 'Default', teacherId, subject: 'General' }
  });

  if (defaultClass) {
    return prisma.class.update({
      where: { id: defaultClass.id },
      data: {
        students: {
          set: studentIds.map(id => ({ id }))
        }
      }
    });
  } else {
    return prisma.class.create({
      data: {
        name: 'Default',
        teacherId,
        subject: 'General',
        students: {
          connect: studentIds.map(id => ({ id }))
        }
      }
    });
  }
};

// @desc    Get classroom options for grades/attendance screens
// @route   GET /api/classroom/options
// @access  Private (Teacher/Admin)
const getClassroomOptions = async (req, res) => {
  try {
    let where = {};

    if (req.user.role !== 'Admin') {
      const teacher = await getTeacherProfile(req.user._id);
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher profile not found' });
      }

      where = { teacherId: teacher.id };
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        students: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const responseClasses = classes.map(c => ({
      ...c,
      _id: c.id,
      teacher: c.teacher ? {
        ...c.teacher,
        _id: c.teacher.id,
        user: c.teacher.user ? { ...c.teacher.user, _id: c.teacher.user.id } : null
      } : null,
      students: (c.students || []).map(student => ({
        ...student,
        _id: student.id,
        user: student.user ? { ...student.user, _id: student.user.id } : null
      }))
    }));

    res.status(200).json({ classes: responseClasses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const ensureTeacherAuthorization = async (req, classId, studentIds = []) => {
  if (req.user.role === 'Admin') return { ok: true };

  const teacher = await getTeacherProfile(req.user._id);
  if (!teacher) {
    return { ok: false, status: 404, message: 'Teacher profile not found' };
  }

  if (classId && classId !== 'General') {
    const classAllowed = await isTeacherAssignedToClass(teacher.id, classId);
    if (classAllowed) return { ok: true, teacher };
  }

  const studentAllowed = await isTeacherAssignedToStudents(teacher.id, studentIds);
  if (studentAllowed) return { ok: true, teacher };

  return { ok: false, status: 403, message: 'Access denied. Students/classes are not assigned to this teacher.' };
};

// @desc    Record or update attendance for a class
// @route   POST /api/classroom/attendance
// @access  Private (Teacher/Admin)
const recordAttendance = async (req, res) => {
  try {
    const { classId, date, records, teacherId } = req.body;
    const studentIds = (records || []).map((record) => record.student).filter(Boolean);

    const authorization = await ensureTeacherAuthorization(req, classId, studentIds);
    if (!authorization.ok) {
      return res.status(authorization.status).json({ message: authorization.message });
    }

    const attendanceDate = date ? new Date(date) : new Date();
    const today = new Date();

    // Prevent future dates
    if (attendanceDate > today) {
      return res.status(400).json({ message: 'Cannot record attendance for a future date.' });
    }

    // Lock check (7 days limit)
    const diffTime = Math.abs(today - attendanceDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 7 && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Attendance records older than 7 days are locked. Only SuperAdmin can modify them.' });
    }

    const teacherProfile = authorization.teacher || await getTeacherProfile(req.user._id);
    const targetClass = await resolveTeacherClass(teacherProfile?.id || teacherId, classId, studentIds);

    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });

    const attendance = await prisma.attendance.create({
      data: {
        classId: targetClass.id,
        academicYearId: activeYear?.id || null,
        date: attendanceDate,
        recordedById: req.user._id,
        records: {
          create: records.map(record => ({
            studentId: record.student,
            status: record.status
          }))
        }
      },
      include: {
        records: true
      }
    });

    const responseAttendance = {
      _id: attendance.id,
      class: attendance.classId,
      date: attendance.date,
      recordedBy: attendance.recordedById,
      createdAt: attendance.createdAt,
      records: attendance.records.map(r => ({
        _id: r.id,
        student: r.studentId,
        status: r.status
      }))
    };

    res.status(201).json({ message: 'Attendance recorded successfully', attendance: responseAttendance });
  } catch (error) {
    console.error('Attendance Error:', error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    List attendance sessions (for SuperAdmin lock management)
// @route   GET /api/classroom/attendance
// @access  Private (Admin/SuperAdmin)
const getAttendanceSessions = async (req, res) => {
  try {
    const sessions = await prisma.attendance.findMany({
      include: {
        class: { select: { id: true, name: true, subject: true } },
        recordedBy: { select: { id: true, name: true } },
        _count: { select: { records: true } }
      },
      orderBy: { date: 'desc' },
      take: 200
    });

    const now = new Date();
    const response = sessions.map((session) => {
      const diffDays = Math.ceil(Math.abs(now - new Date(session.date)) / (1000 * 60 * 60 * 24));
      // A session is effectively locked once it is older than 7 days, unless explicitly unlocked.
      const effectivelyLocked = diffDays > 7 && session.locked !== false ? true : session.locked;
      return {
        _id: session.id,
        className: session.class?.name || 'Unknown class',
        subject: session.class?.subject || '',
        date: session.date,
        recordedBy: session.recordedBy?.name || '—',
        recordCount: session._count?.records || 0,
        ageDays: diffDays,
        locked: effectivelyLocked
      };
    });

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const unlockAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const attendance = await prisma.attendance.update({
      where: { id },
      data: { locked: false }
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Unlock Attendance Session', id, `Unlocked attendance session on date: ${attendance.date}`);

    res.status(200).json({ message: 'Attendance session unlocked successfully.', attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Bulk save/update grades (like a spreadsheet)
// @route   POST /api/classroom/grades
// @access  Private (Teacher/Admin)
const saveGrades = async (req, res) => {
  try {
    const { classId, subject, teacherId, gradesData } = req.body;
    if (!classId || !subject || !Array.isArray(gradesData)) {
      return res.status(400).json({ message: 'classId, subject, and gradesData are required' });
    }

    const studentIds = (gradesData || []).map((data) => data.student).filter(Boolean);

    const authorization = await ensureTeacherAuthorization(req, classId, studentIds);
    if (!authorization.ok) {
      return res.status(authorization.status).json({ message: authorization.message });
    }

    // Fetch active grading structure weights (e.g. Quiz 10%, Assignment 20%, Midterm 30%, Final 40%)
    const weights = await prisma.gradingStructure.findFirst({
      where: { isActive: true }
    }) || { quizWeight: 10, assignmentWeight: 20, midtermWeight: 30, finalWeight: 40 };

    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });

    const results = [];

    for (let data of gradesData) {
      const marks = data.marks || {};
      // Each component is scored out of 100 and combined using the configurable weights.
      const quiz = Number(marks.quiz || 0);
      const assignment = Number(marks.assignment || 0);
      const midterm = Number(marks.midterm || 0);
      const final = Number(marks.final || 0);
      const test = Number(marks.test || 0); // legacy column, retained but unweighted

      // FR-27: Calculate final score automatically based on weights (which sum to 100%)
      const total = (quiz * (weights.quizWeight / 100)) +
                    (assignment * (weights.assignmentWeight / 100)) +
                    (midterm * (weights.midtermWeight / 100)) +
                    (final * (weights.finalWeight / 100));

      const percentage = Number(total.toFixed(2)); // Weights sum to 100%, so total is already a percentage

      const existingGrade = await prisma.grade.findFirst({
        where: { studentId: data.student, classId, subject }
      });

      let savedGrade;
      if (existingGrade) {
        savedGrade = await prisma.grade.update({
          where: { id: existingGrade.id },
          data: {
            quiz,
            assignment,
            test,
            midterm,
            final,
            total,
            percentage,
            teacherId: req.user._id,
            academicYearId: activeYear?.id || null
          }
        });
      } else {
        savedGrade = await prisma.grade.create({
          data: {
            studentId: data.student,
            classId,
            subject,
            quiz,
            assignment,
            test,
            midterm,
            final,
            total,
            percentage,
            teacherId: req.user._id,
            academicYearId: activeYear?.id || null
          }
        });
      }
      results.push(mapGradeToResponse(savedGrade));
    }

    res.status(200).json({ message: 'Grades saved successfully', results });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const setGradingStructure = async (req, res) => {
  try {
    const { quizWeight, assignmentWeight, midtermWeight, finalWeight } = req.body;
    const totalWeight = Number(quizWeight) + Number(assignmentWeight) + Number(midtermWeight) + Number(finalWeight);
    if (totalWeight !== 100) {
      return res.status(400).json({ message: 'Weights must sum to 100%.' });
    }

    await prisma.gradingStructure.updateMany({
      data: { isActive: false }
    });

    const structure = await prisma.gradingStructure.create({
      data: {
        quizWeight: Number(quizWeight),
        assignmentWeight: Number(assignmentWeight),
        midtermWeight: Number(midtermWeight),
        finalWeight: Number(finalWeight),
        isActive: true
      }
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Configure Grading Structure', structure.id, `Set weights: Quiz ${quizWeight}%, Assignment ${assignmentWeight}%, Midterm ${midtermWeight}%, Final ${finalWeight}%`);

    res.status(200).json(structure);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGradingStructure = async (req, res) => {
  try {
    const structure = await prisma.gradingStructure.findFirst({
      where: { isActive: true }
    }) || { quizWeight: 10, assignmentWeight: 20, midtermWeight: 30, finalWeight: 40 };

    res.status(200).json(structure);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get grades for a specific class and subject
// @route   GET /api/classroom/grades/:classId/:subject
// @access  Private (Teacher/Admin)
const getGrades = async (req, res) => {
  try {
    const { classId, subject } = req.params;

    if (req.user.role !== 'Admin') {
      const teacher = await getTeacherProfile(req.user._id);
      if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });
      const allowed = await isTeacherAssignedToClass(teacher.id, classId);
      if (!allowed) {
        return res.status(403).json({ message: 'Access denied. This class is not assigned to you.' });
      }
    }
    
    const grades = await prisma.grade.findMany({
      where: { classId, subject },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    const responseGrades = grades.map(g => {
      const mapped = mapGradeToResponse(g);
      if (g.student) {
        mapped.student = {
          ...g.student,
          _id: g.student.id,
          user: g.student.user ? { ...g.student.user, _id: g.student.user.id } : null
        };
      }
      return mapped;
    });

    res.status(200).json(responseGrades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createClass = async (req, res) => {
  try {
    const { name, subject, teacherId, schedule } = req.body;
    if (!name || !subject) {
      return res.status(400).json({ message: 'Class name and subject are required.' });
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        subject,
        teacherId: teacherId || null,
        schedule: schedule || null
      }
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Create Class', newClass.id, `Created class: ${name} (${subject})`);

    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getClasses = async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      include: {
        teacher: {
          include: {
            user: { select: { name: true } }
          }
        },
        sections: true
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSection = async (req, res) => {
  try {
    const { name, classId } = req.body;
    if (!name || !classId) {
      return res.status(400).json({ message: 'Section name and classId are required.' });
    }

    const section = await prisma.section.create({
      data: {
        name,
        classId
      }
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Create Section', section.id, `Created section: ${name} for class ${classId}`);

    res.status(201).json(section);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSectionsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const sections = await prisma.section.findMany({
      where: { classId },
      orderBy: { name: 'asc' }
    });
    res.status(200).json(sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  recordAttendance,
  getAttendanceSessions,
  unlockAttendance,
  saveGrades,
  getGrades, 
  getClassroomOptions,
  createClass,
  getClasses,
  createSection,
  getSectionsByClass,
  setGradingStructure,
  getGradingStructure
};

