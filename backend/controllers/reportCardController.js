const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');
const { sendNotification } = require('./notificationController');

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
    const settingsRows = await prisma.systemSetting.findMany({
      where: { key: 'grading' }
    });
    let passMark = 50; // default
    if (settingsRows.length > 0) {
      const gradingSettings = JSON.parse(settingsRows[0].value);
      passMark = gradingSettings.passMark || 50;
    }

    const compiledData = [];

    for (const enrollment of enrollments) {
      const studentId = enrollment.studentId;

      // 1. Calculate average grade score
      const grades = await prisma.grade.findMany({
        where: { studentId, academicYearId }
      });
      const avgScore = grades.length > 0
        ? grades.reduce((sum, g) => sum + Number(g.percentage || 0), 0) / grades.length
        : 0;

      // 2. Calculate attendance percentage
      const totalAttendance = await prisma.attendanceRecord.count({
        where: {
          studentId,
          attendance: { academicYearId }
        }
      });
      const presentAttendance = await prisma.attendanceRecord.count({
        where: {
          studentId,
          status: 'Present',
          attendance: { academicYearId }
        }
      });
      const attPercentage = totalAttendance > 0
        ? (presentAttendance / totalAttendance) * 100
        : 100; // Default to 100 if no classes occurred

      compiledData.push({
        studentId,
        gradeLevel: enrollment.grade,
        averageScore: Number(avgScore.toFixed(2)),
        attendancePercentage: Number(attPercentage.toFixed(2)),
        status: avgScore >= passMark ? 'Pass' : 'Fail'
      });
    }

    // 3. Group by grade level to calculate ranks
    const gradeGroups = {};
    compiledData.forEach(student => {
      if (!gradeGroups[student.gradeLevel]) {
        gradeGroups[student.gradeLevel] = [];
      }
      gradeGroups[student.gradeLevel].push(student);
    });

    // Calculate ranks within each grade level group
    for (const grade in gradeGroups) {
      // Sort descending by average score
      gradeGroups[grade].sort((a, b) => b.averageScore - a.averageScore);
      gradeGroups[grade].forEach((student, index) => {
        student.rank = index + 1;
      });
    }

    // Save report cards in transactions
    await prisma.$transaction(
      compiledData.map(data => 
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

    // Retrieve full grade list for detail table
    const grades = await prisma.grade.findMany({
      where: { studentId, academicYearId }
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

    const reportCard = await prisma.reportCard.update({
      where: { id },
      data: { teacherComments: comments }
    });

    await logActivity(req.user._id, 'Update Report Card Comments', id, `Updated comments on report card: ${id}`);

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
      const teacherProfile = await prisma.teacher.findUnique({
        where: { userId: req.user._id || req.user.id }
      });
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
        promotedById: req.user._id || req.user.id,
        promotionDate: new Date()
      }
    });

    await logActivity(req.user._id || req.user.id, 'Set Promotion Status', id, `Set promotion status to ${promotionStatus} for report card: ${id}`);

    res.status(200).json(updatedCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all report cards for a class (for Homeroom Teachers)
const getReportCardsByClass = async (req, res) => {
  try {
    const { classId, academicYearId } = req.params;
    
    // Find students in this class
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: true
      }
    });

    if (!classData) return res.status(404).json({ message: 'Class not found' });

    const studentIds = classData.students.map(s => s.id);

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
      }
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
