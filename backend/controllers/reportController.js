const prisma = require('../prisma');

const normalizeLabel = (value) => {
  const label = String(value ?? '').trim();
  return label || 'Unassigned';
};

const classSortWeight = (value) => {
  const match = normalizeLabel(value).match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
};

const compareLabels = (left, right) => {
  const lw = classSortWeight(left);
  const rw = classSortWeight(right);
  if (lw !== rw) return lw - rw;
  return normalizeLabel(left).localeCompare(normalizeLabel(right));
};

const round = (value) => Number(Number(value || 0).toFixed(2));

// @desc    Academic report — grade performance & top performers per grade
// @route   GET /api/reports/academic
// @access  Private (Admin/SuperAdmin)
const getAcademicReport = async (req, res) => {
  try {
    const where = {};
    if (req.branchFilter && Object.keys(req.branchFilter).length > 0) {
      where.class = { ...(req.branchFilter || {}) };
    }
    if (req.academicYearFilter && Object.keys(req.academicYearFilter).length > 0) {
      Object.assign(where, req.academicYearFilter);
    }
    const grades = await prisma.grade.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            grade: true,
            user: { select: { name: true } },
          },
        },
        class: { select: { name: true } },
      },
    });

    // Count unique subjects assessed
    const subjectSet = new Set();
    grades.forEach((g) => subjectSet.add(normalizeLabel(g.subject)));

    const overallAverage = grades.length
      ? round(grades.reduce((sum, g) => sum + Number(g.percentage || 0), 0) / grades.length)
      : 0;

    // Grade performance: group grade entries by the student's grade level (e.g. "Grade 10")
    // Then compute per-student averages and pick top 5 per grade level.
    // Only grade levels that have at least one mark entry are included.
    const gradeLevelMap = new Map(); // gradeName -> Map<studentId, { name, total, count }>

    grades.forEach((g) => {
      const gradeLevel = normalizeLabel(g.student?.grade);
      const studentId = g.studentId;
      const studentName = g.student?.user?.name || 'Student';

      if (!gradeLevelMap.has(gradeLevel)) gradeLevelMap.set(gradeLevel, new Map());
      const studentMap = gradeLevelMap.get(gradeLevel);

      if (!studentMap.has(studentId)) studentMap.set(studentId, { name: studentName, total: 0, count: 0 });
      const bucket = studentMap.get(studentId);
      bucket.total += Number(g.percentage || 0);
      bucket.count += 1;
    });

    // Build gradePerformance array — each entry is one grade level with its top 5 students
    const gradePerformance = Array.from(gradeLevelMap.entries())
      .sort((a, b) => compareLabels(a[0], b[0]))
      .map(([gradeLevel, studentMap]) => {
        const topStudents = Array.from(studentMap.values())
          .map((b) => ({
            name: b.name,
            averageScore: b.count ? round(b.total / b.count) : 0,
            entries: b.count,
          }))
          .sort((a, b) => b.averageScore - a.averageScore)
          .slice(0, 5);

        return {
          gradeLevel,
          topStudents,
        };
      });

    res.status(200).json({
      summary: {
        totalEntries: grades.length,
        overallAverage,
        subjectsAssessed: subjectSet.size,
        passRate: grades.length
          ? round((grades.filter((g) => Number(g.percentage || 0) >= 50).length / grades.length) * 100)
          : 0,
      },
      gradePerformance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Attendance report — school-wide attendance & tardiness
// @route   GET /api/reports/attendance
// @access  Private (Admin/SuperAdmin)
const getAttendanceReport = async (req, res) => {
  try {
    const where = {};
    if (req.branchFilter && Object.keys(req.branchFilter).length > 0) {
      where.class = { ...(req.branchFilter || {}) };
    }
    if (req.academicYearFilter && Object.keys(req.academicYearFilter).length > 0) {
      Object.assign(where, req.academicYearFilter);
    }
    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        class: { select: { id: true, name: true, subject: true } },
        records: true,
      }
    });

    let present = 0;
    let absent = 0;
    let late = 0;

    const classMap = new Map();

    attendances.forEach((att) => {
      const classId = att.classId;
      if (!classMap.has(classId)) {
        classMap.set(classId, {
          className: att.class?.name || 'Unknown class',
          subject: att.class?.subject || '',
          sessions: 0, present: 0, absent: 0, late: 0, total: 0,
        });
      }
      const bucket = classMap.get(classId);
      bucket.sessions += 1;
      (att.records || []).forEach((r) => {
        bucket.total += 1;
        if (r.status === 'Present') { present += 1; bucket.present += 1; }
        else if (r.status === 'Late') { late += 1; bucket.late += 1; }
        else if (r.status === 'Absent') { absent += 1; bucket.absent += 1; }
      });
    });

    const totalRecords = present + absent + late;

    const byClass = Array.from(classMap.values())
      .map((b) => ({
        ...b,
        attendanceRate: b.total ? round(((b.present + b.late) / b.total) * 100) : 0,
        tardinessRate: b.total ? round((b.late / b.total) * 100) : 0,
      }))
      .sort((a, b) => compareLabels(a.className, b.className));

    res.status(200).json({
      summary: {
        totalSessions: attendances.length,
        totalRecords,
        present, absent, late,
        attendanceRate: totalRecords ? round(((present + late) / totalRecords) * 100) : 0,
        absenteeismRate: totalRecords ? round((absent / totalRecords) * 100) : 0,
        tardinessRate: totalRecords ? round((late / totalRecords) * 100) : 0,
      },
      byClass,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Enrollment report — demographics & new student stats
// @route   GET /api/reports/enrollment
// @access  Private (Admin/SuperAdmin)
const getEnrollmentReport = async (req, res) => {
  try {
    const where = {
      user: {
        isActive: true,
      },
      ...(req.branchFilter || {})
    };
    const students = await prisma.student.findMany({
      where,
      select: { id: true, grade: true, personalDetails: true, enrollmentDate: true }
    });

    const totalStudents = students.length;

    // By grade
    const gradeMap = new Map();
    students.forEach((s) => {
      const grade = normalizeLabel(s.grade);
      gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1);
    });
    const byGrade = Array.from(gradeMap.entries())
      .map(([grade, count]) => ({
        grade,
        count,
        percentage: totalStudents ? round((count / totalStudents) * 100) : 0,
      }))
      .sort((a, b) => compareLabels(a.grade, b.grade));

    // By gender (read from personalDetails JSON)
    const genderMap = new Map();
    students.forEach((s) => {
      const raw = s.personalDetails && typeof s.personalDetails === 'object' ? s.personalDetails.gender : null;
      const gender = normalizeLabel(raw) === 'Unassigned' ? 'Unspecified' : normalizeLabel(raw);
      genderMap.set(gender, (genderMap.get(gender) || 0) + 1);
    });
    const byGender = Array.from(genderMap.entries())
      .map(([gender, count]) => ({
        gender,
        count,
        percentage: totalStudents ? round((count / totalStudents) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // New students (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const newLast30Days = students.filter((s) => s.enrollmentDate && new Date(s.enrollmentDate) >= thirtyDaysAgo).length;

    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
    const enrollmentsThisYear = activeYear
      ? await prisma.enrollment.count({
        where: {
          academicYearId: activeYear.id,
          student: {
            user: {
              isActive: true,
            },
            ...(req.branchFilter || {})
          },
        },
      })
      : 0;

    res.status(200).json({
      summary: {
        totalStudents,
        gradeLevels: gradeMap.size,
        newLast30Days,
        activeYear: activeYear?.year || 'None',
        enrollmentsThisYear,
      },
      byGrade,
      byGender,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Financial summary report — fee collections
// @route   GET /api/reports/financial
// @access  Private (Admin/SuperAdmin)
const getFinancialReport = async (req, res) => {
  try {
    const where = {};
    if (req.branchFilter && Object.keys(req.branchFilter).length > 0) {
      where.student = { ...(req.branchFilter || {}) };
    }
    if (req.academicYearFilter && Object.keys(req.academicYearFilter).length > 0) {
      Object.assign(where, req.academicYearFilter);
    }
    const fees = await prisma.fee.findMany({
      where,
      include: { student: { select: { grade: true } } }
    });

    let totalBilled = 0;
    let totalCollected = 0;
    let totalPending = 0;

    const monthMap = new Map();
    const gradeMap = new Map();

    fees.forEach((fee) => {
      const amount = Number(fee.amount || 0);
      totalBilled += amount;
      if (fee.paid) totalCollected += amount; else totalPending += amount;

      const month = normalizeLabel(fee.month);
      if (!monthMap.has(month)) monthMap.set(month, { month, billed: 0, collected: 0, pending: 0 });
      const mBucket = monthMap.get(month);
      mBucket.billed += amount;
      if (fee.paid) mBucket.collected += amount; else mBucket.pending += amount;

      const grade = normalizeLabel(fee.student?.grade);
      if (!gradeMap.has(grade)) gradeMap.set(grade, { grade, billed: 0, collected: 0, pending: 0 });
      const gBucket = gradeMap.get(grade);
      gBucket.billed += amount;
      if (fee.paid) gBucket.collected += amount; else gBucket.pending += amount;
    });

    const byMonth = Array.from(monthMap.values()).map((b) => ({
      ...b,
      billed: round(b.billed), collected: round(b.collected), pending: round(b.pending),
    }));

    const byGrade = Array.from(gradeMap.values())
      .map((b) => ({
        ...b,
        billed: round(b.billed), collected: round(b.collected), pending: round(b.pending),
        collectionRate: b.billed ? round((b.collected / b.billed) * 100) : 0,
      }))
      .sort((a, b) => compareLabels(a.grade, b.grade));

    res.status(200).json({
      summary: {
        totalBilled: round(totalBilled),
        totalCollected: round(totalCollected),
        totalPending: round(totalPending),
        collectionRate: totalBilled ? round((totalCollected / totalBilled) * 100) : 0,
        invoices: fees.length,
      },
      byMonth,
      byGrade,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAcademicReport,
  getAttendanceReport,
  getEnrollmentReport,
  getFinancialReport,
};
