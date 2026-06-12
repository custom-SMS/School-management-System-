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

    const teacherProfile = authorization.teacher || await getTeacherProfile(req.user._id);
    const targetClass = await resolveTeacherClass(teacherProfile?.id || teacherId, classId, studentIds);

    const attendance = await prisma.attendance.create({
      data: {
        classId: targetClass.id,
        date: date ? new Date(date) : new Date(),
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

    const results = [];

    for (let data of gradesData) {
      const marks = data.marks || {};
      const test = Number(marks.test || 0);
      const midterm = Number(marks.midterm || 0);
      const final = Number(marks.final || 0);

      const existingGrade = await prisma.grade.findFirst({
        where: { studentId: data.student, classId, subject }
      });

      let savedGrade;
      if (existingGrade) {
        savedGrade = await prisma.grade.update({
          where: { id: existingGrade.id },
          data: {
            test,
            midterm,
            final,
            teacherId: req.user._id
          }
        });
      } else {
        savedGrade = await prisma.grade.create({
          data: {
            studentId: data.student,
            classId,
            subject,
            teacherId: req.user._id,
            test,
            midterm,
            final
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

module.exports = { recordAttendance, saveGrades, getGrades, getClassroomOptions };

