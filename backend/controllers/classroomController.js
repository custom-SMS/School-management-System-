const prisma = require('../prisma');
const {
  getCachedJson,
  setCachedJson,
  delKey,
  shouldBypassCache,
} = require('../utils/cache');
const {
  classesKey,
  sectionsByClassKey,
  classroomOptionsKey,
} = require('../utils/classroomCacheKeys');

const { ensureHomeroomAssignmentAllowed, resolveClassHomeroomTeacherId } = require('../utils/homeroomGuard');
const { createClassSchema, updateClassSchema, saveGradesSchema, recordAttendanceSchema } = require('../utils/validation');

const cleanGradeName = (name) => {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/grade|class/g, '');
};

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
  submissionStatus: grade.submissionStatus,
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
    if (!shouldBypassCache(req)) {
      const teacherId = req.user?._id || null;
      const cacheKey = classroomOptionsKey(req.branchFilter || {}, req.user?.role, teacherId);
      const cached = await getCachedJson(cacheKey);
      if (cached) return res.status(200).json(cached);

      // If a cached response exists, it will already have returned above.
      // We still continue to compute and then store.
      // (Avoid writing cache for empty/broken payloads.)
    }

    let where = { ...(req.branchFilter || {}) };

    if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
      const teacher = await getTeacherProfile(req.user._id);
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher profile not found' });
      }

      where = {
        ...where,
        teacherId: teacher.id
      };
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
        },
        sections: {
          include: {
            enrollments: {
              where: { status: { in: ['Enrolled', 'Promoted', 'Repeated'] } },
              include: {
                student: {
                  include: {
                    user: { select: { id: true, name: true, email: true } }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const responseClasses = classes.map(c => {
      // Prefer students from section enrollments; fall back to direct M2M
      const enrolledStudents = (c.sections || [])
        .flatMap(section => (section.enrollments || []).map(e => e.student).filter(Boolean));

      const source = enrolledStudents.length > 0 ? enrolledStudents : (c.students || []);

      // De-duplicate by id
      const seen = new Set();
      const uniqueStudents = source
        .filter(s => s && !seen.has(s.id) && seen.add(s.id))
        .map(student => ({
          ...student,
          _id: student.id,
          user: student.user ? { ...student.user, _id: student.user.id } : null
        }));

      return {
        ...c,
        _id: c.id,
        teacher: c.teacher ? {
          ...c.teacher,
          _id: c.teacher.id,
          user: c.teacher.user ? { ...c.teacher.user, _id: c.teacher.user.id } : null
        } : null,
        students: uniqueStudents
      };
    });

    const payload = { classes: responseClasses };

    if (!shouldBypassCache(req)) {
      const teacherId = req.user?._id || null;
      const cacheKey = classroomOptionsKey(req.branchFilter || {}, req.user?.role, teacherId);
      // Keep cache short since data changes frequently
      await setCachedJson(cacheKey, payload, 60);
    }

    res.status(200).json(payload);
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
const normalizeDateBounds = (value) => {
  const date = value ? new Date(value) : new Date();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { date, start, end };
};

const getAttendanceResponse = (attendance) => ({
  _id: attendance.id,
  class: attendance.classId,
  date: attendance.date,
  recordedBy: attendance.recordedById,
  createdAt: attendance.createdAt,
  records: (attendance.records || []).map((r) => ({
    _id: r.id,
    student: r.studentId,
    status: r.status
  }))
});

// @desc    Record or update attendance for a class
// @route   POST /api/classroom/attendance
// @access  Private (Teacher/Admin)
const recordAttendance = async (req, res) => {
  try {
    const { classId, date, records, teacherId } = recordAttendanceSchema.parse(req.body);
    const studentIds = (records || []).map((record) => record.student).filter(Boolean);

    const authorization = await ensureTeacherAuthorization(req, classId, studentIds);
    if (!authorization.ok) {
      return res.status(authorization.status).json({ message: authorization.message });
    }

    const { date: attendanceDate, start: dayStart, end: dayEnd } = normalizeDateBounds(date);
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
      where: { isActive: true, branchId: targetClass?.branchId || undefined }
    });

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        classId: targetClass.id,
        date: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      include: {
        records: true
      }
    });

    let attendance;

    if (existingAttendance) {
      if (existingAttendance.locked && req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ message: 'This attendance session is locked and cannot be modified.' });
      }

      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          date: attendanceDate,
          recordedById: req.user._id,
          academicYearId: activeYear?.id || existingAttendance.academicYearId || null,
          records: {
            deleteMany: {},
            create: records.map((record) => ({
              studentId: record.student,
              status: record.status
            }))
          }
        },
        include: {
          records: true
        }
      });

      return res.status(200).json({
        message: 'Attendance updated successfully',
        attendance: getAttendanceResponse(attendance)
      });
    }

    attendance = await prisma.attendance.create({
      data: {
        classId: targetClass.id,
        academicYearId: activeYear?.id || null,
        date: attendanceDate,
        recordedById: req.user._id,
        records: {
          create: records.map((record) => ({
            studentId: record.student,
            status: record.status
          }))
        }
      },
      include: {
        records: true
      }
    });

    res.status(201).json({
      message: 'Attendance recorded successfully',
      attendance: getAttendanceResponse(attendance)
    });
  } catch (error) {
    console.error('Attendance Error:', error);
    res.status(400).json({ message: error.message });
  }
};

