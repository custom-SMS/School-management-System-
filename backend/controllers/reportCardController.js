const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');
const { sendNotification } = require('./notificationController');
const { checkHistoricalAccess } = require('../utils/historicalCorrection');

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

/**
 * Helper function to determine assigned subjects and grade completeness for a list of enrollments.
 * Returns a map: studentId -> { totalAssignedCount, isComplete, totalSum, studentGrades }
 */
const resolveStudentGradeCompleteness = async (academicYearId, semesterId, studentIds, enrollments) => {
  const classIds = [...new Set(enrollments.map(e => e.section?.classId || e.classId).filter(Boolean))];
  const gradeLevels = [...new Set(enrollments.map(e => e.grade).filter(Boolean))];

  const classSubjects = classIds.length > 0 ? await prisma.classSubject.findMany({
    where: { classId: { in: classIds } },
    include: { subject: { select: { id: true, name: true } } }
  }) : [];

  const classSubjectMap = new Map();
  classSubjects.forEach(cs => {
    if (!cs.classId || !cs.subject) return;
    const list = classSubjectMap.get(cs.classId) || [];
    list.push(cs.subject.name);
    classSubjectMap.set(cs.classId, list);
  });

  const allSubjects = await prisma.subject.findMany({
    select: { id: true, name: true, gradesOffered: true }
  });

  const gradeSubjectMap = new Map();
  gradeLevels.forEach(gLevel => {
    const cleanG = String(gLevel).replace(/^Grade\s+/i, '').trim();
    const subjs = allSubjects.filter(s => {
      const offered = s.gradesOffered || [];
      return offered.includes(gLevel) || offered.includes(`Grade ${gLevel}`) || offered.includes(cleanG) || offered.includes(`Grade ${cleanG}`);
    }).map(s => s.name);
    gradeSubjectMap.set(gLevel, subjs);
  });

  // Include SubmittedToHomeroom grades so that submitted-but-not-yet-approved
  // grades are counted in averages and ranks. ApprovedByHomeroom is the gold
  // standard but we don't penalize complete submissions pending approval.
  const approvedGrades = await prisma.grade.findMany({
    where: {
      academicYearId,
      ...(semesterId ? { semesterId } : {}),
      studentId: { in: studentIds },
      submissionStatus: { in: ['ApprovedByHomeroom', 'Approved', 'SubmittedToHomeroom'] }
    },
    include: {
      subjectRef: { select: { id: true, name: true } }
    }
  });

  const studentGradesMap = new Map();
  approvedGrades.forEach(g => {
    const sMap = studentGradesMap.get(g.studentId) || new Map();
    const subjName = g.subjectRef?.name || g.subject;
    if (subjName) {
      sMap.set(subjName.toLowerCase(), Number(g.percentage != null ? g.percentage : 0));
    }
    studentGradesMap.set(g.studentId, sMap);
  });

  const resultMap = new Map();
  enrollments.forEach(enrollment => {
    const sid = enrollment.studentId;
    const classId = enrollment.section?.classId || enrollment.classId;
    const gradeLevel = enrollment.grade;

    let assignedList = [];
    if (classId && classSubjectMap.has(classId) && classSubjectMap.get(classId).length > 0) {
      assignedList = classSubjectMap.get(classId);
    } else if (gradeLevel && gradeSubjectMap.has(gradeLevel) && gradeSubjectMap.get(gradeLevel).length > 0) {
      assignedList = gradeSubjectMap.get(gradeLevel);
    }

    const sGrades = studentGradesMap.get(sid) || new Map();

    // Completeness rule:
    // A student is "complete" for a semester as soon as they have at least 1 grade
    // recorded for that semester. The average is calculated from all subjects that
    // were actually graded — catalog subjects with no grade entry are ignored.
    // Semesters are separated by the semesterId filter on the grade query above.
    let totalSum = 0;
    let scoredCount = 0;
    sGrades.forEach((score) => {
      totalSum += score;
      scoredCount++;
    });
    const isComplete = scoredCount > 0;
    const totalAssignedCount = scoredCount; // use actual graded count for average

    resultMap.set(sid, {
      totalAssignedCount,
      isComplete,
      totalSum,
      studentGrades: sGrades
    });
  });

  return resultMap;
};

