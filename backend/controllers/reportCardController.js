const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');
const { sendNotification } = require('./notificationController');

const normalizeLabel = (value) => {
  const label = String(value ?? '').trim();
  return label || 'Unassigned';
};

const parseSettingValue = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const getTeacherUserId = (req) => req.user?._id || req.user?.id || null;

const getTeacherProfileByUserId = async (userId) => {
  if (!userId) return null;
  return prisma.teacher.findUnique({
    where: { userId },
  });
};

const canTeacherAccessClass = async (teacherId, classId) => {
  if (!teacherId || !classId) return false;

  const ownedClass = await prisma.class.findFirst({
    where: { id: classId, teacherId },
    select: { id: true },
  });

  if (ownedClass) return true;

  const assignedClass = await prisma.teacherAssignment.findFirst({
    where: { teacherId, classId },
    select: { id: true },
  });

  return Boolean(assignedClass);
};

// Compile student report cards (averages, rankings, attendance percentages)
const compileReportCards = async (req, res) => {
  try {
    const { academicYearId } = req.body;
    if (!academicYearId) {
      return res.status(400).json({ message: 'academicYearId is required.' });
    }

    const year = await prisma.academicYear.findUnique({
      where: { id: academicYearId }
    });
    if (!year) return res.status(404).json({ message: 'Academic year not found.' });

    // Fetch all enrollments for this year
    const enrollments = await prisma.enrollment.findMany({
      where: { academicYearId },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!enrollments.length) {
      return res.status(400).json({ message: 'No student enrollments found for this academic year.' });
    }

    // Fetch grading settings for pass mark
    const gradingSetting = await prisma.systemSetting.findUnique({
      where: { key: 'grading' }
    });
    const gradingSettings = parseSettingValue(gradingSetting?.value, {});
    const passMark = Number(gradingSettings.passMark || 50);

    const studentIds = enrollments.map((enrollment) => enrollment.studentId);

    const [grades, attendanceRecords] = await Promise.all([
      prisma.grade.findMany({
        where: { academicYearId, studentId: { in: studentIds } },
        select: {
          studentId: true,
          classId: true,
          percentage: true,
        },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          studentId: { in: studentIds },
          attendance: { academicYearId },
        },
        include: {
          attendance: {
            select: {
              classId: true,
            },
          },
        },
      }),
    ]);

    const gradeSummaryByStudent = new Map();
    grades.forEach((grade) => {
      const bucket = gradeSummaryByStudent.get(grade.studentId) || {
        total: 0,
        count: 0,
        classIds: new Set(),
      };
      bucket.total += Number(grade.percentage || 0);
      bucket.count += 1;
      if (grade.classId) bucket.classIds.add(grade.classId);
      gradeSummaryByStudent.set(grade.studentId, bucket);
    });

    const attendanceSummaryByStudent = new Map();
    attendanceRecords.forEach((record) => {
      const bucket = attendanceSummaryByStudent.get(record.studentId) || {
        total: 0,
        present: 0,
        classIds: new Set(),
      };
      bucket.total += 1;
      if (record.status === 'Present') bucket.present += 1;
      if (record.attendance?.classId) bucket.classIds.add(record.attendance.classId);
      attendanceSummaryByStudent.set(record.studentId, bucket);
    });

    const compiledData = enrollments.map((enrollment) => {
      const studentId = enrollment.studentId;
      const gradeSummary = gradeSummaryByStudent.get(studentId) || { total: 0, count: 0, classIds: new Set() };
      const attendanceSummary = attendanceSummaryByStudent.get(studentId) || { total: 0, present: 0, classIds: new Set() };
      const averageScore = gradeSummary.count > 0 ? gradeSummary.total / gradeSummary.count : 0;
      const attendancePercentage = attendanceSummary.total > 0
        ? (attendanceSummary.present / attendanceSummary.total) * 100
        : 100;

      const classIds = new Set([
        ...Array.from(gradeSummary.classIds || []),
        ...Array.from(attendanceSummary.classIds || []),
      ]);

      return {
        studentId,
        gradeLevel: normalizeLabel(enrollment.grade),
        averageScore: Number(averageScore.toFixed(2)),
        attendancePercentage: Number(attendancePercentage.toFixed(2)),
        status: averageScore >= passMark ? 'Pass' : 'Fail',
        classKey: Array.from(classIds).sort().join(',') || null,
      };
    });

    // Calculate rank within class when possible, otherwise within grade level.
    const rankingGroups = {};
    compiledData.forEach((student) => {
      const groupKey = student.classKey
        ? `class:${student.classKey}`
        : `grade:${student.gradeLevel}`;
      if (!rankingGroups[groupKey]) {
        rankingGroups[groupKey] = [];
      }
      rankingGroups[groupKey].push(student);
    });

    Object.values(rankingGroups).forEach((group) => {
      group.sort((a, b) => b.averageScore - a.averageScore);
      group.forEach((student, index) => {
        student.rank = index + 1;
      });
    });

    // Save report cards in transactions
    await prisma.$transaction(
      compiledData.map((data) =>
        prisma.reportCard.upsert({
          where: {
            studentId_academicYearId: {
              studentId: data.studentId,
              academicYearId
            }
          },
          update: {
            grade: data.gradeLevel,
            attendancePercentage: data.attendancePercentage,
            averageScore: data.averageScore,
            rank: data.rank,
            status: data.status
          },
          create: {
            studentId: data.studentId,
            academicYearId,
            grade: data.gradeLevel,
            attendancePercentage: data.attendancePercentage,
            averageScore: data.averageScore,
            rank: data.rank,
            status: data.status,
            published: false
          }
        })
      )
    );

    await logActivity(req.user._id, 'Compile Report Cards', academicYearId, `Compiled report cards for academic year: ${year.year}`);

    res.status(200).json({ message: `Successfully compiled report cards for ${compiledData.length} students.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Report Card for a Student
const getReportCard = async (req, res) => {
  try {
    const { studentId, academicYearId } = req.params;

    const reportCard = await prisma.reportCard.findUnique({
      where: {
        studentId_academicYearId: {
          studentId,
          academicYearId
        }
      },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } }
          }
        },
        academicYear: true
      }
    });

    if (!reportCard) {
      return res.status(404).json({ message: 'Compiled report card not found for this student and academic year.' });
    }

    // Access permissions check: students and parents can only view if published
    if (!reportCard.published && ['Student', 'Parent'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Report cards are not published for this academic year yet.' });
    }

    if (req.user.role === 'Student' && reportCard.student.userId !== getTeacherUserId(req)) {
      return res.status(403).json({ message: 'You can only view your own report card.' });
    }

    if (req.user.role === 'Parent') {
      const parent = await prisma.parent.findUnique({
        where: { userId: getTeacherUserId(req) },
        include: { children: { select: { id: true } } },
      });

      const childIds = new Set((parent?.children || []).map((child) => child.id));
      if (!childIds.has(reportCard.studentId)) {
        return res.status(403).json({ message: 'You can only view report cards for your children.' });
      }
    }

    if (req.user.role === 'Teacher') {
      const teacherProfile = await getTeacherProfileByUserId(getTeacherUserId(req));
      if (!teacherProfile) {
        return res.status(404).json({ message: 'Teacher profile not found.' });
      }

      const teacherClassIds = new Set();

      const ownedClasses = await prisma.class.findMany({
        where: { teacherId: teacherProfile.id },
        select: { id: true },
      });
      ownedClasses.forEach((klass) => teacherClassIds.add(klass.id));

      const assignments = await prisma.teacherAssignment.findMany({
        where: { teacherId: teacherProfile.id },
        select: { classId: true },
      });
      assignments.forEach((assignment) => {
        if (assignment.classId) teacherClassIds.add(assignment.classId);
      });

      const studentClassLinks = await prisma.grade.findMany({
        where: { studentId, academicYearId },
        select: { classId: true },
      });

      const isAuthorized = studentClassLinks.some((link) => teacherClassIds.has(link.classId));

      if (!isAuthorized) {
        return res.status(403).json({ message: 'You are not authorized to view this report card.' });
      }
    }

    // Retrieve full grade list for detail table
    const grades = await prisma.grade.findMany({
      where: { studentId, academicYearId },
      include: {
        class: { select: { id: true, name: true, subject: true } },
        subjectRef: { select: { id: true, name: true, code: true } },
      },
      orderBy: [
        { subject: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    res.status(200).json({
      reportCard,
      grades
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Publish report cards for an academic year and dispatch notifications
const publishReportCards = async (req, res) => {
  try {
    const { academicYearId } = req.body;
    if (!academicYearId) {
      return res.status(400).json({ message: 'academicYearId is required.' });
    }

    const year = await prisma.academicYear.findUnique({
      where: { id: academicYearId }
    });
    if (!year) return res.status(404).json({ message: 'Academic year not found.' });

    // Update published flag
    await prisma.reportCard.updateMany({
      where: { academicYearId },
      data: { published: true }
    });

    // Notify students and parents
    const reportCards = await prisma.reportCard.findMany({
      where: { academicYearId },
      include: {
        student: {
          include: {
            user: { select: { id: true } },
            guardians: {
              include: {
                user: { select: { id: true } }
              }
            }
          }
        }
      }
    });

    for (const rc of reportCards) {
      const studentUserId = rc.student?.user?.id;
      if (studentUserId) {
        await sendNotification(
          studentUserId, 
          'Report Card Published', 
          `Your report card for Academic Year ${year.year} has been published. Download it now!`,
          'ReportCard'
        );
      }

      // Notify parents
      for (const parent of rc.student?.guardians || []) {
        if (parent.user?.id) {
          await sendNotification(
            parent.user.id, 
            'Report Card Published', 
            `The report card for ${rc.student.studentId} has been published for Academic Year ${year.year}.`,
            'ReportCard'
          );
        }
      }
    }

    await logActivity(req.user._id, 'Publish Report Cards', academicYearId, `Published all report cards for academic year: ${year.year}`);

    res.status(200).json({ message: `Successfully published report cards for academic year: ${year.year}.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add/update teacher comments on a report card
const updateReportComments = async (req, res) => {
  try {
    const { id } = req.params; // Report Card ID
    const { comments } = req.body;

    const existingReportCard = await prisma.reportCard.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            classes: { select: { id: true } },
          },
        },
      },
    });

    if (!existingReportCard) {
      return res.status(404).json({ message: 'Report card not found.' });
    }

    if (req.user.role === 'Teacher') {
      const teacherUserId = getTeacherUserId(req);
      const teacherProfile = await getTeacherProfileByUserId(teacherUserId);

      if (!teacherProfile) {
        return res.status(404).json({ message: 'Teacher profile not found.' });
      }

      const gradeLinks = await prisma.grade.findMany({
        where: {
          studentId: existingReportCard.studentId,
          academicYearId: existingReportCard.academicYearId,
        },
        select: { classId: true },
      });

      const classIds = [
        ...new Set([
          ...(existingReportCard.student.classes || []).map((klass) => klass.id),
          ...gradeLinks.map((grade) => grade.classId),
        ]),
      ];

      let authorized = false;
      for (const classId of classIds) {
        const canAccess = await canTeacherAccessClass(teacherProfile.id, classId);
        if (canAccess) {
          authorized = true;
          break;
        }
      }

      if (!authorized) {
        return res.status(403).json({ message: 'You are not authorized to comment on this report card.' });
      }
    }

    const reportCard = await prisma.reportCard.update({
      where: { id },
      data: { teacherComments: comments }
    });

    await logActivity(getTeacherUserId(req), 'Update Report Card Comments', id, `Updated comments on report card: ${id}`);

    res.status(200).json(reportCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Homeroom Teacher or Admin sets promotion status
const setPromotionStatus = async (req, res) => {
  try {
    const { id } = req.params; // Report Card ID
    const { promotionStatus } = req.body;

    if (!['Promoted', 'Not Promoted', 'Conditional Promotion', 'Pending'].includes(promotionStatus)) {
      return res.status(400).json({ message: 'Invalid promotion status.' });
    }

    const reportCard = await prisma.reportCard.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            classes: true
          }
        }
      }
    });

    if (!reportCard) {
      return res.status(404).json({ message: 'Report card not found.' });
    }

    // Permission check: Must be SuperAdmin/Admin or Homeroom Teacher
    let isAuthorized = false;
    if (['SuperAdmin', 'Admin'].includes(req.user.role)) {
      isAuthorized = true;
    } else if (req.user.role === 'Teacher') {
      const teacherProfile = await getTeacherProfileByUserId(getTeacherUserId(req));
      if (teacherProfile) {
        // Check if teacher is assigned to any of the student's classes
        const studentClasses = reportCard.student.classes.map(c => c.id);
        const homeroomClass = await prisma.class.findFirst({
          where: {
            id: { in: studentClasses },
            teacherId: teacherProfile.id
          }
        });
        if (homeroomClass) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Only the assigned Homeroom Teacher or Administrator can set the promotion status.' });
    }

    const updatedCard = await prisma.reportCard.update({
      where: { id },
      data: {
        promotionStatus,
        promotedById: getTeacherUserId(req),
        promotionDate: new Date()
      }
    });

    await logActivity(getTeacherUserId(req), 'Set Promotion Status', id, `Set promotion status to ${promotionStatus} for report card: ${id}`);

    res.status(200).json(updatedCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all report cards for a class (for Homeroom Teachers)
const getReportCardsByClass = async (req, res) => {
  try {
    const { classId, academicYearId } = req.params;

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: true
      }
    });

    if (!classData) return res.status(404).json({ message: 'Class not found' });

    if (req.user.role === 'Teacher') {
      const teacherProfile = await getTeacherProfileByUserId(getTeacherUserId(req));
      if (!teacherProfile) {
        return res.status(404).json({ message: 'Teacher profile not found.' });
      }

      const authorized = await canTeacherAccessClass(teacherProfile.id, classId);
      if (!authorized) {
        return res.status(403).json({ message: 'You are not authorized to view report cards for this class.' });
      }
    }

    const studentIds = classData.students.map((student) => student.id);

    const reportCards = await prisma.reportCard.findMany({
      where: {
        academicYearId,
        studentId: { in: studentIds }
      },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } }
          }
        }
      },
      orderBy: [
        { rank: 'asc' },
        { averageScore: 'desc' },
      ],
    });

    res.status(200).json(reportCards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  compileReportCards,
  getReportCard,
  publishReportCards,
  updateReportComments,
  setPromotionStatus,
  getReportCardsByClass
};