const getAttendanceRegister = async (req, res) => {
  try {
    const { classId, startDate, endDate } = req.query;

    if (!classId || !startDate || !endDate) {
      return res.status(400).json({ message: 'classId, startDate, and endDate are required.' });
    }

    const authorization = await ensureTeacherAuthorization(req, classId);
    if (!authorization.ok) {
      return res.status(authorization.status).json({ message: authorization.message });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date range supplied.' });
    }

    if (start > end) {
      return res.status(400).json({ message: 'startDate cannot be after endDate.' });
    }

    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          include: {
            user: { select: { name: true } }
          },
          orderBy: { studentId: 'asc' }
        }
      }
    });

    if (!targetClass) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    const dates = [];
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      dates.push(new Date(cursor));
    }

    const attendanceSessions = await prisma.attendance.findMany({
      where: {
        classId,
        date: {
          gte: start,
          lte: end
        }
      },
      include: {
        records: true
      },
      orderBy: { date: 'asc' }
    });

    const sessionByDate = new Map(
      attendanceSessions.map((session) => {
        const key = new Date(session.date).toISOString().slice(0, 10);
        return [key, session];
      })
    );

    const dateColumns = dates.map((entry) => {
      const iso = entry.toISOString().slice(0, 10);
      return {
        date: iso,
        day: entry.getDate(),
        weekday: entry.toLocaleDateString('en-US', { weekday: 'short' }),
        hasSession: sessionByDate.has(iso)
      };
    });

    const students = (targetClass.students || []).map((student) => {
      const marksByDate = {};
      let present = 0;
      let absent = 0;
      let late = 0;

      dateColumns.forEach((column) => {
        const session = sessionByDate.get(column.date);
        const record = session?.records?.find((item) => item.studentId === student.id);
        const shortStatus = record?.status === 'Present' ? 'P' : record?.status === 'Absent' ? 'A' : record?.status === 'Late' ? 'L' : '';

        if (shortStatus === 'P') present += 1;
        if (shortStatus === 'A') absent += 1;
        if (shortStatus === 'L') late += 1;

        marksByDate[column.date] = shortStatus;
      });

      return {
        id: student.id,
        name: student.user?.name || 'Student',
        studentId: student.studentId,
        grade: student.grade,
        marksByDate,
        totals: {
          present,
          absent,
          late
        }
      };
    });

    res.status(200).json({
      class: {
        id: targetClass.id,
        name: targetClass.name,
        subject: targetClass.subject || ''
      },
      period: {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10)
      },
      dates: dateColumns,
      students
    });
  } catch (error) {
    console.error('Attendance Register Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    List attendance sessions (for SuperAdmin lock management)
// @route   GET /api/classroom/attendance
// @access  Private (Admin/SuperAdmin)
const getAttendanceSessions = async (req, res) => {
  try {
    const sessions = await prisma.attendance.findMany({
      where: {
        class: { ...(req.branchFilter || {}) }
      },
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
    const { classId, subject, teacherId, gradesData, submitToHomeroom } = saveGradesSchema.parse(req.body);

    const studentIds = (gradesData || []).map((data) => data.student).filter(Boolean);

    const authorization = await ensureTeacherAuthorization(req, classId, studentIds);
    if (!authorization.ok) {
      return res.status(authorization.status).json({ message: authorization.message });
    }

    const klass = await prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true, branchId: true }
    });

    // Fetch active grading structure weights (e.g. Quiz 10%, Assignment 20%, Midterm 30%, Final 40%) for the class's branch
    const weights = await prisma.gradingStructure.findFirst({
      where: { isActive: true, branchId: klass?.branchId || undefined }
    }) || { quizWeight: 10, assignmentWeight: 20, midtermWeight: 30, finalWeight: 40 };

    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true, branchId: klass?.branchId || undefined }
    });

    // Resolve the active semester — prefer explicit body param, fall back to branch-specific active
    const activeSemester = await (async () => {
      if (req.body.semesterId) {
        return prisma.semester.findUnique({ where: { id: req.body.semesterId } });
      }
      return prisma.semester.findFirst({
        where: {
          isActive: true,
          academicYear: { branchId: klass?.branchId || undefined }
        }
      });
    })();

    // If submitting to homeroom, resolve the homeroom teachers for each student
    let studentSectionTeacherMap = new Map();
    let classHomeroomTeacherId = null;
    if (submitToHomeroom) {
      classHomeroomTeacherId = await resolveClassHomeroomTeacherId(prisma, classId);

      const enrollments = await prisma.enrollment.findMany({
        where: {
          studentId: { in: studentIds },
          academicYearId: activeYear?.id || undefined,
          status: 'Enrolled',
          section: { classId }
        },
        select: {
          studentId: true,
          section: {
            select: { homeroomTeacherId: true }
          }
        }
      });

      studentSectionTeacherMap = new Map(
        enrollments.map(e => [e.studentId, e.section?.homeroomTeacherId])
      );

      // Verify that every student has a resolved homeroom teacher (either section-level or class-level fallback)
      for (const studentId of studentIds) {
        const resolvedTeacherId = studentSectionTeacherMap.get(studentId) || classHomeroomTeacherId;
        if (!resolvedTeacherId) {
          return res.status(400).json({ message: 'No homeroom teacher assigned to one or more students\' sections or class. Cannot submit grades.' });
        }
      }
    }

    const results = [];
    // The frontend converts raw scores to percentages before sending.
    // e.g. if quiz weight=10 and teacher enters 7, the frontend sends 70 (= 7/10 * 100).
    // So we validate each component against 100 (not the weight).
    const componentLimits = {
      quiz: 100,
      assignment: 100,
      midterm: 100,
      final: 100,
    };
    const componentLabels = {
      quiz: 'Quiz',
      assignment: 'Assignment',
      midterm: 'Midterm',
      final: 'Final'
    };

    for (let data of gradesData) {
      const marks = data.marks || {};
      // Each component is scored out of 100 and combined using the configurable weights.
      const quiz = Number(marks.quiz || 0);
      const assignment = Number(marks.assignment || 0);
      const midterm = Number(marks.midterm || 0);
      const final = Number(marks.final || 0);
      const test = Number(marks.test || 0); // legacy column, retained but unweighted

      const invalidComponent = Object.entries(componentLimits).find(([field, maxAllowed]) => {
        const value = Number(marks[field] || 0);
        return Number.isNaN(value) || value < 0 || value > maxAllowed;
      });

      if (invalidComponent) {
        const [field] = invalidComponent;
        return res.status(400).json({
          message: `${componentLabels[field]} score cannot be greater than 100%.`,
          field,
          maxAllowed: 100,
          studentId: data.student
        });
      }

      // FR-27: Calculate final score automatically based on weights (which sum to 100%)
      const total = (quiz * (weights.quizWeight / 100)) +
        (assignment * (weights.assignmentWeight / 100)) +
        (midterm * (weights.midtermWeight / 100)) +
        (final * (weights.finalWeight / 100));

      const percentage = Number(total.toFixed(2)); // Weights sum to 100%, so total is already a percentage

      const existingGrade = await prisma.grade.findFirst({
        where: {
          studentId: data.student,
          classId,
          subject,
          ...(activeSemester?.id ? { semesterId: activeSemester.id } : {}),
        }
      });

      let savedGrade;
      const gradeData = {
        quiz,
        assignment,
        test,
        midterm,
        final,
        total,
        percentage,
        teacherId: req.user._id,
        academicYearId: activeYear?.id || null,
        semesterId: activeSemester?.id || null,
      };

      if (existingGrade) {
        savedGrade = await prisma.grade.update({
          where: { id: existingGrade.id },
          data: gradeData
        });
      } else {
        savedGrade = await prisma.grade.create({
          data: {
            studentId: data.student,
            classId,
            subject,
            ...gradeData,
          }
        });
      }

      // Apply submission status via raw SQL to avoid stale generated client issues
      if (submitToHomeroom) {
        const now = new Date().toISOString();
        const studentHomeroomTeacherId = studentSectionTeacherMap.get(data.student) || classHomeroomTeacherId;
        await prisma.$executeRawUnsafe(
          `UPDATE "Grade" SET "submissionStatus" = 'SubmittedToHomeroom', "submittedAt" = $1::timestamp, "submittedToId" = $2 WHERE id = $3`,
          now, studentHomeroomTeacherId, savedGrade.id
        );
        savedGrade.submissionStatus = 'SubmittedToHomeroom';
        savedGrade.submittedAt = new Date(now);
        savedGrade.submittedToId = studentHomeroomTeacherId;
      }

      results.push(mapGradeToResponse(savedGrade));
    }

    res.status(200).json({ message: submitToHomeroom ? 'Grades submitted to homeroom teacher successfully' : 'Grades saved successfully', results });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get submitted grades for homeroom teacher review