const recompileReportCardsForStudents = async (academicYearId, semesterId, targetStudentIds = null) => {
  if (!semesterId) {
    semesterId = await resolveActiveSemesterId();
  }
  if (!academicYearId || !semesterId) return;

  const semester = await prisma.semester.findUnique({ where: { id: semesterId }, select: { id: true, order: true } });
  if (!semester) return;
  const isSemester2 = semester.order === 2;

  const enrollmentsWhere = { academicYearId };
  if (Array.isArray(targetStudentIds) && targetStudentIds.length > 0) {
    enrollmentsWhere.studentId = { in: targetStudentIds };
  }

  const gradingSetting = await prisma.systemSetting.findUnique({ where: { key: 'grading' }, select: { value: true } });
  const passMark = Number(parseSettingValue(gradingSetting?.value, {}).passMark || 50);

  // ── Fetch all data in parallel ──────────────────────────────────────────────
  const gradesWhere = {
    academicYearId,
    semesterId,
    submissionStatus: { in: ['ApprovedByHomeroom', 'Approved', 'SubmittedToHomeroom'] },
  };
  if (Array.isArray(targetStudentIds) && targetStudentIds.length > 0) {
    gradesWhere.studentId = { in: targetStudentIds };
  }

  const [enrollments, allGrades, attendanceRecords, sem1Reports] = await Promise.all([
    prisma.enrollment.findMany({
      where: enrollmentsWhere,
      select: { studentId: true, grade: true, sectionId: true, section: { select: { id: true, classId: true } } },
    }),
    // Fetch subject name per grade for per-student score aggregation
    prisma.grade.findMany({
      where: gradesWhere,
      select: { studentId: true, subject: true, percentage: true },
    }),
    // Attendance: grouped in JS, no joins needed
    prisma.attendanceRecord.findMany({
      where: {
        ...(Array.isArray(targetStudentIds) && targetStudentIds.length > 0
          ? { studentId: { in: targetStudentIds } }
          : {}),
        attendance: { academicYearId },
      },
      select: { studentId: true, status: true },
    }),
    // Sem1 snapshot — only needed for Sem2
    isSemester2
      ? prisma.semester.findFirst({ where: { academicYearId, order: 1 }, select: { id: true } }).then(sem1 =>
          sem1 ? prisma.reportCard.findMany({
            where: { academicYearId, semesterId: sem1.id, ...(Array.isArray(targetStudentIds) && targetStudentIds.length > 0 ? { studentId: { in: targetStudentIds } } : {}) },
            select: { studentId: true, averageScore: true },
          }) : []
        )
      : Promise.resolve([]),
  ]);

  if (!enrollments.length) return;

  // ── Derive the classIds involved, then fetch ClassSubject assignments ────────
  // ClassSubject is the authoritative source of which subjects are assigned to a class.
  // We only fetch for the specific classIds involved — not the entire catalog.
  const involvedClassIds = [...new Set(
    enrollments.map(e => e.section?.classId).filter(Boolean)
  )];

  const classSubjectRows = involvedClassIds.length > 0
    ? await prisma.classSubject.findMany({
        where: { classId: { in: involvedClassIds } },
        select: { classId: true, subject: { select: { name: true } } },
      })
    : [];

  // classId → Set<subjectName_lowercase> (from formal ClassSubject assignment)
  const classSubjectSets = new Map();
  classSubjectRows.forEach(cs => {
    if (!cs.classId || !cs.subject?.name) return;
    if (!classSubjectSets.has(cs.classId)) classSubjectSets.set(cs.classId, new Set());
    classSubjectSets.get(cs.classId).add(cs.subject.name.toLowerCase().trim());
  });

  // ── Per-student grade map ───────────────────────────────────────────────────
  // studentId → Map<subjectName_lc, percentage>
  const studentSubjectGrades = new Map();
  allGrades.forEach(g => {
    if (g.percentage == null || !g.subject) return;
    if (!studentSubjectGrades.has(g.studentId)) studentSubjectGrades.set(g.studentId, new Map());
    studentSubjectGrades.get(g.studentId).set(g.subject.toLowerCase().trim(), Number(g.percentage));
  });

  // Attendance per student
  const attByStudent = new Map();
  attendanceRecords.forEach(r => {
    const cur = attByStudent.get(r.studentId) || { total: 0, present: 0, absent: 0, late: 0 };
    cur.total += 1;
    if (r.status === 'Present') cur.present += 1;
    else if (r.status === 'Absent') cur.absent += 1;
    else if (r.status === 'Late') cur.late += 1;
    attByStudent.set(r.studentId, cur);
  });

  // Sem1 snapshot
  const sem1Map = new Map();
  sem1Reports.forEach(r => sem1Map.set(r.studentId, r.averageScore));

  // ── Compute per-student data ────────────────────────────────────────────────
  const compiledData = enrollments.map(enrollment => {
    const sid = enrollment.studentId;
    const att = attByStudent.get(sid) || { total: 0, present: 0, absent: 0, late: 0 };
    const attPct = att.total > 0 ? (att.present / att.total) * 100 : 100;
    const sectionId = enrollment.sectionId || enrollment.section?.id || null;
    const classId = enrollment.section?.classId || null;

    let avgScore = null;
    let status = 'Incomplete';
    let combinedAverage = null;

    // Assigned subjects = those formally configured in ClassSubject for this class
    const assignedSubjects = classId ? (classSubjectSets.get(classId) || new Set()) : new Set();
    const studentGrades = studentSubjectGrades.get(sid) || new Map();

    // Complete = student has a grade for every subject assigned to their class this semester
    const totalRequired = assignedSubjects.size;
    let scoredCount = 0;
    let totalSum = 0;

    if (totalRequired > 0) {
      assignedSubjects.forEach(subj => {
        if (studentGrades.has(subj)) {
          scoredCount++;
          totalSum += studentGrades.get(subj);
        }
      });

      if (scoredCount === totalRequired) {
        avgScore = Number((totalSum / totalRequired).toFixed(2));
        status = avgScore >= passMark ? 'Pass' : 'Fail';
        if (isSemester2) {
          const s1 = sem1Map.get(sid) ?? null;
          if (s1 !== null) combinedAverage = Number(((s1 + avgScore) / 2).toFixed(2));
        }
      }
    }

    return {
      studentId: sid,
      gradeLevel: normalizeLabel(enrollment.grade),
      averageScore: avgScore,
      attendancePercentage: Number(attPct.toFixed(2)),
      attendancePresent: att.present,
      attendanceAbsent: att.absent,
      attendanceLate: att.late,
      attendanceTotal: att.total,
      status,
      sectionId,
      classKey: classId || enrollment.grade || null,
      sem1Snapshot: isSemester2 ? (sem1Map.get(sid) ?? null) : null,
      combinedAverage,
    };
  });

  // ── Rank within section group (or class/grade fallback) ───────────────────
  const rankGroups = {};
  compiledData.forEach(s => {
    const key = s.sectionId ? `section:${s.sectionId}` : (s.classKey ? `class:${s.classKey}` : `grade:${s.gradeLevel}`);
    if (!rankGroups[key]) rankGroups[key] = [];
    rankGroups[key].push(s);
  });
  Object.values(rankGroups).forEach(group => {
    const done = group.filter(s => s.averageScore !== null).sort((a, b) => b.averageScore - a.averageScore);
    done.forEach((s, i) => { s.rank = i + 1; });
    group.filter(s => s.averageScore === null).forEach(s => { s.rank = null; });
  });

  // ── Write to DB: batch upsert via createMany (skip existing) + updateMany ──
  // Split into those that already have a record and those that don't.
  const existing = await prisma.reportCard.findMany({
    where: { academicYearId, semesterId, studentId: { in: compiledData.map(d => d.studentId) } },
    select: { studentId: true },
  });
  const existingIds = new Set(existing.map(r => r.studentId));

  const toCreate = compiledData.filter(d => !existingIds.has(d.studentId));
  const toUpdate = compiledData.filter(d => existingIds.has(d.studentId));

  await Promise.all([
    // Batch insert new records
    toCreate.length > 0
      ? prisma.reportCard.createMany({
          data: toCreate.map(d => ({
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
          })),
          skipDuplicates: true,
        })
      : Promise.resolve(),
    // Batch update existing records — one query per student but in parallel
    ...toUpdate.map(d =>
      prisma.reportCard.update({
        where: { studentId_academicYearId_semesterId: { studentId: d.studentId, academicYearId, semesterId } },
        data: {
          grade: d.gradeLevel,
          attendancePercentage: d.attendancePercentage,
          attendancePresent: d.attendancePresent,
          attendanceAbsent: d.attendanceAbsent,
          attendanceLate: d.attendanceLate,
          attendanceTotal: d.attendanceTotal,
          averageScore: d.averageScore,
          rank: d.rank,
          status: d.status,
          ...(d.sem1Snapshot !== null && { semester1Snapshot: d.sem1Snapshot }),
          ...(d.combinedAverage !== null && { combinedAverage: d.combinedAverage }),
        },
      })
    ),
  ]);
};

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

    await recompileReportCardsForStudents(academicYearId, semesterId);

    await logActivity(
      req.user._id,
      'Compile Report Cards',
      academicYearId,
      `Compiled report cards for ${year.year} — ${semester.name}`
    );
    res.status(200).json({
      message: `Successfully compiled ${semester.name} report cards.`,
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

    // Students and Parents cannot view report cards — admin only
    if (['Student', 'Parent'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Report cards can only be viewed and printed by Admin. Please contact your school administration.' });
    }

    // For Teacher role: verify authorization (parallel with main fetch below)
    let teacherAuthPromise = Promise.resolve(true);
    if (req.user.role === 'Teacher') {
      teacherAuthPromise = (async () => {
        const teacherProfile = await getTeacherProfileByUserId(getActorId(req));
        if (!teacherProfile) return false;
        const [ownedClasses, assignments, studentClassLinks] = await Promise.all([
          prisma.class.findMany({ where: { teacherId: teacherProfile.id }, select: { id: true } }),
          prisma.teacherAssignment.findMany({ where: { teacherId: teacherProfile.id }, select: { classId: true } }),
          prisma.grade.findMany({ where: { studentId, academicYearId }, select: { classId: true } }),
        ]);
        const teacherClassIds = new Set([
          ...ownedClasses.map(k => k.id),
          ...assignments.map(a => a.classId).filter(Boolean),
        ]);
        return studentClassLinks.some(link => teacherClassIds.has(link.classId));
      })();
    }

    // Fetch reportCard + grades in parallel
    const gradesWhere = { studentId, academicYearId };
    if (semesterId) gradesWhere.semesterId = semesterId;

    const rcWhere = semesterId
      ? { studentId_academicYearId_semesterId: { studentId, academicYearId, semesterId } }
      : null;

    const [reportCard, grades, isAuthorized] = await Promise.all([
      rcWhere
        ? prisma.reportCard.findUnique({
            where: rcWhere,
            select: {
              id: true, studentId: true, academicYearId: true, semesterId: true,
              grade: true, attendancePercentage: true, attendancePresent: true,
              attendanceAbsent: true, attendanceLate: true, attendanceTotal: true,
              averageScore: true, combinedAverage: true, rank: true, status: true,
              teacherComments: true, homeroomRemarks: true, workflowStatus: true,
              published: true, conductGrade: true, promotionStatus: true,
              student: { select: { id: true, user: { select: { name: true, email: true } } } },
              academicYear: { select: { id: true, year: true } },
              semester: { select: { id: true, name: true, order: true } },
            },
          })
        : prisma.reportCard.findFirst({
            where: { studentId, academicYearId },
            select: {
              id: true, studentId: true, academicYearId: true, semesterId: true,
              grade: true, attendancePercentage: true, attendancePresent: true,
              attendanceAbsent: true, attendanceLate: true, attendanceTotal: true,
              averageScore: true, combinedAverage: true, rank: true, status: true,
              teacherComments: true, homeroomRemarks: true, workflowStatus: true,
              published: true, conductGrade: true, promotionStatus: true,
              student: { select: { id: true, user: { select: { name: true, email: true } } } },
              academicYear: { select: { id: true, year: true } },
              semester: { select: { id: true, name: true, order: true } },
            },
          }),
      prisma.grade.findMany({
        where: gradesWhere,
        select: {
          id: true, subject: true, percentage: true, submissionStatus: true,
          semesterId: true, classId: true,
          class: { select: { id: true, name: true, subject: true, stream: true } },
          subjectRef: { select: { id: true, name: true } },
        },
        orderBy: [{ subject: 'asc' }, { createdAt: 'asc' }],
      }),
      teacherAuthPromise,
    ]);

    if (!reportCard) return res.status(404).json({ message: 'Compiled report card not found for this student and academic year.' });
    if (!isAuthorized) return res.status(403).json({ message: 'You are not authorized to view this report card.' });

    // Count peers in the same section (or grade) for section size denominator
    const studentEnrollment = await prisma.enrollment.findFirst({
      where: { studentId, academicYearId },
      select: { sectionId: true, grade: true }
    });
    const classSize = semesterId && reportCard.semesterId
      ? await prisma.reportCard.count({
          where: {
            academicYearId,
            semesterId: reportCard.semesterId,
            ...(studentEnrollment?.sectionId
              ? { student: { enrollments: { some: { academicYearId, sectionId: studentEnrollment.sectionId } } } }
              : { grade: reportCard.grade })
          }
        })
      : null;

    // If the compiled report card has no averageScore, compute a live estimate
    // from available grades so the KPI strip always shows real data.
    let enrichedReportCard = { ...reportCard, classSize };
    if (reportCard.averageScore == null && grades.length > 0) {
      const scoredGrades = grades.filter(g => g.percentage != null && Number(g.percentage) >= 0);
      if (scoredGrades.length > 0) {
        const liveAvg = scoredGrades.reduce((sum, g) => sum + Number(g.percentage), 0) / scoredGrades.length;
        enrichedReportCard = {
          ...enrichedReportCard,
          averageScore: Number(liveAvg.toFixed(2)),
          combinedAverage: Number(liveAvg.toFixed(2)),
          status: liveAvg >= 50 ? 'Pass' : 'Fail',
          _liveCalculated: true,
        };
      }
    }

    res.status(200).json({ reportCard: enrichedReportCard, grades });
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
      data: { published: false, workflowStatus: 'BranchAdminReview' },
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
        workflowStatus: published ? 'Published' : 'BranchAdminReview',
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

    // Enforce historical access check
    const histCheck = await checkHistoricalAccess(req, existing.academicYearId);
    if (!histCheck.ok) {
      return res.status(histCheck.status).json({ message: histCheck.message });
    }

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

    // Save snapshot if historical edit
    if (histCheck.reason) {
      await saveReportCardHistorySnapshot(id, getActorId(req), histCheck.reason);
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

    // Enforce historical access check
    const histCheck = await checkHistoricalAccess(req, rc.academicYearId);
    if (!histCheck.ok) {
      return res.status(histCheck.status).json({ message: histCheck.message });
    }

    const updateData = {};
    if (homeroomRemarks !== undefined) updateData.homeroomRemarks = homeroomRemarks;
    if (conductGrade !== undefined) updateData.conductGrade = conductGrade;
    if (promotionStatus !== undefined) {
      if (!['Promoted', 'Not Promoted', 'Conditional Promotion', 'Pending'].includes(promotionStatus)) {
        return res.status(400).json({ message: 'Invalid promotionStatus.' });
      }
      updateData.promotionStatus = promotionStatus;
    }

    // Save snapshot if historical edit
    if (histCheck.reason) {
      await saveReportCardHistorySnapshot(id, getActorId(req), histCheck.reason);
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

    // For Teacher role, verify the requesting teacher is the homeroom teacher
    // for the class(es) that own the submitted report cards
    if (req.user.role === 'Teacher') {
      const teacherProfile = await getTeacherProfileByUserId(getActorId(req));
      if (!teacherProfile) {
        return res.status(404).json({ message: 'Teacher profile not found.' });
      }

      // Fetch the report cards to determine which students/classes they belong to
      const cards = await prisma.reportCard.findMany({
        where: { id: { in: reportCardIds } },
        select: { studentId: true, academicYearId: true, semesterId: true },
      });

      if (cards.length === 0) {
        return res.status(404).json({ message: 'No matching report cards found.' });
      }

      // For each card, verify the teacher is the homeroom teacher for that student's class/section
      for (const card of cards) {
        const enrollment = await prisma.enrollment.findFirst({
          where: { studentId: card.studentId, academicYearId: card.academicYearId },
          include: { section: true },
        });

        const klass = enrollment?.section?.classId
          ? await prisma.class.findUnique({ where: { id: enrollment.section.classId } })
          : null;

        const isClassHomeroom = klass && klass.teacherId === teacherProfile.id;
        const isSectionHomeroom =
          enrollment?.section?.homeroomTeacherId === teacherProfile.id;

        if (!isClassHomeroom && !isSectionHomeroom) {
          return res.status(403).json({
            message: 'Access denied. You are not the homeroom teacher for all selected students.',
          });
        }
      }
    }

    const targetCards = await prisma.reportCard.findMany({
      where: { id: { in: reportCardIds } },
      select: { id: true, studentId: true, academicYearId: true, semesterId: true }
    });

    const studentIds = [...new Set(targetCards.map(c => c.studentId))];
    const academicYearId = targetCards[0]?.academicYearId;
    const semesterId = targetCards[0]?.semesterId;
    const actorId = getActorId(req);

    // Auto-approve any pending grades for these students when Homeroom Teacher submits report cards to Branch Admin
    if (studentIds.length > 0 && academicYearId) {
      const now = new Date();
      await prisma.grade.updateMany({
        where: {
          studentId: { in: studentIds },
          academicYearId,
          ...(semesterId ? { semesterId } : {}),
          submissionStatus: 'SubmittedToHomeroom',
        },
        data: {
          submissionStatus: 'ApprovedByHomeroom',
          approvedAt: now,
          ...(actorId ? { approvedById: actorId } : {}),
        },
      });
    }

    await prisma.reportCard.updateMany({
      where: { id: { in: reportCardIds } },
      data: { workflowStatus: 'BranchAdminReview' },
    });

    // Instantly recompile report cards for these students so averages/ranks are synced to DB
    if (studentIds.length > 0 && academicYearId) {
      await recompileReportCardsForStudents(academicYearId, semesterId, studentIds);
    }

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

    // Enforce historical access check
    const histCheck = await checkHistoricalAccess(req, reportCard.academicYearId);
    if (!histCheck.ok) {
      return res.status(histCheck.status).json({ message: histCheck.message });
    }

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

    // Save snapshot if historical edit
    if (histCheck.reason) {
      await saveReportCardHistorySnapshot(id, getActorId(req), histCheck.reason);
    }

    const updated = await prisma.reportCard.update({
      where: { id },
      data: { promotionStatus },
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

    // Check if classId is actually a sectionId
    const sectionData = await prisma.section.findUnique({
      where: { id: classId },
      include: { 
        enrollments: {
          include: {
            student: true
          }
        },
        class: { include: { students: true } }
      },
    });

    let studentIds = [];
    let actualClassId = classId;

    if (sectionData) {
      // It's a section - use section students through enrollments
      studentIds = sectionData.enrollments.map((e) => e.studentId);
      actualClassId = sectionData.classId;
    } else {
      // It's a class - use class students
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: { students: true },
      });
      if (!classData) return res.status(404).json({ message: 'Class not found' });
      studentIds = classData.students.map((s) => s.id);
    }

    if (req.user.role === 'Teacher') {
      const teacherProfile = await getTeacherProfileByUserId(getActorId(req));
      if (!teacherProfile) return res.status(404).json({ message: 'Teacher profile not found.' });
      const authorized = await canTeacherAccessClass(teacherProfile.id, actualClassId);
      if (!authorized) return res.status(403).json({ message: 'You are not authorized to view report cards for this class.' });
    }

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

const upsertHomeroomReview = async (req, res) => {
  try {
    const { studentId, academicYearId, semesterId, homeroomRemarks, conductGrade, promotionStatus } = req.body;

    if (!studentId || !academicYearId) {
      return res.status(400).json({ message: 'studentId and academicYearId are required.' });
    }

    // Enforce historical access check
    const histCheck = await checkHistoricalAccess(req, academicYearId);
    if (!histCheck.ok) {
      return res.status(histCheck.status).json({ message: histCheck.message });
    }

    if (promotionStatus && !['Promoted', 'Not Promoted', 'Conditional Promotion', 'Pending'].includes(promotionStatus)) {
      return res.status(400).json({ message: 'Invalid promotionStatus.' });
    }

    if (req.user.role === 'Teacher') {
      const teacherProfile = await getTeacherProfileByUserId(getActorId(req));
      if (!teacherProfile) return res.status(404).json({ message: 'Teacher profile not found.' });

      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId, academicYearId },
        include: { section: true },
      });

      if (!enrollment) {
        return res.status(404).json({ message: 'Student enrollment not found for this academic year.' });
      }

      // Resolve the classId — prefer section's classId, fall back to a grade record
      let studentClassId = enrollment.section?.classId || null;
      if (!studentClassId) {
        const gradeRecord = await prisma.grade.findFirst({
          where: { studentId, academicYearId },
          select: { classId: true },
        });
        studentClassId = gradeRecord?.classId || null;
      }

      if (!studentClassId) {
        return res.status(403).json({ message: 'Cannot verify homeroom access: student class not found.' });
      }

      // Check 1: class-level homeroom teacher (class.teacherId)
      const klass = await prisma.class.findUnique({ where: { id: studentClassId } });
      const isClassHomeroom = klass && klass.teacherId === teacherProfile.id;

      if (!isClassHomeroom) {
        // Check 2: section-level homeroom teacher for any section of this class
        const homeroomSection = await prisma.section.findFirst({
          where: { classId: studentClassId, homeroomTeacherId: teacherProfile.id },
        });

        // Check 3: explicit HomeRoomTeacher assignment record
        const homeroomAssignment = !homeroomSection
          ? await prisma.teacherAssignment.findFirst({
              where: { teacherId: teacherProfile.id, classId: studentClassId, assignmentType: 'HomeRoomTeacher' },
            })
          : null;

        if (!homeroomSection && !homeroomAssignment) {
          return res.status(403).json({ message: 'Access denied. You are not the homeroom teacher for this student.' });
        }
      }
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, academicYearId }
    });
    const gradeLevel = enrollment?.grade || 'Unassigned';

    // Only pass fields that exist in the original schema to upsert.
    // New fields (semester1Comment, semester2Comment, overallComment, promotedToClassId,
    // promotedToGrade) are stored exclusively via PUT /report-cards/full/:studentId/:academicYearId.
    const updateData = {
      grade: gradeLevel,
    };
    if (homeroomRemarks !== undefined) updateData.homeroomRemarks = homeroomRemarks;
    if (conductGrade !== undefined) updateData.conductGrade = conductGrade;
    if (promotionStatus !== undefined) {
      updateData.promotionStatus = promotionStatus;
    }

    // Save snapshot if historical edit on existing card
    const existingCard = await prisma.reportCard.findUnique({
      where: { studentId_academicYearId_semesterId: { studentId, academicYearId, semesterId: semesterId || null } }
    });
    if (existingCard && histCheck.reason) {
      await saveReportCardHistorySnapshot(existingCard.id, getActorId(req), histCheck.reason);
    }

    // Calculate real averageScore from approved grades for use on first create
    const completenessMap = await resolveStudentGradeCompleteness(
      academicYearId,
      semesterId,
      [studentId],
      [
        {
          studentId,
          academicYearId,
          grade: gradeLevel,
          section: { classId: req.body.classId || null }
        }
      ]
    );
    const info = completenessMap.get(studentId) || { isComplete: false, totalSum: 0, totalAssignedCount: 0 };

    const gradingSetting = await prisma.systemSetting.findUnique({ where: { key: 'grading' } });
    const gradingSettings = parseSettingValue(gradingSetting?.value, {});
    const passMark = Number(gradingSettings.passMark || 50);

    let computedAvgScore = null;
    let computedStatus = 'Incomplete';
    if (info.isComplete && info.totalAssignedCount > 0) {
      computedAvgScore = Number((info.totalSum / info.totalAssignedCount).toFixed(2));
      computedStatus = computedAvgScore >= passMark ? 'Pass' : 'Fail';
    }

    const rc = await prisma.reportCard.upsert({
      where: {
        studentId_academicYearId_semesterId: {
          studentId,
          academicYearId,
          semesterId: semesterId || null
        }
      },
      // Only save teacher-entered fields on update — averageScore/status are recalculated
      // by the compileClassReportCards call that follows immediately after this upsert.
      update: {
        ...updateData,
      },
      create: {
        studentId,
        academicYearId,
        semesterId: semesterId || null,
        averageScore: computedAvgScore,
        status: computedStatus,
        attendancePercentage: 100,
        ...updateData
      }
    });

    await logActivity(getActorId(req), 'Upsert Homeroom Review', rc.id, `Upserted homeroom review for student ${studentId}`);

    // Auto-trigger re-compile so averageScore, rank, and status are recalculated
    // from the newly approved grades immediately — no manual Admin compile step needed.
    try {
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId, academicYearId },
        include: { section: { select: { classId: true } } },
      });
      const classId = enrollment?.section?.classId || null;
      if (classId && semesterId) {
        await compileClassReportCards(academicYearId, semesterId, classId);
      } else if (classId) {
        // Fallback: find active semester
        const activeSem = await prisma.semester.findFirst({
          where: { academicYearId, isActive: true },
          select: { id: true },
        });
        if (activeSem) await compileClassReportCards(academicYearId, activeSem.id, classId);
      }
    } catch (compileErr) {
      // Non-fatal: compile failure should not block the homeroom review save
      console.warn('Auto-compile after homeroom review failed:', compileErr.message);
    }

    // Return the freshest report card data after compile
    const freshRc = await prisma.reportCard.findUnique({
      where: {
        studentId_academicYearId_semesterId: {
          studentId,
          academicYearId,
          semesterId: semesterId || null,
        },
      },
    });

    res.status(200).json(freshRc || rc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const saveReportCardHistorySnapshot = async (reportCardId, modifiedById, reason) => {
  if (!modifiedById || !reason) return;
  const existingCard = await prisma.reportCard.findUnique({
    where: { id: reportCardId }
  });
  if (!existingCard) return;

  const latestHistory = await prisma.reportCardHistory.findFirst({
    where: { reportCardId },
    orderBy: { version: 'desc' }
  });
  const nextVersion = latestHistory ? (latestHistory.version + 1) : 1;

  await prisma.reportCardHistory.create({
    data: {
      reportCardId: existingCard.id,
      version: nextVersion,
      averageScore: existingCard.averageScore,
      rank: existingCard.rank,
      status: existingCard.status,
      conductGrade: existingCard.conductGrade,
      homeroomRemarks: existingCard.homeroomRemarks,
      teacherComments: existingCard.teacherComments,
      modifiedById,
      reason,
    }
  });
};

const compileClassReportCards = async (academicYearId, semesterId, classId, modifiedById = null, reason = null) => {
  if (!academicYearId || !semesterId || !classId) {
    console.warn('Skipping compileClassReportCards: missing required arguments', { academicYearId, semesterId, classId });
    return;
  }
  const klass = await prisma.class.findUnique({ where: { id: classId } });
  if (!klass) return;

  const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
  if (!semester) return;
  const isSemester2 = semester.order === 2;

  // ── Ground truth: use Grade records to find class members ─────────────────
  const gradeStudentIds = (await prisma.grade.findMany({
    where: { academicYearId, semesterId, classId },
    select: { studentId: true },
    distinct: ['studentId'],
  })).map(g => g.studentId);

  const sectionEnrollments = await prisma.enrollment.findMany({
    where: { academicYearId, section: { classId }, status: 'Enrolled' },
    select: { studentId: true },
  });

  const allStudentIds = [...new Set([...gradeStudentIds, ...sectionEnrollments.map(e => e.studentId)])];
  if (!allStudentIds.length) return;

  const enrollments = await prisma.enrollment.findMany({
    where: { academicYearId, studentId: { in: allStudentIds } },
    select: { studentId: true, grade: true, sectionId: true, section: { select: { id: true, classId: true } } }
  });

  const studentIds = allStudentIds;

  const gradingSetting = await prisma.systemSetting.findUnique({ where: { key: 'grading' } });
  const gradingSettings = parseSettingValue(gradingSetting?.value, {});
  const passMark = Number(gradingSettings.passMark || 50);

  const [completenessMap, attendanceRecords] = await Promise.all([
    resolveStudentGradeCompleteness(academicYearId, semesterId, studentIds, enrollments),
    prisma.attendanceRecord.findMany({
      where: { studentId: { in: studentIds }, attendance: { academicYearId } },
      include: { attendance: { select: { classId: true } } }
    })
  ]);

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

  let sem1Cards = new Map();
  if (isSemester2) {
    const sem1 = await prisma.semester.findFirst({
      where: { academicYearId, order: 1 },
      select: { id: true }
    });
    if (sem1) {
      const sem1Reports = await prisma.reportCard.findMany({
        where: { academicYearId, semesterId: sem1.id, studentId: { in: studentIds } },
        select: { studentId: true, averageScore: true }
      });
      sem1Reports.forEach(r => sem1Cards.set(r.studentId, r.averageScore));
    }
  }

  const enrollmentByStudent = {};
  enrollments.forEach(e => { enrollmentByStudent[e.studentId] = e; });

  const compiledData = studentIds.map((sid) => {
    const enrollment = enrollmentByStudent[sid];
    const info = completenessMap.get(sid) || { isComplete: false, totalSum: 0, totalAssignedCount: 0 };
    const as = attSummary.get(sid) || { total: 0, present: 0, absent: 0, late: 0, classIds: new Set() };
    const attPct = as.total > 0 ? (as.present / as.total) * 100 : 100;
    const sectionId = enrollment?.sectionId || enrollment?.section?.id || null;

    let avgScore = null;
    let status = 'Incomplete';
    let combinedAverage = null;

    if (info.isComplete && info.totalAssignedCount > 0) {
      avgScore = Number((info.totalSum / info.totalAssignedCount).toFixed(2));
      status = avgScore >= passMark ? 'Pass' : 'Fail';

      const sem1Snapshot = isSemester2 ? (sem1Cards.get(sid) ?? null) : null;
      if (isSemester2 && sem1Snapshot !== null) {
        combinedAverage = Number(((sem1Snapshot + avgScore) / 2).toFixed(2));
      }
    }

    return {
      studentId: sid,
      gradeLevel: normalizeLabel(enrollment?.grade),
      averageScore: avgScore,
      attendancePercentage: Number(attPct.toFixed(2)),
      attendancePresent: as.present,
      attendanceAbsent: as.absent,
      attendanceLate: as.late,
      attendanceTotal: as.total,
      status,
      sectionId,
      classKey: classId || enrollment?.grade || null,
      sem1Snapshot: isSemester2 ? (sem1Cards.get(sid) ?? null) : null,
      combinedAverage
    };
  });

  const rankGroups = {};
  compiledData.forEach(s => {
    const key = s.sectionId ? `section:${s.sectionId}` : (s.classKey ? `class:${s.classKey}` : `grade:${s.gradeLevel}`);
    if (!rankGroups[key]) rankGroups[key] = [];
    rankGroups[key].push(s);
  });
  Object.values(rankGroups).forEach(group => {
    const done = group.filter(s => s.averageScore !== null).sort((a, b) => b.averageScore - a.averageScore);
    done.forEach((s, i) => { s.rank = i + 1; });
    group.filter(s => s.averageScore === null).forEach(s => { s.rank = null; });
  });

  for (const d of compiledData) {
    const existing = await prisma.reportCard.findUnique({
      where: { studentId_academicYearId_semesterId: { studentId: d.studentId, academicYearId, semesterId } }
    });

    if (existing && modifiedById && reason) {
      if (existing.averageScore !== d.averageScore || existing.rank !== d.rank || existing.status !== d.status) {
        await saveReportCardHistorySnapshot(existing.id, modifiedById, reason);
      }
    }

    await prisma.reportCard.upsert({
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
        // NOTE: teacher-entered fields (promotionStatus, conductGrade, homeroomRemarks,
        // promotedById, promotionDate) are intentionally NOT overwritten on re-compile.
        ...(d.sem1Snapshot !== null && { semester1Snapshot: d.sem1Snapshot }),
        ...(d.combinedAverage !== null && { combinedAverage: d.combinedAverage })
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
        ...(d.combinedAverage !== null && { combinedAverage: d.combinedAverage })
      }
    });
  }
};

