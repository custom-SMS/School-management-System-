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

const letterFor = (pct) => {
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
};

// @desc    Academic report — grade distribution & subject performance
// @route   GET /api/reports/academic
// @access  Private (Admin/SuperAdmin)
const getAcademicReport = async (req, res) => {
  try {
    const grades = await prisma.grade.findMany({
      include: {
        student: { include: { user: { select: { name: true } } } },
        class: { select: { name: true } }
      }
    });

    // Grade distribution by letter
    const distributionMap = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    grades.forEach((g) => { distributionMap[letterFor(Number(g.percentage || 0))] += 1; });
    const gradeDistribution = Object.entries(distributionMap).map(([grade, count]) => ({
      grade,
      count,
      percentage: grades.length ? round((count / grades.length) * 100) : 0,
    }));

    // Subject performance (group by subject string)
    const subjectMap = new Map();
    grades.forEach((g) => {
      const subject = normalizeLabel(g.subject);
      if (!subjectMap.has(subject)) subjectMap.set(subject, { subject, total: 0, count: 0, pass: 0 });
      const bucket = subjectMap.get(subject);
      bucket.total += Number(g.percentage || 0);
      bucket.count += 1;
      if (Number(g.percentage || 0) >= 50) bucket.pass += 1;
    });
    const subjectPerformance = Array.from(subjectMap.values())
      .map((b) => ({
        subject: b.subject,
        entries: b.count,
        averageScore: b.count ? round(b.total / b.count) : 0,
        passRate: b.count ? round((b.pass / b.count) * 100) : 0,
      }))
      .sort((a, b) => b.averageScore - a.averageScore);

    // Top performers (per-student average)
    const studentMap = new Map();
    grades.forEach((g) => {
      const id = g.studentId;
      const name = g.student?.user?.name || 'Student';
      if (!studentMap.has(id)) studentMap.set(id, { name, total: 0, count: 0 });
      const bucket = studentMap.get(id);
      bucket.total += Number(g.percentage || 0);
      bucket.count += 1;
    });
    const topPerformers = Array.from(studentMap.values())
      .map((b) => ({ name: b.name, averageScore: b.count ? round(b.total / b.count) : 0, entries: b.count }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 10);

    const overallAverage = grades.length
      ? round(grades.reduce((sum, g) => sum + Number(g.percentage || 0), 0) / grades.length)
      : 0;

    res.status(200).json({
      summary: {
        totalEntries: grades.length,
        overallAverage,
        subjectsAssessed: subjectMap.size,
        passRate: grades.length ? round((grades.filter((g) => Number(g.percentage || 0) >= 50).length / grades.length) * 100) : 0,
      },
      gradeDistribution,
      subjectPerformance,
      topPerformers,
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
    const attendances = await prisma.attendance.findMany({
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
    const students = await prisma.student.findMany({
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
      ? await prisma.enrollment.count({ where: { academicYearId: activeYear.id } })
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
    const fees = await prisma.fee.findMany({
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