// @route   GET /api/classroom/grades/submitted/:classId
// @access  Private (Homeroom Teacher)
const getSubmittedGradesForHomeroom = async (req, res) => {
  try {
    const { classId } = req.params;
    const { semesterId } = req.query;

    const teacherProfile = await getTeacherProfile(req.user._id);
    if (!teacherProfile) {
      return res.status(404).json({ message: 'Teacher profile not found' });
    }

    // Verify user is the homeroom teacher for this class (either class-level or section-level)
    const klass = await prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true }
    });

    const isClassHomeroom = klass && klass.teacherId === teacherProfile.id;

    const sections = await prisma.section.findMany({
      where: {
        classId,
        homeroomTeacherId: teacherProfile.id
      },
      select: { id: true }
    });

    if (!isClassHomeroom && sections.length === 0) {
      return res.status(403).json({ message: 'You are not the homeroom teacher for this class or any of its sections' });
    }

    // Use raw SQL to query new columns that may not be in the generated Prisma client yet
    let semesterClause = '';
    const queryParams = [classId, 'SubmittedToHomeroom', teacherProfile.id];
    if (semesterId) {
      semesterClause = `AND g."semesterId" = $${queryParams.length + 1}`;
      queryParams.push(semesterId);
    }

    const grades = await prisma.$queryRawUnsafe(`
      SELECT
        g.id,
        g.subject,
        g.quiz,
        g.assignment,
        g.midterm,
        g.final,
        g.total,
        g.percentage,
        g."submissionStatus",
        g."submittedAt",
        g."submittedToId",
        g."classId",
        g."studentId",
        s.id as student_id,
        s."studentId" as student_number,
        u.name as student_name,
        u.email as student_email
      FROM "Grade" g
      JOIN "Student" s ON s.id = g."studentId"
      JOIN "User" u ON u.id = s."userId"
      WHERE g."classId" = $1
        AND g."submissionStatus" = $2
        AND g."submittedToId" = $3
        ${semesterClause}
      ORDER BY g.subject ASC, u.name ASC
    `, ...queryParams);

    // Shape the response to match what HomeroomGradeReview.jsx expects
    const shaped = grades.map(g => ({
      id: g.id,
      subject: g.subject,
      quiz: g.quiz,
      assignment: g.assignment,
      midterm: g.midterm,
      final: g.final,
      total: g.total,
      percentage: g.percentage,
      submissionStatus: g.submissionStatus,
      submittedAt: g.submittedAt,
      student: {
        id: g.student_id,
        studentId: g.student_number,
        user: {
          name: g.student_name,
          email: g.student_email,
        }
      }
    }));

    res.status(200).json(shaped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve grades submitted to homeroom teacher
// @route   POST /api/classroom/grades/approve
// @access  Private (Homeroom Teacher)
const approveGrades = async (req, res) => {
  try {
    const { gradeIds } = req.body;

    if (!Array.isArray(gradeIds) || gradeIds.length === 0) {
      return res.status(400).json({ message: 'gradeIds array is required' });
    }

    const teacherProfile = await getTeacherProfile(req.user._id);
    if (!teacherProfile) {
      return res.status(404).json({ message: 'Teacher profile not found' });
    }

    // Verify all grades are submitted to this homeroom teacher using raw SQL
    const placeholders = gradeIds.map((_, i) => `$${i + 1}`).join(', ');
    const checkParams = [...gradeIds, teacherProfile.id, 'SubmittedToHomeroom'];
    const checkIdx = gradeIds.length;
    const verifiedGrades = await prisma.$queryRawUnsafe(
      `SELECT id FROM "Grade" WHERE id IN (${placeholders}) AND "submittedToId" = $${checkIdx + 1} AND "submissionStatus" = $${checkIdx + 2}`,
      ...checkParams
    );

    if (verifiedGrades.length !== gradeIds.length) {
      return res.status(400).json({ message: 'Some grades are not submitted to you or already processed' });
    }

    // Approve via raw SQL
    const now = new Date().toISOString();
    await prisma.$executeRawUnsafe(
      `UPDATE "Grade" SET "submissionStatus" = 'ApprovedByHomeroom', "approvedAt" = $1::timestamp, "approvedById" = $2 WHERE id IN (${placeholders})`,
      now, teacherProfile.id, ...gradeIds
    );

    await logActivity(req.user._id, 'Approve Grades', gradeIds.join(','), `Approved ${gradeIds.length} grades`);

    res.status(200).json({ message: `Successfully approved ${gradeIds.length} grades` });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

const getGrades = async (req, res) => {
  try {
    const { classId, subject } = req.params;
    const { semesterId } = req.query;

    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
      select: { branchId: true }
    });
    if (!targetClass) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    if (req.user.role === 'Admin') {
      if (req.branchFilter?.branchId && targetClass.branchId !== req.branchFilter.branchId) {
        return res.status(403).json({ message: 'Access denied. Class is not in your branch.' });
      }
    } else if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
      const teacher = await getTeacherProfile(req.user._id);
      if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });
      const allowed = await isTeacherAssignedToClass(teacher.id, classId);
      if (!allowed) {
        return res.status(403).json({ message: 'Access denied. This class is not assigned to you.' });
      }
    }

    // Build where clause — filter by semester if provided
    const where = { classId, subject };
    if (semesterId) {
      where.semesterId = semesterId;
    } else {
      // Only filter by active semester if one actually exists — branch-specific
      const activeSemester = await prisma.semester.findFirst({
        where: {
          isActive: true,
          academicYear: { branchId: targetClass.branchId || undefined }
        }
      });
      if (activeSemester?.id) where.semesterId = activeSemester.id;
    }

    const grades = await prisma.grade.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        semester: { select: { id: true, name: true, order: true } },
      }
    });

    // Fetch submissionStatus for these grades via raw SQL (new columns not in generated client)
    const gradeIds = grades.map(g => g.id);
    let submissionStatusMap = {};
    if (gradeIds.length > 0) {
      const placeholders = gradeIds.map((_, i) => `$${i + 1}`).join(', ');
      const rawRows = await prisma.$queryRawUnsafe(
        `SELECT id, "submissionStatus" FROM "Grade" WHERE id IN (${placeholders})`,
        ...gradeIds
      );
      rawRows.forEach(r => { submissionStatusMap[r.id] = r.submissionStatus; });
    }

    const responseGrades = grades.map(g => {
      const mapped = mapGradeToResponse(g);
      mapped.submissionStatus = submissionStatusMap[g.id] || 'Draft';
      if (g.student) {
        mapped.student = {
          ...g.student,
          _id: g.student.id,
          user: g.student.user ? { ...g.student.user, _id: g.student.user.id } : null
        };
      }
      mapped.semester = g.semester || null;
      return mapped;
    });

    res.status(200).json(responseGrades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { semesterId, academicYearId } = req.query;

    // Authorization: SuperAdmin can see all, Admin only their branch, Teacher only their students
    if (req.user.role === 'Admin') {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { branchId: true }
      });
      if (student && req.branchFilter?.branchId && student.branchId !== req.branchFilter.branchId) {
        return res.status(403).json({ message: 'Access denied. Student is not in your branch.' });
      }
    } else if (req.user.role === 'Teacher') {
      const teacher = await getTeacherProfile(req.user._id);
      if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });
      const allowed = await isTeacherAssignedToStudents(teacher.id, [studentId]);
      if (!allowed) {
        return res.status(403).json({ message: 'Access denied. This student is not assigned to you.' });
      }
    }

    // Build filter — semester scoping
    const where = { studentId };
    if (semesterId) {
      where.semesterId = semesterId;
    }
    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const grades = await prisma.grade.findMany({
      where,
      include: {
        class: {
          select: { id: true, name: true, subject: true, stream: true }
        },
        semester: { select: { id: true, name: true, order: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
    });

    const responseGrades = grades.map(g => {
      const mapped = mapGradeToResponse(g);
      mapped.classRef = g.class ? {
        ...g.class,
        _id: g.class.id
      } : null;
      mapped.semester = g.semester || null;
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
    const { name, teacherId, schedule, stream, subjectIds } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Class name is required.' });
    }

    const normalizedName = name.trim();

    if (!ALLOWED_CLASS_NAMES.includes(normalizedName)) {
      return res.status(400).json({
        message: `Invalid class name. Allowed classes are: ${ALLOWED_CLASS_NAMES.join(', ')}.`
      });
    }

    const branchId = req.branchFilter?.branchId || null;

    const existingClass = await prisma.class.findFirst({
      where: {
        name: {
          equals: normalizedName,
          mode: 'insensitive'
        },
        stream: stream || null,
        ...(req.branchFilter || {})
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
        teacherId: teacherId || null,
        subject: 'General',
        schedule,
        stream,
        branchId,
        ...(subjectIds && subjectIds.length > 0 ? {
          classSubjects: {
            create: subjectIds.map(subjectId => ({ subjectId }))
          }
        } : {})
      },
      include: {
        classSubjects: {
          include: {
            subject: true
          }
        }
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
    if (!shouldBypassCache(req)) {
      const cacheKey = classesKey(req.branchFilter || {});
      const cached = await getCachedJson(cacheKey);
      if (cached) return res.status(200).json(cached);
    }

    // Strict branch isolation - only show classes belonging to the user's branch
    const branchFilterClause = req.branchFilter || {};

    const classes = await prisma.class.findMany({
      where: branchFilterClause,
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

    if (!shouldBypassCache(req)) {
      const cacheKey = classesKey(req.branchFilter || {});
      await setCachedJson(cacheKey, responseClasses, 60);
    }

    res.status(200).json(responseClasses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, stream, teacherId } = updateClassSchema.parse(req.body);

    const existingClass = await prisma.class.findUnique({ where: { id } });
    if (!existingClass) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    const updateData = {};

    if (name !== undefined) {
      const normalizedName = name.trim();
      if (!ALLOWED_CLASS_NAMES.includes(normalizedName)) {
        return res.status(400).json({
          message: `Invalid class name. Allowed classes are: ${ALLOWED_CLASS_NAMES.join(', ')}.`
        });
      }
      // Check duplicate name (excluding self)
      const duplicate = await prisma.class.findFirst({
        where: {
          name: { equals: normalizedName, mode: 'insensitive' },
          id: { not: id },
          ...(req.branchFilter || {})
        }
      });
      if (duplicate) {
        return res.status(400).json({ message: `Class "${normalizedName}" already exists.` });
      }
      updateData.name = normalizedName;
    }

    if (stream !== undefined) {
      updateData.stream = stream || null;
    }

    if (teacherId !== undefined) {
      if (teacherId) {
        const homeroomCheck = await ensureHomeroomAssignmentAllowed(prisma, { teacherId, excludeClassId: id });
        if (!homeroomCheck.ok) {
          return res.status(400).json({ message: homeroomCheck.message });
        }
      }
      updateData.teacherId = teacherId || null;
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: updateData
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Update Class', id, `Updated class: ${updatedClass.name}`);

    res.status(200).json(updatedClass);
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
      (existingClass._count?.timetables || 0);
    // Note: sections are NOT counted here because they have onDelete: Cascade
    // and are automatically removed when the class is deleted.

    if (relatedCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete this class because it has related students, attendance, grades, assignments, or timetable records.'
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
    if (!shouldBypassCache(req)) {
      const cacheKey = sectionsByClassKey(req.params?.classId, req.branchFilter || {});
      const cached = await getCachedJson(cacheKey);
      if (cached) return res.status(200).json(cached);
    }

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

    if (!shouldBypassCache(req)) {
      const cacheKey = sectionsByClassKey(req.params?.classId, req.branchFilter || {});
      await setCachedJson(cacheKey, responseSections, 60);
    }

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
        class: { select: { id: true, name: true, stream: true } },
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
          select: { id: true, name: true, stream: true, branchId: true }
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
      where: { isActive: true, branchId: section.class?.branchId || undefined }
    });

    const classClean = cleanGradeName(section.class?.name);
    const allStudents = await prisma.student.findMany({
      where: { ...(req.branchFilter || {}) },
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
      const studentClean = cleanGradeName(student.grade);
      const currentEnrollment = getCurrentEnrollment(student);
      const assignedToAnotherSection = currentEnrollment?.sectionId && currentEnrollment.sectionId !== sectionId;
      return classClean && studentClean === classClean && !assignedToAnotherSection;
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
        className: section.class?.name || '',
        classStream: section.class?.stream || ''
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
        class: { select: { id: true, name: true, branchId: true } }
      }
    });

    if (!section) {
      return res.status(404).json({ message: 'Section not found.' });
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true, branchId: section.class?.branchId || undefined }
    });

    if (!activeYear) {
      return res.status(400).json({ message: 'No active academic year found.' });
    }

    const classClean = cleanGradeName(section.class?.name);
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
      const studentClean = cleanGradeName(student.grade);
      return !classClean || studentClean !== classClean;
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

// ─── Class Subject Management ─────────────────────────────────────────────────

const addSubjectToClass = async (req, res) => {
  try {
    const { classId, subjectId, teacherId } = req.body;

    if (!classId || !subjectId) {
      return res.status(400).json({ message: 'Class ID and Subject ID are required.' });
    }

    const classExists = await prisma.class.findUnique({ where: { id: classId } });
    if (!classExists) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    const subjectExists = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subjectExists) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    const existing = await prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId,
          subjectId
        }
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'Subject already added to this class.' });
    }

    const classSubject = await prisma.classSubject.create({
      data: {
        classId,
        subjectId,
        teacherId: teacherId || null
      },
      include: {
        subject: true,
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Add Subject to Class', classId, `Added subject ${subjectExists.name} to class ${classExists.name}`);

    res.status(201).json(classSubject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeSubjectFromClass = async (req, res) => {
  try {
    const { classId, subjectId } = req.params;

    const classSubject = await prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId,
          subjectId
        }
      }
    });

    if (!classSubject) {
      return res.status(404).json({ message: 'Subject not found in this class.' });
    }

    await prisma.classSubject.delete({
      where: {
        classId_subjectId: {
          classId,
          subjectId
        }
      }
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Remove Subject from Class', classId, `Removed subject from class`);

    res.status(200).json({ message: 'Subject removed from class successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getClassSubjects = async (req, res) => {
  try {
    const { classId } = req.params;

    const classSubjects = await prisma.classSubject.findMany({
      where: { classId },
      include: {
        subject: true,
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    res.status(200).json(classSubjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateClassSubjectTeacher = async (req, res) => {
  try {
    const { classId, subjectId } = req.params;
    const { teacherId } = req.body;

    const classSubject = await prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId,
          subjectId
        }
      }
    });

    if (!classSubject) {
      return res.status(404).json({ message: 'Subject not found in this class.' });
    }

    if (teacherId) {
      const teacherExists = await prisma.teacher.findUnique({ where: { id: teacherId } });
      if (!teacherExists) {
        return res.status(404).json({ message: 'Teacher not found.' });
      }
    }

    const updated = await prisma.classSubject.update({
      where: {
        classId_subjectId: {
          classId,
          subjectId
        }
      },
      data: { teacherId },
      include: {
        subject: true,
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Update Class Subject Teacher', classId, `Updated teacher for subject`);

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  recordAttendance,
  getAttendanceRegister,
  getAttendanceSessions,
  unlockAttendance,
  saveGrades,
  getGrades,
  getStudentGrades,
  getClassroomOptions,
  createClass,
  getClasses,
  deleteClass,
  updateClass,
  deleteSection,
  forceDeleteClass,
  createSection,
  getSectionsByClass,
  getSectionById,
  updateSection,
  getSectionStudents,
  assignStudentsToSection,
  addSubjectToClass,
  removeSubjectFromClass,
  getClassSubjects,
  updateClassSubjectTeacher,
  getSubmittedGradesForHomeroom,
  approveGrades,
  setGradingStructure,
  getGradingStructure,
};