/**
 * GET /api/report-cards/full/:studentId/:academicYearId
 * Full dynamic report card for a student in an academic year.
 */
const getDynamicReportCard = async (req, res) => {
  try {
    const { studentId, academicYearId } = req.params;

    if (!studentId || !academicYearId) {
      return res.status(400).json({ message: 'studentId and academicYearId are required.' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        classes: { select: { id: true, name: true, stream: true, grade: true } },
        enrollments: {
          where: { academicYearId },
          include: {
            section: {
              include: {
                class: { select: { id: true, name: true, stream: true, grade: true } }
              }
            }
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const enrollment = student.enrollments[0] || null;
    const gradeLevel = enrollment?.grade || student.grade || '—';
    const sectionName = enrollment?.section?.name || '—';
    let classId = enrollment?.section?.classId || (student.classes[0]?.id || null);

    // If classId is missing, attempt matching Class by grade & academicYearId
    if (!classId && gradeLevel && gradeLevel !== '—') {
      const matchedClass = await prisma.class.findFirst({
        where: {
          academicYearId,
          OR: [
            { grade: gradeLevel },
            { name: { contains: gradeLevel, mode: 'insensitive' } }
          ]
        }
      });
      if (matchedClass) classId = matchedClass.id;
    }

    // Resolve class subjects strictly assigned to this class via ClassSubject
    let subjects = [];
    if (classId) {
      const classSubjects = await prisma.classSubject.findMany({
        where: { classId },
        include: { subject: { select: { id: true, name: true, department: true } } },
        orderBy: { subject: { name: 'asc' } }
      });
      subjects = classSubjects.map(cs => cs.subject).filter(Boolean);
    }

    // Fallback: query Subject strictly offered for this grade level (if no ClassSubject junction records)
    if (!subjects.length && gradeLevel && gradeLevel !== '—') {
      const cleanGrade = gradeLevel.replace(/^Grade\s+/i, '').trim();
      subjects = await prisma.subject.findMany({
        where: {
          OR: [
            { gradesOffered: { has: gradeLevel } },
            { gradesOffered: { has: `Grade ${gradeLevel}` } },
            { gradesOffered: { has: `Grade ${cleanGrade}` } },
            { gradesOffered: { has: cleanGrade } }
          ]
        },
        orderBy: { name: 'asc' }
      });
    }

    // Fetch Semesters for the Academic Year
    const semesters = await prisma.semester.findMany({
      where: { academicYearId },
      orderBy: { order: 'asc' }
    });
    const sem1 = semesters.find(s => s.order === 1) || semesters[0] || null;
    const sem2 = semesters.find(s => s.order === 2) || semesters[1] || null;

    // Fetch all usable grades: approved OR submitted-to-homeroom (pending approval).
    // SubmittedToHomeroom grades have been verified by subject teachers and are
    // safe to display; they only become "official" after homeroom approval + compile.
    let approvedGrades = await prisma.grade.findMany({
      where: {
        studentId,
        academicYearId,
        submissionStatus: { in: ['ApprovedByHomeroom', 'Approved', 'SubmittedToHomeroom'] }
      },
      include: {
        subjectRef: { select: { id: true, name: true } },
        semester: { select: { id: true, order: true, name: true } }
      }
    });

    // If no approved grades exist yet, fall back to ALL grades so the report card is never blank.
    // This covers cases where homeroom approval hasn't happened yet but the admin still
    // wants to see compiled data.
    let usingFallbackGrades = false;
    if (approvedGrades.length === 0) {
      approvedGrades = await prisma.grade.findMany({
        where: { studentId, academicYearId },
        include: {
          subjectRef: { select: { id: true, name: true } },
          semester: { select: { id: true, order: true, name: true } }
        }
      });
      usingFallbackGrades = true;
    }

    // Always merge subjects from ALL grade entries (approved or fallback) into the subject list.
    // This ensures grade entries for subjects not in the catalog (e.g. 'physics' lowercase, 'General')
    // still appear on the report card with their actual scores.
    approvedGrades.forEach(g => {
      const gName = g.subjectRef?.name || g.subject;
      if (gName && !subjects.some(s => s.name?.toLowerCase() === gName.toLowerCase() || s.id === g.subjectId)) {
        subjects.push({ id: g.subjectId || gName, name: gName, department: '' });
      }
    });

    // Build subject rows with S1, S2, and Annual Average
    let sem1TotalSum = 0;
    let sem1Count = 0;
    let sem2TotalSum = 0;
    let sem2Count = 0;

    const subjectRows = subjects.map(subj => {
      // Find S1 grade: check exact semester match or fall back to any approved grade if only 1 semester exists
      const gSem1 = approvedGrades.find(g =>
        (g.subjectId === subj.id || g.subject?.toLowerCase() === subj.name?.toLowerCase()) &&
        (g.semesterId === sem1?.id || g.semester?.order === 1 || !g.semesterId)
      );

      const gSem2 = approvedGrades.find(g =>
        (g.subjectId === subj.id || g.subject?.toLowerCase() === subj.name?.toLowerCase()) &&
        g.id !== gSem1?.id &&
        (g.semesterId === sem2?.id || g.semester?.order === 2)
      );

      const sem1Score = gSem1 ? Number(gSem1.percentage || 0) : null;
      const sem2Score = gSem2 ? Number(gSem2.percentage || 0) : null;

      if (sem1Score !== null) {
        sem1TotalSum += sem1Score;
        sem1Count++;
      }
      if (sem2Score !== null) {
        sem2TotalSum += sem2Score;
        sem2Count++;
      }

      let annualAverage = null;
      if (sem1Score !== null && sem2Score !== null) {
        annualAverage = Number(((sem1Score + sem2Score) / 2).toFixed(2));
      }

      return {
        subjectId: subj.id,
        subjectName: subj.name,
        department: subj.department || '',
        sem1Score: sem1Score !== null ? Number(sem1Score.toFixed(2)) : null,
        sem2Score: sem2Score !== null ? Number(sem2Score.toFixed(2)) : null,
        annualAverage,
      };
    });

    const totalAssignedSubjects = subjects.length;
    const isSem1Complete = totalAssignedSubjects > 0 && sem1Count === totalAssignedSubjects;
    const isSem2Complete = totalAssignedSubjects > 0 && sem2Count === totalAssignedSubjects;

    const sem1OverallAvg = isSem1Complete ? Number((sem1TotalSum / totalAssignedSubjects).toFixed(2)) : null;
    const sem2OverallAvg = isSem2Complete ? Number((sem2TotalSum / totalAssignedSubjects).toFixed(2)) : null;
    const passMark = 50; // percentage threshold for Pass/Fail
    const sem1Status = isSem1Complete ? (sem1OverallAvg >= passMark ? 'Pass' : 'Fail') : 'Incomplete';
    const sem2Status = isSem2Complete ? (sem2OverallAvg >= passMark ? 'Pass' : 'Fail') : 'Incomplete';
    let annualOverallAvg = null;
    let annualStatus = 'Incomplete';
    if (isSem1Complete && isSem2Complete && sem1OverallAvg !== null && sem2OverallAvg !== null) {
      annualOverallAvg = Number(((sem1OverallAvg + sem2OverallAvg) / 2).toFixed(2));
      annualStatus = annualOverallAvg >= passMark ? 'Pass' : 'Fail';
    }

    // Fetch existing report card metadata with safe fallback
    let reportCard = null;
    try {
      reportCard = await prisma.reportCard.findFirst({
        where: { studentId, academicYearId },
        include: {
          academicYear: true,
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch {
      reportCard = await prisma.reportCard.findFirst({
        where: { studentId, academicYearId },
        select: {
          id: true,
          conductGrade: true,
          promotionStatus: true,
          workflowStatus: true,
          published: true,
          homeroomRemarks: true,
          teacherComments: true,
          academicYear: true,
          grade: true,
          rank: true
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    let promotedToClass = null;
    if (reportCard?.promotedToClassId) {
      try {
        promotedToClass = await prisma.class.findUnique({
          where: { id: reportCard.promotedToClassId },
          select: { id: true, name: true, grade: true }
        });
      } catch { /* silent fallback */ }
    }

    // Check publication authorization if Student/Parent
    const isStudentOrParent = ['Student', 'Parent'].includes(req.user.role);
    if (isStudentOrParent) {
      if (!reportCard || !reportCard.published) {
        return res.status(403).json({ message: 'Your report card is not published yet.' });
      }
    }

    // Attendance stats + section-size count — run in parallel
    const studentEnrollment = await prisma.enrollment.findFirst({
      where: { studentId, academicYearId },
      select: { sectionId: true, grade: true }
    });

    const [attendanceRecords, classSizeCount] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { studentId, attendance: { academicYearId } },
        select: { status: true },
      }),
      reportCard
        ? prisma.reportCard.count({
            where: {
              academicYearId,
              ...(studentEnrollment?.sectionId
                ? { student: { enrollments: { some: { academicYearId, sectionId: studentEnrollment.sectionId } } } }
                : { grade: reportCard.grade })
            },
          })
        : Promise.resolve(null),
    ]);

    let totalAtt = 0, presentAtt = 0, absentAtt = 0, lateAtt = 0;
    attendanceRecords.forEach(r => {
      totalAtt++;
      if (r.status === 'Present') presentAtt++;
      else if (r.status === 'Absent') absentAtt++;
      else if (r.status === 'Late') lateAtt++;
    });
    const attendancePercentage = totalAtt > 0 ? Number(((presentAtt / totalAtt) * 100).toFixed(2)) : 100;

    res.status(200).json({
      student: {
        id: student.id,
        name: student.user?.name || '—',
        studentId: student.studentId,
        grade: gradeLevel,
        section: sectionName,
        academicYear: reportCard?.academicYear?.year || ''
      },
      reportCard: {
        id: reportCard?.id || null,
        semester1Comment: reportCard?.semester1Comment || reportCard?.teacherComments || '',
        semester2Comment: reportCard?.semester2Comment || reportCard?.homeroomRemarks || '',
        overallComment: reportCard?.overallComment || '',
        conductGrade: reportCard?.conductGrade || '',
        promotionStatus: reportCard?.promotionStatus || 'Pending',
        promotedToClassId: reportCard?.promotedToClassId || null,
        promotedToClass,
        promotedToGrade: reportCard?.promotedToGrade || (promotedToClass?.name || ''),
        workflowStatus: reportCard?.workflowStatus || 'Draft',
        published: Boolean(reportCard?.published)
      },
      subjects: subjectRows,
      summary: {
        sem1OverallAvg,
        sem2OverallAvg,
        annualOverallAvg,
        sem1Status,
        sem2Status,
        annualStatus,
        status: annualStatus !== 'Incomplete' ? annualStatus : (sem1Status !== 'Incomplete' ? sem1Status : 'Incomplete'),
        rank: reportCard?.rank ?? null,
        classSize: classSizeCount,
      },
      attendance: {
        attendancePercentage,
        present: presentAtt,
        absent: absentAtt,
        late: lateAtt,
        total: totalAtt
      },
      gradesApproved: !usingFallbackGrades
    });
  } catch (error) {
    console.error('getDynamicReportCard error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/report-cards/full/:studentId/:academicYearId
 * Save Homeroom Teacher review & comments (read-only marks, editable comments & promotion).
 */
const updateDynamicReportCard = async (req, res) => {
  try {
    const { studentId, academicYearId } = req.params;
    const {
      semester1Comment,
      semester2Comment,
      overallComment,
      conductGrade,
      promotionStatus,
      promotedToClassId,
      promotedToGrade,
      workflowStatus,
      published
    } = req.body;

    if (!studentId || !academicYearId) {
      return res.status(400).json({ message: 'studentId and academicYearId are required.' });
    }

    if (promotionStatus && !['Promoted', 'Not Promoted', 'Conditional Promotion', 'Pending'].includes(promotionStatus)) {
      return res.status(400).json({ message: 'Invalid promotionStatus.' });
    }

    // Verify authorized role (Teacher / Admin / SuperAdmin)
    if (req.user.role === 'Teacher') {
      const teacherProfile = await getTeacherProfileByUserId(getActorId(req));
      if (!teacherProfile) return res.status(404).json({ message: 'Teacher profile not found.' });

      // Verify homeroom assignment for student
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId, academicYearId },
        include: { section: true }
      });
      const studentClassId = enrollment?.section?.classId || null;
      let authorized = false;
      if (studentClassId) {
        const klass = await prisma.class.findUnique({ where: { id: studentClassId } });
        if (klass && klass.teacherId === teacherProfile.id) authorized = true;
        if (!authorized && enrollment?.section?.homeroomTeacherId === teacherProfile.id) authorized = true;
        if (!authorized) {
          const asgn = await prisma.teacherAssignment.findFirst({
            where: { teacherId: teacherProfile.id, classId: studentClassId, assignmentType: 'HomeRoomTeacher' }
          });
          if (asgn) authorized = true;
        }
      }
      if (!authorized) {
        return res.status(403).json({ message: 'Access denied. Only the homeroom teacher can update report card comments.' });
      }
    }

    // Check if report card exists (select safe fields to avoid schema mismatch)
    const existing = await prisma.reportCard.findFirst({
      where: { studentId, academicYearId },
      select: { id: true }
    });

    const updateData = {};
    if (semester1Comment !== undefined) updateData.semester1Comment = semester1Comment;
    if (semester2Comment !== undefined) updateData.semester2Comment = semester2Comment;
    if (overallComment !== undefined) updateData.overallComment = overallComment;
    if (conductGrade !== undefined) updateData.conductGrade = conductGrade;
    if (promotionStatus !== undefined) updateData.promotionStatus = promotionStatus;
    if (promotedToClassId !== undefined) updateData.promotedToClassId = promotedToClassId || null;
    if (promotedToGrade !== undefined) updateData.promotedToGrade = promotedToGrade || null;
    if (workflowStatus !== undefined) updateData.workflowStatus = workflowStatus;
    if (published !== undefined) updateData.published = Boolean(published);

    // Separate "safe" fields that are guaranteed in the original schema
    const safeFields = ['conductGrade', 'promotionStatus', 'workflowStatus', 'published', 'homeroomRemarks'];
    // New fields only written when Prisma Client has been reloaded
    const newFields = ['semester1Comment', 'semester2Comment', 'overallComment', 'promotedToClassId', 'promotedToGrade'];

    let updatedCard;
    if (existing) {
      try {
        updatedCard = await prisma.reportCard.update({
          where: { id: existing.id },
          data: updateData
        });
      } catch (err) {
        // Prisma Client hasn't reloaded the new schema fields — save only safe existing fields
        const safeData = {};
        safeFields.forEach(f => { if (updateData[f] !== undefined) safeData[f] = updateData[f]; });
        updatedCard = await prisma.reportCard.update({
          where: { id: existing.id },
          data: safeData
        });
      }
    } else {
      const enrollment = await prisma.enrollment.findFirst({ where: { studentId, academicYearId } });
      const baseData = {
        studentId,
        academicYearId,
        grade: enrollment?.grade || 'Unassigned',
        averageScore: 0,
        attendancePercentage: 100,
        ...updateData
      };
      try {
        updatedCard = await prisma.reportCard.create({ data: baseData });
      } catch (err) {
        // Prisma Client hasn't reloaded the new schema fields — create with only safe fields
        const safeCreate = {
          studentId,
          academicYearId,
          grade: enrollment?.grade || 'Unassigned',
          averageScore: 0,
          attendancePercentage: 100,
        };
        safeFields.forEach(f => { if (updateData[f] !== undefined) safeCreate[f] = updateData[f]; });
        updatedCard = await prisma.reportCard.create({ data: safeCreate });
      }
    }

    await logActivity(getActorId(req), 'Update Dynamic Report Card', updatedCard.id, `Updated report card for student ${studentId}`);
    res.status(200).json({ message: 'Report card updated successfully.', reportCard: updatedCard });
  } catch (error) {
    console.error('updateDynamicReportCard error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  recompileReportCardsForStudents,
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
  upsertHomeroomReview,
  compileClassReportCards,
  getDynamicReportCard,
  updateDynamicReportCard,
};
