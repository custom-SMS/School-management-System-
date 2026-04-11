const Student = require('../models/Student');
const Fee = require('../models/Fee');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Parent = require('../models/Parent');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const TeacherAssignment = require('../models/TeacherAssignment');

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
    const totalStudents = await Student.countDocuments();

    const studentsByClassRaw = await Student.aggregate([
      {
        $group: {
          _id: '$grade',
          count: { $sum: 1 },
        },
      },
    ]);

    const studentsByClass = studentsByClassRaw
      .map((entry) => ({
        className: normalizeClassLabel(entry._id),
        studentCount: entry.count,
      }))
      .sort((left, right) => compareClassLabels(left.className, right.className));

    // 2. Total Revenue (sum of all fees)
    // Using aggregation to sum the `amount` field where paid is true
    const revenueStats = await Fee.aggregate([
      { $match: { paid: true } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueStats.length > 0 ? revenueStats[0].totalRevenue : 0;

    // 3. Today's Attendance (Let's count how many present today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendancesToday = await Attendance.find({
      date: { $gte: today }
    });

    let presentCount = 0;
    let totalCount = 0;
    attendancesToday.forEach(att => {
      att.records.forEach(record => {
        totalCount++;
        if (record.status === 'Present') presentCount++;
      });
    });
    
    // We can just return the raw numbers or a percentage
    const classAttendance = await Attendance.aggregate([
      {
        $group: {
          _id: '$class',
          sessions: { $sum: 1 },
          records: { $push: '$records' },
        }
      }
    ]);

    const attendanceSummary = classAttendance.map((entry) => {
      const records = entry.records.flat();
      const checked = records.length;
      const present = records.filter((record) => record.status === 'Present').length;
      return {
        classId: entry._id,
        className: 'Unknown class',
        sessions: entry.sessions,
        checked,
        present,
        attendanceRate: checked > 0 ? Number(((present / checked) * 100).toFixed(2)) : 0,
      };
    });

    const classes = await Class.find().select('name');
    const classNameById = new Map(
      classes.map((classDoc) => [classDoc._id.toString(), normalizeClassLabel(classDoc.name)]),
    );

    attendanceSummary.forEach((entry) => {
      const className = classNameById.get(entry.classId?.toString()) || 'Unknown class';
      entry.className = className;
    });

    attendanceSummary.sort((left, right) => compareClassLabels(left.className, right.className));

    const feeRecords = await Fee.find().populate('student', 'grade');
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
    // req.user has _id from the JWT token
    const student = await Student.findOne({ user: req.user._id })
      .populate('user', 'name email')
      .populate('guardianContacts.parent');
    
    if (!student) {
      return res.status(404).json({ message: 'Student Profile not found' });
    }

    const grades = await Grade.find({ student: student._id });
    const fees = await Fee.find({ student: student._id }).sort({ createdAt: -1 });

    // 1. Get all attendance records where this student is mentioned so the rate reflects the full data set
    // 2. Keep a limited list for the dashboard table
    const allAttendanceRecords = await Attendance.find({
      'records.student': student._id,
    }).sort({ date: -1 });

    const studentAttendance = allAttendanceRecords.map((record) => {
      const myRecord = record.records.find((r) => r.student.toString() === student._id.toString());
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

    res.status(200).json({
      profile: student,
      studentId: student.studentId,
      grade: student.grade,
      grades,
      gradesCount: grades.length,
      fees,
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
    const teacher = await Teacher.findOne({ user: req.user._id }).populate('user', 'name email role');

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found' });
    }

    const assignedClassDocs = await Class.find({ teacher: teacher._id })
      .populate({
        path: 'students',
        select: 'studentId grade user',
        populate: { path: 'user', select: 'name email' },
      })
      .sort({ createdAt: -1 });

    const assignmentDocs = await TeacherAssignment.find({ teacher: teacher._id }).populate({
      path: 'class',
      select: 'name subject students',
      populate: {
        path: 'students',
        select: 'studentId grade user',
        populate: { path: 'user', select: 'name email' },
      },
    });

    const classMap = new Map();

    assignedClassDocs.forEach((klass) => {
      classMap.set(klass._id.toString(), klass);
    });

    assignmentDocs.forEach((assignment) => {
      if (assignment.class?._id) {
        classMap.set(assignment.class._id.toString(), assignment.class);
      }
    });

    const classes = Array.from(classMap.values()).sort((left, right) =>
      compareClassLabels(left.name, right.name),
    );

    const classSummaries = await Promise.all(classes.map(async (klass) => {
      const attendanceRecords = await Attendance.find({ class: klass._id }).sort({ date: -1 });
      const classGrades = await Grade.find({ class: klass._id, teacher: req.user._id })
        .populate({
          path: 'student',
          select: 'studentId grade user',
          populate: { path: 'user', select: 'name email' },
        })
        .sort({ createdAt: -1 });

      let attendanceTotal = 0;
      let attendancePresent = 0;

      attendanceRecords.forEach((record) => {
        record.records.forEach((entry) => {
          attendanceTotal += 1;
          if (entry.status === 'Present') {
            attendancePresent += 1;
          }
        });
      });

      const averageGrade = classGrades.length > 0
        ? Math.round(classGrades.reduce((sum, grade) => sum + Number(grade.percentage || 0), 0) / classGrades.length)
        : 0;

      return {
        classId: klass._id,
        className: normalizeClassLabel(klass.name),
        subject: normalizeClassLabel(klass.subject),
        studentCount: klass.students?.length || 0,
        attendanceSessions: attendanceRecords.length,
        attendanceRate: attendanceTotal > 0 ? Number(((attendancePresent / attendanceTotal) * 100).toFixed(2)) : 0,
        gradesCount: classGrades.length,
        averageGrade,
        latestAttendanceDate: attendanceRecords[0]?.date || null,
      };
    }));

    const assignedStudentsCount = new Set(
      classes.flatMap((klass) => (klass.students || []).map((student) => student?._id?.toString()).filter(Boolean)),
    ).size;

    const grades = await Grade.find({ teacher: req.user._id })
      .populate({
        path: 'student',
        select: 'studentId grade user',
        populate: { path: 'user', select: 'name email' },
      })
      .populate({
        path: 'class',
        select: 'name subject',
      })
      .sort({ createdAt: -1 })
      .limit(8);

    const attendanceDocs = await Attendance.find({ class: { $in: classes.map((klass) => klass._id) } })
      .populate('class', 'name subject')
      .sort({ date: -1 })
      .limit(8);

    const recentGrades = grades.map((grade) => ({
      gradeId: grade._id,
      studentName: grade.student?.user?.name || 'Student',
      studentId: grade.student?.studentId || '—',
      className: grade.class?.name || '—',
      subject: grade.subject,
      percentage: Number(grade.percentage || 0),
      total: Number(grade.total || 0),
      createdAt: grade.createdAt,
    }));

    const recentAttendance = attendanceDocs.map((attendance) => {
      const present = attendance.records.filter((record) => record.status === 'Present').length;
      return {
        attendanceId: attendance._id,
        className: attendance.class?.name || '—',
        date: attendance.date,
        present,
        total: attendance.records.length,
      };
    });

    const gradesRecordedCount = grades.length;
    const attendanceSessionsCount = classSummaries.reduce((sum, item) => sum + item.attendanceSessions, 0);
    const averageGrade = grades.length > 0
      ? Math.round(grades.reduce((sum, grade) => sum + Number(grade.percentage || 0), 0) / grades.length)
      : 0;

    res.status(200).json({
      teacher: teacher.user,
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
    const parent = await Parent.findOne({ user: req.user._id })
      .populate('children');

    if (!parent) {
      return res.status(404).json({ message: 'Parent profile not found' });
    }

    const children = [];

    for (const child of parent.children) {
      const childStudent = await Student.findById(child._id).populate('user', 'name email');
      if (!childStudent) continue;

      const grades = await Grade.find({ student: childStudent._id });
      const fees = await Fee.find({ student: childStudent._id }).sort({ createdAt: -1 });
      const attendanceRecords = await Attendance.find({ 'records.student': childStudent._id }).sort({ date: -1 }).limit(30);

      const attendance = attendanceRecords.map((record) => {
        const myRecord = record.records.find((r) => r.student.toString() === childStudent._id.toString());
        return { date: record.date, status: myRecord ? myRecord.status : 'Unknown' };
      });

      children.push({
        profile: childStudent,
        grades,
        fees,
        attendance,
      });
    }

    res.json({
      parent,
      children,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAdminStats, getStudentPortalStats, getParentPortalStats, getTeacherPortalStats };