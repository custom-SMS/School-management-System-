const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');
const { sendNotification } = require('./notificationController');

const normalizeLabel = (value) => String(value ?? '').trim() || 'Unassigned';

const parseSettingValue = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

const getActorId = (req) => req.user?._id || req.user?.id || null;

const getTeacherProfileByUserId = async (userId) => {
  if (!userId) return null;
  return prisma.teacher.findUnique({ where: { userId } });
};

const canTeacherAccessClass = async (teacherId, classId) => {
  if (!teacherId || !classId) return false;
  const owned = await prisma.class.findFirst({ where: { id: classId, teacherId }, select: { id: true } });
  if (owned) return true;
  const assigned = await prisma.teacherAssignment.findFirst({ where: { teacherId, classId }, select: { id: true } });
  return Boolean(assigned);
};

// ─── Helper: resolve active semesterId from DB ────────────────────────────────
const resolveActiveSemesterId = async () => {
  const active = await prisma.semester.findFirst({ where: { isActive: true }, select: { id: true } });
  return active?.id || null;
};

// ─── Compile ─────────────────────────────────────────────────────────────────
/**
 * Compile (or re-compile) report cards for all enrolled students.
 *
 * Body: { academicYearId, semesterId }
 *
 * If semesterId is omitted, the globally active semester is used.
 * Semester 2 report cards automatically compute a combinedAverage
 * from the stored semester1Snapshot + current semester 2 average.
 */
