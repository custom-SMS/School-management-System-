const prisma = require('../prisma');
const { ensureHomeroomAssignmentAllowed, resolveClassHomeroomTeacherId } = require('../utils/homeroomGuard');

const ALLOWED_CLASS_NAMES = [
  'Nursery',
  'LKG',
  'UKG',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12'
];

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

const isTeacherAssignedToClass = async (teacherId, classId, subject = null) => {
  if (!classId) return false;

  const assignment = await prisma.teacherAssignment.findFirst({
    where: { teacherId, classId }
  });

  // HomeRoomTeacher has full access to the class regardless of subject
  if (assignment && assignment.assignmentType === 'HomeRoomTeacher') return true;

  // SubjectTeacher only has access if they're assigned to this class
  if (assignment && assignment.assignmentType === 'SubjectTeacher') {
    // If subject is specified, check if they teach that subject
    if (subject) {
      return assignment.subjectId === subject || assignment.class?.subject === subject;
    }
    return true;
  }

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
    // HomeRoomTeacher has access to all students in the class
    // SubjectTeacher has access to students in their assigned class
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
  if (req.user.role === 'Admin' || req.user.role === 'SuperAdmin') return { ok: true };

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

    // Only SuperAdmin can edit grades — Admin gets read-only access
    if (req.user.role === 'Admin') {
      return res.status(403).json({ message: 'Admins have view-only access to grades. Only SuperAdmin can edit grades.' });
    }

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
      // Each component may be nullable. Treat null/empty as not provided.
      const toNumOrNull = (v) => (v === null || v === undefined || (typeof v === 'string' && String(v).trim() === '')) ? null : Number(v);
      const quiz = toNumOrNull(marks.quiz);
      const assignment = toNumOrNull(marks.assignment);
      const midterm = toNumOrNull(marks.midterm);
      const final = toNumOrNull(marks.final);
      const test = toNumOrNull(marks.test); // legacy column, retained but unweighted

      // FR-27: Calculate final score automatically based on weights, using only provided components.
      const compWeights = [];
      if (quiz != null) compWeights.push({ score: quiz, weight: weights.quizWeight });
      if (assignment != null) compWeights.push({ score: assignment, weight: weights.assignmentWeight });
      if (midterm != null) compWeights.push({ score: midterm, weight: weights.midtermWeight });
      if (final != null) compWeights.push({ score: final, weight: weights.finalWeight });

      let storedTotal = 0;
      let storedPercentage = 0;
      if (compWeights.length > 0) {
        const weightedSum = compWeights.reduce((s, c) => s + (c.score * c.weight), 0);
        const sumWeights = compWeights.reduce((s, c) => s + c.weight, 0);
        storedTotal = Number((weightedSum / sumWeights).toFixed(2));
        storedPercentage = storedTotal;
      }

      const existingGrade = await prisma.grade.findFirst({
        where: { studentId: data.student, classId, subject }
      });

      let savedGrade;
      const gradeFields = {
        total: storedTotal,
        percentage: storedPercentage,
        teacherId: req.user._id,
        academicYearId: activeYear?.id || null,
        // Always write every component explicitly — null clears a previously-set value
        quiz: quiz ?? null,
        assignment: assignment ?? null,
        test: test ?? null,
        midterm: midterm ?? null,
        final: final ?? null,
      };

      if (existingGrade) {
        savedGrade = await prisma.grade.update({
          where: { id: existingGrade.id },
          data: gradeFields,
        });
      } else {
        savedGrade = await prisma.grade.create({
          data: {
            studentId: data.student,
            classId,
            subject,
            ...gradeFields,
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

// @desc    Get all grades for a specific student (all subjects) — Admin/SuperAdmin
// @route   GET /api/classroom/grades/student/:studentId
// @access  Private (Admin/SuperAdmin)
const getStudentAllGrades = async (req, res) => {
  try {
    const { studentId } = req.params;

    const grades = await prisma.grade.findMany({
      where: { studentId },
      include: {
        class: { select: { id: true, name: true, subject: true } },
        subjectRef: { select: { id: true, name: true } }
      },
      orderBy: [{ subject: 'asc' }, { updatedAt: 'desc' }]
    });

    res.status(200).json(grades.map(g => ({
      ...mapGradeToResponse(g),
      classRef: g.class || null,
    })));
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

    // Students can fetch their own grades
    if (req.user.role === 'Student') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user._id }
      });
      if (!student) return res.status(404).json({ message: 'Student profile not found' });

      // Only return the student's own grades
      const grades = await prisma.grade.findMany({
        where: { classId, subject, studentId: student.id },
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

      return res.status(200).json(responseGrades);
    }

    // Teachers and Admins need authorization checks
    if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
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

const getNextSectionLetter = (sectionNames = []) => {
  const usedLetters = new Set(
    sectionNames
      .map((sectionName) => String(sectionName || '').trim().toUpperCase())
      .filter(Boolean)
  );

  let code = 65; // A
  while (usedLetters.has(String.fromCharCode(code))) {
    code += 1;
  }

  return String.fromCharCode(code);
};

const createClass = async (req, res) => {
  try {
    const { name, teacherId, schedule } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Class name is required.' });
    }

    const normalizedName = name.trim();

    if (!ALLOWED_CLASS_NAMES.includes(normalizedName)) {
      return res.status(400).json({
        message: `Invalid class name. Allowed classes are: ${ALLOWED_CLASS_NAMES.join(', ')}.`
      });
    }

    const existingClass = await prisma.class.findFirst({
      where: {
        name: {
          equals: normalizedName,
          mode: 'insensitive'
        }
      }
    });

    if (existingClass) {
      return res.status(400).json({ message: `Class "${normalizedName}" already exists.` });
    }

    if (teacherId) {
      const homeroomCheck = await ensureHomeroomAssignmentAllowed(prisma, { teacherId });

      if (!homeroomCheck.ok) {
        return res.status(400).json({ message: homeroomCheck.message });
      }
    }

    const newClass = await prisma.class.create({
      data: {
        name: normalizedName,
        subject: 'General',
        teacherId: teacherId || null,
        schedule: schedule || null
      }
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Create Class', newClass.id, `Created class: ${normalizedName}`);

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
            user: { select: { id: true, name: true, email: true } }
          }
        },
        sections: {
          include: {
            homeroomTeacher: {
              include: {
                user: { select: { id: true, name: true, email: true } }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const responseClasses = await Promise.all(classes.map(async (klass) => {
      const resolvedTeacherId = await resolveClassHomeroomTeacherId(prisma, klass.id, { fallbackToClass: false });
      const resolvedTeacher = resolvedTeacherId
        ? await prisma.teacher.findUnique({
          where: { id: resolvedTeacherId },
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        })
        : null;

      return {
        ...klass,
        _id: klass.id,
        teacher: klass.teacher ? {
          ...klass.teacher,
          _id: klass.teacher.id,
          user: klass.teacher.user ? { ...klass.teacher.user, _id: klass.teacher.user.id } : null
        } : null,
        homeroomTeacher: resolvedTeacher ? {
          ...resolvedTeacher,
          _id: resolvedTeacher.id,
          user: resolvedTeacher.user ? { ...resolvedTeacher.user, _id: resolvedTeacher.user.id } : null
        } : null,
        sections: (klass.sections || []).map((section) => ({
          ...section,
          _id: section.id,
          homeroomTeacher: section.homeroomTeacher ? {
            ...section.homeroomTeacher,
            _id: section.homeroomTeacher.id,
            user: section.homeroomTeacher.user ? { ...section.homeroomTeacher.user, _id: section.homeroomTeacher.user.id } : null
          } : null
        }))
      };
    }));

    res.status(200).json(responseClasses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    const existingClass = await prisma.class.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            students: true,
            attendances: true,
            grades: true,
            assignments: true,
            sections: true,
            timetables: true
          }
        }
      }
    });

    if (!existingClass) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    const relatedCount =
      (existingClass._count?.students || 0) +
      (existingClass._count?.attendances || 0) +
      (existingClass._count?.grades || 0) +
      (existingClass._count?.assignments || 0) +
      (existingClass._count?.sections || 0) +
      (existingClass._count?.timetables || 0);

    if (relatedCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete this class because it has related students, sections, attendance, grades, assignments, or timetable records.'
      });
    }

    await prisma.class.delete({
      where: { id }
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Delete Class', id, `Deleted class: ${existingClass.name}`);

    res.status(200).json({ message: 'Class deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const forceDeleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    const existingClass = await prisma.class.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            students: true,
            attendances: true,
            grades: true,
            assignments: true,
            sections: true,
            timetables: true
          }
        }
      }
    });

    if (!existingClass) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    const studentsToDetach = await prisma.student.findMany({
      where: {
        classes: {
          some: { id }
        }
      },
      select: { id: true }
    });

    await Promise.all(
      studentsToDetach.map((student) =>
        prisma.student.update({
          where: { id: student.id },
          data: {
            classes: {
              disconnect: { id }
            }
          }
        })
      )
    );

    const result = await prisma.$transaction(async (tx) => {
      const deletedAssignments = await tx.teacherAssignment.deleteMany({
        where: { classId: id }
      });

      const deletedGrades = await tx.grade.deleteMany({
        where: { classId: id }
      });

      const deletedTimetables = await tx.timetable.deleteMany({
        where: { classId: id }
      });

      const deletedAttendances = await tx.attendance.deleteMany({
        where: { classId: id }
      });

      const deletedSections = await tx.section.deleteMany({
        where: { classId: id }
      });

      await tx.class.delete({
        where: { id }
      });

      return {
        detachedStudents: studentsToDetach.length,
        deletedAssignments: deletedAssignments.count,
        deletedGrades: deletedGrades.count,
        deletedTimetables: deletedTimetables.count,
        deletedAttendances: deletedAttendances.count,
        deletedSections: deletedSections.count
      };
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(
      req.user._id,
      'Force Delete Class',
      id,
      `Force deleted class: ${existingClass.name}. Detached students: ${result.detachedStudents}, deleted sections: ${result.deletedSections}, attendance sessions: ${result.deletedAttendances}, grades: ${result.deletedGrades}, assignments: ${result.deletedAssignments}, timetables: ${result.deletedTimetables}`
    );

    res.status(200).json({
      message: 'Class force deleted successfully. Students were kept and unassigned from the class.',
      summary: {
        classId: id,
        className: existingClass.name,
        detachedStudents: result.detachedStudents,
        deletedSections: result.deletedSections,
        deletedAttendances: result.deletedAttendances,
        deletedGrades: result.deletedGrades,
        deletedAssignments: result.deletedAssignments,
        deletedTimetables: result.deletedTimetables
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSection = async (req, res) => {
  try {
    const { name, classId } = req.body;
    if (!classId) {
      return res.status(400).json({ message: 'classId is required.' });
    }

    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        sections: {
          select: { name: true }
        }
      }
    });

    if (!existingClass) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    const normalizedSectionName = typeof name === 'string' && name.trim()
      ? name.trim().toUpperCase()
      : getNextSectionLetter(existingClass.sections.map((section) => section.name));

    const duplicateSection = existingClass.sections.find(
      (section) => String(section.name || '').trim().toUpperCase() === normalizedSectionName
    );

    if (duplicateSection) {
      return res.status(400).json({ message: `Section "${normalizedSectionName}" already exists for ${existingClass.name}.` });
    }

    const section = await prisma.section.create({
      data: {
        name: normalizedSectionName,
        class: {
          connect: { id: classId }
        }
      },
      include: {
        homeroomTeacher: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(
      req.user._id,
      'Create Section',
      section.id,
      `Created section: ${normalizedSectionName} for class ${existingClass.name}`
    );

    res.status(201).json(section);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSectionsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const resolvedTeacherId = await resolveClassHomeroomTeacherId(prisma, classId, { fallbackToClass: false });
    const resolvedTeacher = resolvedTeacherId
      ? await prisma.teacher.findUnique({
        where: { id: resolvedTeacherId },
        include: { user: { select: { id: true, name: true, email: true } } }
      })
      : null;

    const sections = await prisma.section.findMany({
      where: { classId },
      include: {
        homeroomTeacher: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const responseSections = sections.map((section) => ({
      ...section,
      _id: section.id,
      classHomeroomTeacher: resolvedTeacher ? {
        ...resolvedTeacher,
        _id: resolvedTeacher.id,
        user: resolvedTeacher.user ? { ...resolvedTeacher.user, _id: resolvedTeacher.user.id } : null
      } : null,
      homeroomTeacher: section.homeroomTeacher ? {
        ...section.homeroomTeacher,
        _id: section.homeroomTeacher.id,
        user: section.homeroomTeacher.user ? { ...section.homeroomTeacher.user, _id: section.homeroomTeacher.user.id } : null
      } : null
    }));

    res.status(200).json(responseSections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSectionById = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        class: { select: { id: true, name: true } },
        homeroomTeacher: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    if (!section) {
      return res.status(404).json({ message: 'Section not found.' });
    }

    const resolvedTeacherId = await resolveClassHomeroomTeacherId(prisma, section.classId, { fallbackToClass: false });
    const resolvedTeacher = resolvedTeacherId
      ? await prisma.teacher.findUnique({
        where: { id: resolvedTeacherId },
        include: { user: { select: { id: true, name: true, email: true } } }
      })
      : null;

    res.status(200).json({
      ...section,
      _id: section.id,
      classHomeroomTeacher: resolvedTeacher ? {
        ...resolvedTeacher,
        _id: resolvedTeacher.id,
        user: resolvedTeacher.user ? { ...resolvedTeacher.user, _id: resolvedTeacher.user.id } : null
      } : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { name, homeroomTeacherId } = req.body;

    const section = await prisma.section.findUnique({
      where: { id: sectionId }
    });

    if (!section) {
      return res.status(404).json({ message: 'Section not found.' });
    }

    const normalizedSectionName = typeof name === 'string' && name.trim()
      ? name.trim().toUpperCase()
      : section.name;

    if (normalizedSectionName !== section.name) {
      const duplicate = await prisma.section.findFirst({
        where: {
          classId: section.classId,
          name: normalizedSectionName,
          id: { not: sectionId }
        }
      });

      if (duplicate) {
        return res.status(400).json({ message: `Section "${normalizedSectionName}" already exists for this class.` });
      }
    }

    if (homeroomTeacherId) {
      const teacherExists = await prisma.teacher.findUnique({
        where: { id: homeroomTeacherId }
      });

      if (!teacherExists) {
        return res.status(400).json({ message: 'Selected homeroom teacher was not found.' });
      }

      const homeroomCheck = await ensureHomeroomAssignmentAllowed(prisma, {
        teacherId: homeroomTeacherId,
        classId: section.classId,
        excludeSectionId: sectionId
      });

      if (!homeroomCheck.ok) {
        return res.status(400).json({ message: homeroomCheck.message });
      }
    }

    const nextHomeroomTeacherId = homeroomTeacherId === null || homeroomTeacherId === ''
      ? null
      : homeroomTeacherId;

    const updatedSection = await prisma.$transaction(async (tx) => {
      const savedSection = await tx.section.update({
        where: { id: sectionId },
        data: {
          name: normalizedSectionName,
          homeroomTeacher: nextHomeroomTeacherId === null
            ? { disconnect: true }
            : { connect: { id: nextHomeroomTeacherId } }
        },
        include: {
          class: { select: { id: true, name: true } },
          homeroomTeacher: {
            include: {
              user: { select: { id: true, name: true, email: true } }
            }
          }
        }
      });

      const previousTeacherId = section.homeroomTeacherId;

      if (previousTeacherId && previousTeacherId !== nextHomeroomTeacherId) {
        const otherSections = await tx.section.count({
          where: { classId: section.classId, homeroomTeacherId: previousTeacherId }
        });
        if (otherSections === 0) {
          await tx.teacherAssignment.deleteMany({
            where: { teacherId: previousTeacherId, classId: section.classId, assignmentType: 'HomeRoomTeacher' }
          });
        }
      }

      if (nextHomeroomTeacherId && previousTeacherId !== nextHomeroomTeacherId) {
        const existing = await tx.teacherAssignment.findFirst({
          where: { teacherId: nextHomeroomTeacherId, classId: section.classId, assignmentType: 'HomeRoomTeacher' }
        });
        if (!existing) {
          await tx.teacherAssignment.create({
            data: {
              teacherId: nextHomeroomTeacherId,
              classId: section.classId,
              assignmentType: 'HomeRoomTeacher',
              assignedById: req.user._id
            }
          });
        }
      }

      return savedSection;
    });

    const resolvedTeacherId = await resolveClassHomeroomTeacherId(prisma, section.classId, { fallbackToClass: false });

    await prisma.class.update({
      where: { id: section.classId },
      data: { teacherId: resolvedTeacherId }
    });

    res.status(200).json(updatedSection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        enrollments: {
          where: { status: { in: ['Enrolled', 'Promoted', 'Repeated'] } },
          select: { id: true }
        }
      }
    });

    if (!section) {
      return res.status(404).json({ message: 'Section not found.' });
    }

    if (section.enrollments.length > 0) {
      return res.status(400).json({ message: 'Cannot delete section with assigned students.' });
    }

    await prisma.section.delete({
      where: { id: sectionId }
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(
      req.user._id,
      'Delete Section',
      section.id,
      `Deleted empty section: ${section.name} from class ${section.classId}`
    );

    res.status(200).json({ message: 'Section deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSectionStudents = async (req, res) => {
  try {
    const { sectionId } = req.params;

    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        class: {
          select: { id: true, name: true }
        },
        homeroomTeacher: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        enrollments: {
          where: { status: { in: ['Enrolled', 'Promoted', 'Repeated'] } },
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true, email: true, isActive: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!section) {
      return res.status(404).json({ message: 'Section not found.' });
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });

    const classNumber = String(section.class?.name || '').match(/(\d+)/)?.[1] || '';
    const allStudents = await prisma.student.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
        enrollments: {
          include: {
            section: { select: { id: true, name: true } },
            academicYear: { select: { id: true, year: true, isActive: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: {
        enrollmentDate: 'desc'
      }
    });

    const getCurrentEnrollment = (student) => {
      return activeYear
        ? student.enrollments?.find((enrollment) => enrollment.academicYearId === activeYear.id)
        : student.enrollments?.find((enrollment) => ['Enrolled', 'Promoted', 'Repeated'].includes(enrollment.status));
    };

    const eligibleStudents = allStudents.filter((student) => {
      const studentGradeNumber = String(student.grade || '').match(/(\d+)/)?.[1] || '';
      const currentEnrollment = getCurrentEnrollment(student);
      const assignedToAnotherSection = currentEnrollment?.sectionId && currentEnrollment.sectionId !== sectionId;
      return classNumber && studentGradeNumber === classNumber && !assignedToAnotherSection;
    });

    const assignedIds = new Set(
      (section.enrollments || [])
        .filter((enrollment) => !activeYear || enrollment.academicYearId === activeYear.id)
        .map((enrollment) => enrollment.studentId)
        .filter(Boolean)
    );

    res.status(200).json({
      section: {
        id: section.id,
        name: section.name,
        classId: section.class?.id,
        className: section.class?.name || ''
      },
      students: eligibleStudents.map((student) => {
        const currentEnrollment = getCurrentEnrollment(student);
        return {
          ...student,
          _id: student.id,
          user: student.user ? { ...student.user, _id: student.user.id } : null,
          isAssignedToSection: assignedIds.has(student.id),
          currentSectionId: currentEnrollment?.sectionId || null,
          currentSectionName: currentEnrollment?.section?.name || null
        };
      })
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const assignStudentsToSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds)) {
      return res.status(400).json({ message: 'studentIds must be an array.' });
    }

    const uniqueStudentIds = [...new Set(studentIds.filter(Boolean))];

    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        class: { select: { id: true, name: true } }
      }
    });

    if (!section) {
      return res.status(404).json({ message: 'Section not found.' });
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });

    if (!activeYear) {
      return res.status(400).json({ message: 'No active academic year found.' });
    }

    const classNumber = String(section.class?.name || '').match(/(\d+)/)?.[1] || '';
    const students = uniqueStudentIds.length
      ? await prisma.student.findMany({
        where: { id: { in: uniqueStudentIds } },
        select: { id: true, grade: true }
      })
      : [];

    if (students.length !== uniqueStudentIds.length) {
      return res.status(400).json({ message: 'One or more selected students were not found.' });
    }

    const invalidStudent = students.find((student) => {
      const studentGradeNumber = String(student.grade || '').match(/(\d+)/)?.[1] || '';
      return !classNumber || studentGradeNumber !== classNumber;
    });

    if (invalidStudent) {
      return res.status(400).json({ message: 'Selected students must belong to the same class grade as this section.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.enrollment.updateMany({
        where: {
          academicYearId: activeYear.id,
          sectionId,
          ...(uniqueStudentIds.length ? { studentId: { notIn: uniqueStudentIds } } : {})
        },
        data: {
          sectionId: null
        }
      });

      await Promise.all(students.map((student) => tx.enrollment.upsert({
        where: {
          studentId_academicYearId: {
            studentId: student.id,
            academicYearId: activeYear.id
          }
        },
        update: {
          grade: student.grade,
          sectionId
        },
        create: {
          studentId: student.id,
          academicYearId: activeYear.id,
          grade: student.grade,
          sectionId,
          status: 'Enrolled'
        }
      })));
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(
      req.user._id,
      'Assign Students To Section',
      sectionId,
      `Assigned ${uniqueStudentIds.length} students to section ${section.class?.name || ''}${section.name}`
    );

    res.status(200).json({
      message: 'Students assigned to section successfully.',
      assignedCount: uniqueStudentIds.length
    });
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
  getStudentAllGrades,
  getClassroomOptions,
  createClass,
  getClasses,
  deleteClass,
  forceDeleteClass,
  createSection,
  getSectionsByClass,
  getSectionById,
  updateSection,
  deleteSection,
  getSectionStudents,
  assignStudentsToSection,
  setGradingStructure,
  getGradingStructure
};

