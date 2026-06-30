const prisma = require('../prisma');

const normalizeClassLabel = (value) => {
  const label = String(value ?? '').trim();
  return label || 'Unassigned';
};

const classSortWeight = (value) => {
  const label = normalizeClassLabel(value);
  const match = label.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
};

const compareClassLabels = (left, right) => {
  const leftWeight = classSortWeight(left);
  const rightWeight = classSortWeight(right);

  if (leftWeight !== rightWeight) {
    return leftWeight - rightWeight;
  }

  return normalizeClassLabel(left).localeCompare(normalizeClassLabel(right));
};

// @desc    Get Admin Dashboard Stats
// @route   GET /api/stats/admin
// @access  Private (Admin)
const getAdminStats = async (req, res) => {
  try {
    // 1. Total Students
    const totalStudents = await prisma.student.count();

    const studentsByClassRaw = await prisma.student.groupBy({
      by: ['grade'],
      _count: {
        _all: true
      }
    });

    const studentsByClass = studentsByClassRaw
      .map((entry) => ({
        className: normalizeClassLabel(entry.grade),
        studentCount: entry._count._all,
      }))
      .sort((left, right) => compareClassLabels(left.className, right.className));

    // 2. Total Revenue (sum of all fees where paid is true)
    const revenueStats = await prisma.fee.aggregate({
      where: { paid: true },
      _sum: {
        amount: true
      }
    });
    const totalRevenue = revenueStats._sum.amount || 0;

    // 3. Today's Attendance (Let's count how many present today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendancesToday = await prisma.attendance.findMany({
      where: {
        date: { gte: today }
      },
      include: {
        records: true
      }
    });

    let presentCount = 0;
    let totalCount = 0;
    attendancesToday.forEach(att => {
      (att.records || []).forEach(record => {
        totalCount++;
        if (record.status === 'Present') presentCount++;
      });
    });
    
    // Group attendance records by class in memory - only last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const attendancesAll = await prisma.attendance.findMany({
      where: {
        date: { gte: thirtyDaysAgo }
      },
      include: {
        records: true
      },
      orderBy: { date: 'desc' },
      take: 500 // Limit to recent 500 attendance sessions
    });

    const classAttendanceMap = new Map();
    attendancesAll.forEach(att => {
      const classId = att.classId;
      if (!classAttendanceMap.has(classId)) {
        classAttendanceMap.set(classId, { classId, sessions: 0, records: [] });
      }
      const group = classAttendanceMap.get(classId);
      group.sessions += 1;
      group.records.push(...(att.records || []));
    });

    const classAttendance = Array.from(classAttendanceMap.values());

    const attendanceSummary = classAttendance.map((entry) => {
      const records = entry.records;
      const checked = records.length;
      const present = records.filter((record) => record.status === 'Present').length;
      return {
        classId: entry.classId,
        className: 'Unknown class',
        sessions: entry.sessions,
        checked,
        present,
        attendanceRate: checked > 0 ? Number(((present / checked) * 100).toFixed(2)) : 0,
      };
    });

    const classes = await prisma.class.findMany({
      select: { id: true, name: true }
    });
    const classNameById = new Map(
      classes.map((classDoc) => [classDoc.id, normalizeClassLabel(classDoc.name)]),
    );

    attendanceSummary.forEach((entry) => {
      const className = classNameById.get(entry.classId) || 'Unknown class';
      entry.className = className;
    });

    attendanceSummary.sort((left, right) => compareClassLabels(left.className, right.className));

    const feeRecords = await prisma.fee.findMany({
      include: {
        student: {
          select: { grade: true }
        }
      }
    });
    
    const feeSummaryMap = new Map();
    let totalPendingRevenue = 0;

    feeRecords.forEach((fee) => {
      const className = normalizeClassLabel(fee.student?.grade);
      const amount = Number(fee.amount || 0);

      if (!feeSummaryMap.has(className)) {
        feeSummaryMap.set(className, {
          className,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          paidCount: 0,
          pendingCount: 0,
        });
      }

      const bucket = feeSummaryMap.get(className);
      bucket.totalAmount += amount;

      if (fee.paid) {
        bucket.paidAmount += amount;
        bucket.paidCount += 1;
      } else {
        bucket.pendingAmount += amount;
        bucket.pendingCount += 1;
        totalPendingRevenue += amount;
      }
    });

    const feeSummaryByClass = Array.from(feeSummaryMap.values()).sort((left, right) =>
      compareClassLabels(left.className, right.className),
    );

    const avgAttendance = totalCount > 0 ? Number(((presentCount / totalCount) * 100).toFixed(2)) : 0;

    const recentAuditLogs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: { user: { select: { name: true, role: true } } }
    });

    res.status(200).json({
      totalStudents,
      totalRevenue,
      totalPendingRevenue,
      avgAttendance,
      attendance: {
        presentCount,
        totalChecked: totalCount,
      },
      attendanceSummary,
      studentsByClass,
      feeSummaryByClass,
      recentAuditLogs,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Student Portal Stats
// @route   GET /api/stats/student/me
// @access  Private (Student)
const getStudentPortalStats = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user._id },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student Profile not found' });
    }

    const grades = await prisma.grade.findMany({
      where: { studentId: student.id }
    });
    
    const fees = await prisma.fee.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' }
    });

    const allAttendanceRecords = await prisma.attendance.findMany({
      where: {
        records: {
          some: { studentId: student.id }
        }
      },
      include: { records: true },
      orderBy: { date: 'desc' }
    });

    const studentAttendance = allAttendanceRecords.map((record) => {
      const myRecord = record.records.find((r) => r.studentId === student.id);
      return {
        date: record.date,
        status: myRecord ? myRecord.status : 'Unknown',
      };
    });

    const attendancePresentCount = studentAttendance.filter((entry) => entry.status === 'Present').length;
    const attendanceLateCount = studentAttendance.filter((entry) => entry.status === 'Late').length;
    const attendanceAbsentCount = studentAttendance.filter((entry) => entry.status === 'Absent').length;
    const attendanceRecordedCount = studentAttendance.filter((entry) => entry.status !== 'Unknown').length;
    const attendanceRate = attendanceRecordedCount > 0
      ? Number(((attendancePresentCount / attendanceRecordedCount) * 100).toFixed(2))
      : 0;

    const recentAttendance = studentAttendance.slice(0, 30);

    const pendingFees = fees.reduce((sum, fee) => {
      return fee.paid ? sum : sum + Number(fee.amount || 0);
    }, 0);

    const mappedGrades = grades.map(g => ({
      ...g,
      _id: g.id,
      student: g.studentId,
      class: g.classId,
      teacher: g.teacherId,
      marks: {
        quiz: g.quiz,
        assignment: g.assignment,
        test: g.test,
        midterm: g.midterm,
        final: g.final
      }
    }));

    const mappedFees = fees.map(f => ({
      ...f,
      _id: f.id,
      student: f.studentId
    }));

    const responseStudent = {
      ...student,
      _id: student.id,
      user: student.user ? { ...student.user, _id: student.user.id } : null
    };

    res.status(200).json({
      profile: responseStudent,
      studentId: student.studentId,
      grade: student.grade,
      grades: mappedGrades,
      gradesCount: grades.length,
      fees: mappedFees,
      totalFees: pendingFees,
      attendance: recentAttendance,
      attendanceCount: recentAttendance.length,
      attendanceRate,
      attendanceBreakdown: {
        presentCount: attendancePresentCount,
        lateCount: attendanceLateCount,
        absentCount: attendanceAbsentCount,
        recordedCount: attendanceRecordedCount,
        totalSessions: studentAttendance.length,
      },
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Teacher Dashboard Stats
// @route   GET /api/stats/teacher/me
// @access  Private (Teacher)
const getTeacherPortalStats = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user._id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found' });
    }

    const assignedClassDocs = await prisma.class.findMany({
      where: { teacherId: teacher.id },
      include: {
        students: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const assignmentDocs = await prisma.teacherAssignment.findMany({
      where: { teacherId: teacher.id },
      include: {
        class: {
          include: {
            students: {
              include: {
                user: { select: { id: true, name: true, email: true } }
              }
            }
          }
        }
      }
    });

    const classMap = new Map();

    assignedClassDocs.forEach((klass) => {
      classMap.set(klass.id, klass);
    });

    assignmentDocs.forEach((assignment) => {
      if (assignment.class?.id) {
        classMap.set(assignment.class.id, assignment.class);
      }
    });

    const classes = Array.from(classMap.values()).sort((left, right) =>
      compareClassLabels(left.name, right.name),
    );

    const classSummaries = await Promise.all(classes.map(async (klass) => {
      // Single query for attendance with aggregation
      const attendanceAgg = await prisma.attendanceRecord.groupBy({
        by: ['status'],
        where: {
          attendance: { classId: klass.id }
        },
        _count: true
      });
      
      const attendanceTotal = attendanceAgg.reduce((sum, item) => sum + item._count, 0);
      const attendancePresent = attendanceAgg.find(item => item.status === 'Present')?._count || 0;

      // Single query for grades with aggregation
      const gradesAgg = await prisma.grade.aggregate({
        where: { classId: klass.id, teacherId: req.user._id },
        _avg: { percentage: true },
        _count: true
      });

      const averageGrade = gradesAgg._count > 0
        ? Math.round(gradesAgg._avg.percentage || 0)
        : 0;

      // Get latest attendance date separately
      const latestAttendance = await prisma.attendance.findFirst({
        where: { classId: klass.id },
        orderBy: { date: 'desc' },
        select: { date: true }
      });

      return {
        classId: klass.id,
        className: normalizeClassLabel(klass.name),
        subject: normalizeClassLabel(klass.subject),
        studentCount: klass.students?.length || 0,
        attendanceSessions: await prisma.attendance.count({ where: { classId: klass.id } }),
        attendanceRate: attendanceTotal > 0 ? Number(((attendancePresent / attendanceTotal) * 100).toFixed(2)) : 0,
        gradesCount: gradesAgg._count,
        averageGrade,
        latestAttendanceDate: latestAttendance?.date || null,
        isHomeroom: klass.teacherId === teacher.id
      };
    }));

    const assignedStudentsCount = new Set(
      classes.flatMap((klass) => (klass.students || []).map((student) => student?.id).filter(Boolean)),
    ).size;

    const grades = await prisma.grade.findMany({
      where: { teacherId: req.user._id },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        class: { select: { id: true, name: true, subject: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 8
    });

    const attendanceDocs = await prisma.attendance.findMany({
      where: {
        classId: { in: classes.map((klass) => klass.id) }
      },
      include: {
        class: { select: { id: true, name: true, subject: true } },
        records: true
      },
      orderBy: { date: 'desc' },
      take: 8
    });

    const recentGrades = grades.map((grade) => ({
      gradeId: grade.id,
      studentName: grade.student?.user?.name || 'Student',
      studentId: grade.student?.studentId || '—',
      className: grade.class?.name || '—',
      subject: grade.subject,
      percentage: Number(grade.percentage || 0),
      total: Number(grade.total || 0),
      createdAt: grade.createdAt,
    }));

    const recentAttendance = attendanceDocs.map((attendance) => {
      const present = (attendance.records || []).filter((record) => record.status === 'Present').length;
      return {
        attendanceId: attendance.id,
        className: attendance.class?.name || '—',
        date: attendance.date,
        present,
        total: (attendance.records || []).length,
      };
    });

    const gradesRecordedCount = grades.length;
    const attendanceSessionsCount = classSummaries.reduce((sum, item) => sum + item.attendanceSessions, 0);
    const averageGrade = grades.length > 0
      ? Math.round(grades.reduce((sum, grade) => sum + Number(grade.percentage || 0), 0) / grades.length)
      : 0;

    res.status(200).json({
      teacher: teacher.user ? { ...teacher.user, _id: teacher.user.id } : null,
      teacherId: teacher.teacherId,
      subject: teacher.subject,
      assignedClassesCount: classes.length,
      assignedStudentsCount,
      gradesRecordedCount,
      attendanceSessionsCount,
      averageGrade,
      classSummaries,
      recentGrades,
      recentAttendance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getParentPortalStats = async (req, res) => {
  try {
    const parent = await prisma.parent.findUnique({
      where: { userId: req.user._id },
      include: {
        children: true
      }
    });

    if (!parent) {
      return res.status(404).json({ message: 'Parent profile not found' });
    }

    const children = [];

    for (const child of parent.children) {
      const childStudent = await prisma.student.findUnique({
        where: { id: child.id },
        include: { user: { select: { id: true, name: true, email: true } } }
      });
      if (!childStudent) continue;

      const grades = await prisma.grade.findMany({
        where: { studentId: childStudent.id }
      });
      
      const fees = await prisma.fee.findMany({
        where: { studentId: childStudent.id },
        orderBy: { createdAt: 'desc' }
      });
      
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          records: {
            some: { studentId: childStudent.id }
          }
        },
        include: { records: true },
        orderBy: { date: 'desc' },
        take: 30
      });

      const attendance = attendanceRecords.map((record) => {
        const myRecord = record.records.find((r) => r.studentId === childStudent.id);
        return { date: record.date, status: myRecord ? myRecord.status : 'Unknown' };
      });

      const mappedGrades = grades.map(g => ({
        ...g,
        _id: g.id,
        student: g.studentId,
        class: g.classId,
        teacher: g.teacherId,
        marks: {
          test: g.test,
          midterm: g.midterm,
          final: g.final
        }
      }));

      const mappedFees = fees.map(f => ({
        ...f,
        _id: f.id,
        student: f.studentId
      }));

      children.push({
        profile: {
          ...childStudent,
          _id: childStudent.id,
          user: childStudent.user ? { ...childStudent.user, _id: childStudent.user.id } : null
        },
        grades: mappedGrades,
        fees: mappedFees,
        attendance,
      });
    }

    res.json({
      parent: {
        ...parent,
        _id: parent.id
      },
      children,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSuperAdminStats = async (req, res) => {
  try {
    const totalStudents = await prisma.student.count();
    const totalTeachers = await prisma.teacher.count();
    const totalCashiers = await prisma.user.count({ where: { role: 'Cashier' } });

    const revenueStats = await prisma.fee.aggregate({
      where: { paid: true },
      _sum: { amount: true }
    });
    const totalRevenue = revenueStats._sum.amount || 0;

    const activeYearDoc = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });
    const activeYear = activeYearDoc ? activeYearDoc.year : 'None';

    const systemHealth = 'Operational';

    const studentsByGrade = await prisma.student.groupBy({
      by: ['grade'],
      _count: { _all: true }
    });
    let primaryCount = 0, middleCount = 0, highCount = 0;
    studentsByGrade.forEach(g => {
      const match = String(g.grade).match(/\d+/);
      if (match) {
        const gradeNum = parseInt(match[0], 10);
        if (gradeNum >= 1 && gradeNum <= 6) primaryCount += g._count._all;
        else if (gradeNum >= 7 && gradeNum <= 8) middleCount += g._count._all;
        else if (gradeNum >= 9 && gradeNum <= 12) highCount += g._count._all;
      }
    });
    const studentDistribution = [
      { division: 'Primary', count: primaryCount },
      { division: 'Middle', count: middleCount },
      { division: 'High', count: highCount }
    ];

    const fees = await prisma.fee.findMany({
      where: { paid: true },
      include: { student: { select: { grade: true } } }
    });
    let primaryRev = 0, middleRev = 0, highRev = 0;
    fees.forEach(f => {
      const match = String(f.student?.grade || '').match(/\d+/);
      const amount = Number(f.amount || 0);
      if (match) {
        const gradeNum = parseInt(match[0], 10);
        if (gradeNum >= 1 && gradeNum <= 6) primaryRev += amount;
        else if (gradeNum >= 7 && gradeNum <= 8) middleRev += amount;
        else if (gradeNum >= 9 && gradeNum <= 12) highRev += amount;
      }
    });
    const revenueByDivision = [
      { division: 'Primary School', revenue: primaryRev },
      { division: 'Middle School', revenue: middleRev },
      { division: 'High School', revenue: highRev }
    ];

    const grades = await prisma.grade.findMany({
      include: { student: { select: { grade: true } } }
    });
    let pScore = 0, pCount = 0, mScore = 0, mCount = 0, hScore = 0, hCount = 0;
    grades.forEach(g => {
      const match = String(g.student?.grade || '').match(/\d+/);
      const percentage = Number(g.percentage || 0);
      if (match && percentage > 0) {
        const gradeNum = parseInt(match[0], 10);
        if (gradeNum >= 1 && gradeNum <= 6) { pScore += percentage; pCount++; }
        else if (gradeNum >= 7 && gradeNum <= 8) { mScore += percentage; mCount++; }
        else if (gradeNum >= 9 && gradeNum <= 12) { hScore += percentage; hCount++; }
      }
    });
    const divisionPerformance = [
      { division: 'Primary School', score: pCount > 0 ? Math.round(pScore / pCount) : 0 },
      { division: 'Middle School', score: mCount > 0 ? Math.round(mScore / mCount) : 0 },
      { division: 'High School', score: hCount > 0 ? Math.round(hScore / hCount) : 0 }
    ];

    const recentAuditLogs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: { user: { select: { name: true } } }
    });

    const unlockRequestsCount = await prisma.attendance.count({
      where: { locked: true } // Simplified: count of locked sessions that might need unlocking
    });

    res.status(200).json({
      totalStudents,
      totalTeachers,
      totalCashiers,
      totalRevenue,
      activeYear,
      systemHealth,
      divisionPerformance,
      revenueByDivision,
      studentDistribution,
      unlockRequestsCount,
      recentAuditLogs
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAdminStats, getSuperAdminStats, getStudentPortalStats, getParentPortalStats, getTeacherPortalStats };