const compileReportCards = async (req, res) => {
  try {
    const { academicYearId } = req.body;
    let { semesterId } = req.body;

    if (!academicYearId) return res.status(400).json({ message: 'academicYearId is required.' });

    // Resolve semesterId from active semester when not supplied
    if (!semesterId) {
      semesterId = await resolveActiveSemesterId();
    }
    if (!semesterId) {
      return res.status(400).json({ message: 'semesterId is required and no active semester is set.' });
    }

    const [year, semester] = await Promise.all([
      prisma.academicYear.findUnique({ where: { id: academicYearId } }),
      prisma.semester.findUnique({ where: { id: semesterId } }),
    ]);
    if (!year) return res.status(404).json({ message: 'Academic year not found.' });
    if (!semester) return res.status(404).json({ message: 'Semester not found.' });
    if (semester.academicYearId !== academicYearId) {
      return res.status(400).json({ message: 'Semester does not belong to this academic year.' });
    }

    const isSemester2 = semester.order === 2;

    const enrollments = await prisma.enrollment.findMany({
      where: { academicYearId },
      include: { student: { include: { user: { select: { id: true, name: true } } } } },
    });
    if (!enrollments.length) return res.status(400).json({ message: 'No student enrollments found for this academic year.' });

    const gradingSetting = await prisma.systemSetting.findUnique({ where: { key: 'grading' } });
    const gradingSettings = parseSettingValue(gradingSetting?.value, {});
    const passMark = Number(gradingSettings.passMark || 50);

    const studentIds = enrollments.map((e) => e.studentId);

    const [grades, attendanceRecords] = await Promise.all([
      prisma.grade.findMany({
        where: { academicYearId, semesterId, studentId: { in: studentIds } },
        select: { studentId: true, classId: true, percentage: true },
      }),
      prisma.attendanceRecord.findMany({
        where: { studentId: { in: studentIds }, attendance: { academicYearId } },
        include: { attendance: { select: { classId: true } } },
      }),
    ]);

    const gradeSummary = new Map();
    grades.forEach((g) => {
      const b = gradeSummary.get(g.studentId) || { total: 0, count: 0, classIds: new Set() };
      b.total += Number(g.percentage || 0);
      b.count += 1;
      if (g.classId) b.classIds.add(g.classId);
      gradeSummary.set(g.studentId, b);
    });

    const attSummary = new Map();
    attendanceRecords.forEach((r) => {
      const b = attSummary.get(r.studentId) || { total: 0, present: 0, absent: 0, late: 0, classIds: new Set() };
      b.total += 1;
      if (r.status === 'Present') b.present += 1;
      else if (r.status === 'Absent') b.absent += 1;
      else if (r.status === 'Late') b.late += 1;
      if (r.attendance?.classId) b.classIds.add(r.attendance.classId);
      attSummary.set(r.studentId, b);
    });

    // If Semester 2, fetch existing Semester 1 report cards to capture sem1Snapshot
    let sem1Cards = new Map();
    if (isSemester2) {
      const sem1 = await prisma.semester.findFirst({
        where: { academicYearId, order: 1 },
        select: { id: true },
      });
      if (sem1) {
        const sem1Reports = await prisma.reportCard.findMany({
          where: { academicYearId, semesterId: sem1.id, studentId: { in: studentIds } },
          select: { studentId: true, averageScore: true },
        });
        sem1Reports.forEach((r) => sem1Cards.set(r.studentId, r.averageScore));
      }
    }

    const compiledData = enrollments.map((enrollment) => {
      const sid = enrollment.studentId;
      const gs = gradeSummary.get(sid) || { total: 0, count: 0, classIds: new Set() };
      const as = attSummary.get(sid) || { total: 0, present: 0, absent: 0, late: 0, classIds: new Set() };
      const avgScore = gs.count > 0 ? gs.total / gs.count : 0;
      const attPct = as.total > 0 ? (as.present / as.total) * 100 : 100;
      const classIds = new Set([...gs.classIds, ...as.classIds]);

      // Semester 2: compute combined average from sem1Snapshot + sem2 avg
      const sem1Snapshot = isSemester2 ? (sem1Cards.get(sid) ?? null) : null;
      const combinedAverage = isSemester2 && sem1Snapshot !== null
        ? Number(((sem1Snapshot + avgScore) / 2).toFixed(2))
        : null;

      return {
        studentId: sid,
        gradeLevel: normalizeLabel(enrollment.grade),
        averageScore: Number(avgScore.toFixed(2)),
        attendancePercentage: Number(attPct.toFixed(2)),
        attendancePresent: as.present,
        attendanceAbsent: as.absent,
        attendanceLate: as.late,
        attendanceTotal: as.total,
        status: avgScore >= passMark ? 'Pass' : 'Fail',
        classKey: Array.from(classIds).sort().join(',') || null,
        sem1Snapshot,
        combinedAverage,
      };
    });

    // Rank within class or grade
    const rankGroups = {};
    compiledData.forEach((s) => {
      const key = s.classKey ? `class:${s.classKey}` : `grade:${s.gradeLevel}`;
      if (!rankGroups[key]) rankGroups[key] = [];
      rankGroups[key].push(s);
    });
    Object.values(rankGroups).forEach((group) => {
      group.sort((a, b) => b.averageScore - a.averageScore);
      group.forEach((s, i) => { s.rank = i + 1; });
    });

    await prisma.$transaction(
      compiledData.map((d) =>
        prisma.reportCard.upsert({
          where: { studentId_academicYearId_semesterId: { studentId: d.studentId, academicYearId, semesterId } },
          update: {
            grade: d.gradeLevel,
            attendancePercentage: d.attendancePercentage,
            attendancePresent: d.attendancePresent,
            attendanceAbsent: d.attendanceAbsent,
            attendanceLate: d.attendanceLate,
            attendanceTotal: d.attendanceTotal,
            averageScore: d.averageScore,
            rank: d.rank,
            status: d.status,
            workflowStatus: 'Draft',
            ...(d.sem1Snapshot !== null && { semester1Snapshot: d.sem1Snapshot }),
            ...(d.combinedAverage !== null && { combinedAverage: d.combinedAverage }),
          },
          create: {
            studentId: d.studentId,
            academicYearId,
            semesterId,
            grade: d.gradeLevel,
            attendancePercentage: d.attendancePercentage,
            attendancePresent: d.attendancePresent,
            attendanceAbsent: d.attendanceAbsent,
            attendanceLate: d.attendanceLate,
            attendanceTotal: d.attendanceTotal,
            averageScore: d.averageScore,
            rank: d.rank,
            status: d.status,
            published: false,
            workflowStatus: 'Draft',
            ...(d.sem1Snapshot !== null && { semester1Snapshot: d.sem1Snapshot }),
            ...(d.combinedAverage !== null && { combinedAverage: d.combinedAverage }),
          },
        })
      )
    );

    await logActivity(
      req.user._id,
      'Compile Report Cards',
      academicYearId,
      `Compiled report cards for ${year.year} — ${semester.name}`
    );
    res.status(200).json({
      message: `Successfully compiled ${semester.name} report cards for ${compiledData.length} students.`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get one report card ─────────────────────────────────────────────────────
/**
 * GET /api/report-cards/:studentId/:academicYearId
 * Optional query param: ?semesterId=  — defaults to globally active semester.
 */
const getReportCard = async (req, res) => {
  try {
    const { studentId, academicYearId } = req.params;
    let { semesterId } = req.query;

    // Fall back to the active semester when none supplied
    if (!semesterId) {
      semesterId = await resolveActiveSemesterId();
    }

    let reportCard;
    if (semesterId) {
      reportCard = await prisma.reportCard.findUnique({
        where: { studentId_academicYearId_semesterId: { studentId, academicYearId, semesterId } },
        include: {
          student: { include: { user: { select: { name: true, email: true } } } },
          academicYear: true,
          semester: true,
        },
      });
    } else {
      // Legacy fallback — find any report card for student+year
      reportCard = await prisma.reportCard.findFirst({
        where: { studentId, academicYearId },
        include: {
          student: { include: { user: { select: { name: true, email: true } } } },
          academicYear: true,
          semester: true,
        },
      });
    }

    if (!reportCard) return res.status(404).json({ message: 'Compiled report card not found for this student and academic year.' });

    // Students and Parents cannot view report cards — admin only
    if (['Student', 'Parent'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Report cards can only be viewed and printed by Admin. Please contact your school administration.' });
    }

    if (req.user.role === 'Teacher') {
      const teacherProfile = await getTeacherProfileByUserId(getActorId(req));
      if (!teacherProfile) return res.status(404).json({ message: 'Teacher profile not found.' });

      const teacherClassIds = new Set();
      const ownedClasses = await prisma.class.findMany({ where: { teacherId: teacherProfile.id }, select: { id: true } });
      ownedClasses.forEach((k) => teacherClassIds.add(k.id));
      const assignments = await prisma.teacherAssignment.findMany({ where: { teacherId: teacherProfile.id }, select: { classId: true } });
      assignments.forEach((a) => { if (a.classId) teacherClassIds.add(a.classId); });

      const studentClassLinks = await prisma.grade.findMany({ where: { studentId, academicYearId }, select: { classId: true } });
      const isAuthorized = studentClassLinks.some((link) => teacherClassIds.has(link.classId));
      if (!isAuthorized) return res.status(403).json({ message: 'You are not authorized to view this report card.' });
    }

    // Fetch grades scoped to the semester (or all if no semesterId)
    const gradesWhere = { studentId, academicYearId };
    if (semesterId) gradesWhere.semesterId = semesterId;

    const grades = await prisma.grade.findMany({
      where: gradesWhere,
      include: {
        class: { select: { id: true, name: true, subject: true, stream: true } },
        subjectRef: { select: { id: true, name: true } },
      },
      orderBy: [{ subject: 'asc' }, { createdAt: 'asc' }],
    });

    res.status(200).json({ reportCard, grades });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Publish all ─────────────────────────────────────────────────────────────
/**
 * POST /api/report-cards/publish
 * Body: { academicYearId, semesterId? }
 */
const publishReportCards = async (req, res) => {
  try {
    const { academicYearId, semesterId } = req.body;
    if (!academicYearId) return res.status(400).json({ message: 'academicYearId is required.' });

    const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
    if (!year) return res.status(404).json({ message: 'Academic year not found.' });

    const where = { academicYearId };
    if (semesterId) where.semesterId = semesterId;

    await prisma.reportCard.updateMany({
      where,
      data: { published: true, workflowStatus: 'Published' },
    });

    const semLabel = semesterId ? ` (semester ${semesterId})` : '';
    await logActivity(req.user._id, 'Publish Report Cards', academicYearId, `Published all report cards for ${year.year}${semLabel}`);
    res.status(200).json({ message: `Successfully published report cards for ${year.year}.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Unpublish all ────────────────────────────────────────────────────────────
/**
 * POST /api/report-cards/unpublish
 * Body: { academicYearId, semesterId? }
 */
const unpublishReportCards = async (req, res) => {
  try {
    const { academicYearId, semesterId } = req.body;
    if (!academicYearId) return res.status(400).json({ message: 'academicYearId is required.' });

    const where = { academicYearId };
    if (semesterId) where.semesterId = semesterId;

    await prisma.reportCard.updateMany({
      where,
      data: { published: false, workflowStatus: 'AdminReview' },
    });

    await logActivity(req.user._id, 'Unpublish Report Cards', academicYearId, `Unpublished all report cards for year ${academicYearId}`);
    res.status(200).json({ message: 'Report cards unpublished.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Toggle publish one ───────────────────────────────────────────────────────
const togglePublishOne = async (req, res) => {
  try {
    const { id } = req.params;
    const { published } = req.body;

    const rc = await prisma.reportCard.findUnique({ where: { id } });
    if (!rc) return res.status(404).json({ message: 'Report card not found.' });

    const updated = await prisma.reportCard.update({
      where: { id },
      data: {
        published: Boolean(published),
        workflowStatus: published ? 'Published' : 'AdminReview',
      },
    });

    await logActivity(req.user._id, published ? 'Publish Report Card' : 'Unpublish Report Card', id,
      `${published ? 'Published' : 'Unpublished'} report card ${id}`);
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Teacher comments ─────────────────────────────────────────────────────────
const updateReportComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    const existing = await prisma.reportCard.findUnique({
      where: { id },
      include: { student: { include: { classes: { select: { id: true } } } } },
    });
    if (!existing) return res.status(404).json({ message: 'Report card not found.' });

    if (req.user.role === 'Teacher') {
      const teacherProfile = await getTeacherProfileByUserId(getActorId(req));
      if (!teacherProfile) return res.status(404).json({ message: 'Teacher profile not found.' });

      const gradeLinks = await prisma.grade.findMany({
        where: { studentId: existing.studentId, academicYearId: existing.academicYearId },
        select: { classId: true },
      });
      const classIds = [...new Set([...(existing.student.classes || []).map((k) => k.id), ...gradeLinks.map((g) => g.classId)])];
      let authorized = false;
      for (const classId of classIds) {
        if (await canTeacherAccessClass(teacherProfile.id, classId)) { authorized = true; break; }
      }
      if (!authorized) return res.status(403).json({ message: 'You are not authorized to comment on this report card.' });
    }

    const reportCard = await prisma.reportCard.update({ where: { id }, data: { teacherComments: comments } });
    await logActivity(getActorId(req), 'Update Report Card Comments', id, `Updated comments on report card: ${id}`);
    res.status(200).json(reportCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Homeroom: save remarks/conduct/promotion for a single card ───────────────
const updateHomeroomReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { homeroomRemarks, conductGrade, promotionStatus } = req.body;

    const rc = await prisma.reportCard.findUnique({ where: { id } });
    if (!rc) return res.status(404).json({ message: 'Report card not found.' });

    const updateData = {};
    if (homeroomRemarks !== undefined) updateData.homeroomRemarks = homeroomRemarks;
    if (conductGrade !== undefined) updateData.conductGrade = conductGrade;
    if (promotionStatus !== undefined) {
      if (!['Promoted', 'Not Promoted', 'Conditional Promotion', 'Pending'].includes(promotionStatus)) {
        return res.status(400).json({ message: 'Invalid promotionStatus.' });
      }
      updateData.promotionStatus = promotionStatus;
      updateData.promotedById = getActorId(req);
      updateData.promotionDate = new Date();
    }

    const updated = await prisma.reportCard.update({ where: { id }, data: updateData });
    await logActivity(getActorId(req), 'Update Homeroom Review', id, `Updated homeroom review for report card ${id}`);
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Homeroom: bulk submit class report cards to Admin ───────────────────────
const submitToAdmin = async (req, res) => {
  try {
    const { reportCardIds } = req.body;
    if (!Array.isArray(reportCardIds) || reportCardIds.length === 0) {
      return res.status(400).json({ message: 'reportCardIds array is required.' });
    }

    await prisma.reportCard.updateMany({
      where: { id: { in: reportCardIds } },
      data: { workflowStatus: 'AdminReview' },
    });

    await logActivity(getActorId(req), 'Submit Report Cards to Admin', reportCardIds.join(','),
      `Submitted ${reportCardIds.length} report card(s) for admin review`);
    res.status(200).json({ message: `${reportCardIds.length} report card(s) submitted to Admin for review.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Promotion status ─────────────────────────────────────────────────────────
const setPromotionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { promotionStatus } = req.body;

    if (!['Promoted', 'Not Promoted', 'Conditional Promotion', 'Pending'].includes(promotionStatus)) {
      return res.status(400).json({ message: 'Invalid promotion status.' });
    }

    const reportCard = await prisma.reportCard.findUnique({
      where: { id },
      include: { student: { include: { classes: true } } },
    });
    if (!reportCard) return res.status(404).json({ message: 'Report card not found.' });

    let isAuthorized = ['SuperAdmin', 'Admin'].includes(req.user.role);
    if (!isAuthorized && req.user.role === 'Teacher') {
      const teacherProfile = await getTeacherProfileByUserId(getActorId(req));
      if (teacherProfile) {
        const studentClasses = reportCard.student.classes.map((c) => c.id);
        const homeroomClass = await prisma.class.findFirst({
          where: { id: { in: studentClasses }, teacherId: teacherProfile.id },
        });
        if (homeroomClass) isAuthorized = true;
      }
    }
    if (!isAuthorized) return res.status(403).json({ message: 'Only the assigned Homeroom Teacher or Administrator can set the promotion status.' });

    const updated = await prisma.reportCard.update({
      where: { id },
      data: { promotionStatus, promotedById: getActorId(req), promotionDate: new Date() },
    });

    await logActivity(getActorId(req), 'Set Promotion Status', id, `Set promotion status to ${promotionStatus}`);
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get report cards by class ────────────────────────────────────────────────
/**
 * GET /api/report-cards/class/:classId/:academicYearId
 * Optional query param: ?semesterId=
 */
const getReportCardsByClass = async (req, res) => {
  try {
    const { classId, academicYearId } = req.params;
    const { semesterId } = req.query;

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: { students: true },
    });
    if (!classData) return res.status(404).json({ message: 'Class not found' });

    if (req.user.role === 'Teacher') {
      const teacherProfile = await getTeacherProfileByUserId(getActorId(req));
      if (!teacherProfile) return res.status(404).json({ message: 'Teacher profile not found.' });
      const authorized = await canTeacherAccessClass(teacherProfile.id, classId);
      if (!authorized) return res.status(403).json({ message: 'You are not authorized to view report cards for this class.' });
    }

    const studentIds = classData.students.map((s) => s.id);
    const where = { academicYearId, studentId: { in: studentIds } };
    if (semesterId) where.semesterId = semesterId;

    const reportCards = await prisma.reportCard.findMany({
      where,
      include: {
        student: { include: { user: { select: { name: true, email: true } } } },
        semester: { select: { id: true, name: true, order: true } },
      },
      orderBy: [{ rank: 'asc' }, { averageScore: 'desc' }],
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
  unpublishReportCards,
  togglePublishOne,
  updateReportComments,
  updateHomeroomReview,
  submitToAdmin,
  setPromotionStatus,
  getReportCardsByClass,
};
