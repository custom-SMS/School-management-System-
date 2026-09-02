const prisma = require('../prisma');

// ── helpers ───────────────────────────────────────────────────────────────────

const teacherSelect = {
  id: true,
  user: { select: { name: true, email: true } },
  subject: true,
  branchId: true,
};

const courseSelect = {
  id: true,
  title: true,
  description: true,
  subject: true,
  grade: true,
  dueDate: true,
  points: true,
  status: true,
  attachmentUrl: true,
  attachmentName: true,
  createdAt: true,
  updatedAt: true,
  classId: true,
  branchId: true,
  class: {
    select: {
      id: true,
      name: true,
      grade: true,
      stream: true,
    }
  },
  teacher: {
    select: {
      id: true,
      user: { select: { name: true } }
    }
  },
  _count: { select: { submissions: true } },
};

const materialSelect = {
  id: true,
  title: true,
  description: true,
  subject: true,
  grade: true,
  type: true,
  fileUrl: true,
  fileName: true,
  fileSize: true,
  downloadCount: true,
  createdAt: true,
  updatedAt: true,
  classId: true,
  branchId: true,
  class: {
    select: {
      id: true,
      name: true,
      grade: true,
      stream: true,
    }
  },
  teacher: {
    select: {
      id: true,
      user: { select: { name: true } }
    }
  },
};

// ── Teacher: resolve teacherId from logged-in user ────────────────────────────

async function getTeacherId(userId) {
  const teacher = await prisma.teacher.findFirst({
    where: { userId },
    select: { id: true, branchId: true, subject: true, user: { select: { name: true } } }
  });
  if (!teacher) throw Object.assign(new Error('Teacher profile not found'), { status: 403 });
  return teacher;
}

// ── Fetch teacher's assigned classes, grades, and subjects ────────────────────

async function getTeacherAssignedClassesAndGrades(teacherId) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      subject: true,
      branchId: true,
      user: { select: { name: true } },
    }
  });
  if (!teacher) return { classes: [], grades: [], subjects: [] };

  const [classesAsTeacher, teacherAssignments, classSubjects, homeroomSections] = await Promise.all([
    prisma.class.findMany({
      where: { teacherId },
      select: { id: true, name: true, grade: true, stream: true, subject: true, branchId: true }
    }),
    prisma.teacherAssignment.findMany({
      where: { teacherId },
      include: {
        class: { select: { id: true, name: true, grade: true, stream: true, subject: true, branchId: true } },
        subject: { select: { id: true, name: true } }
      }
    }),
    prisma.classSubject.findMany({
      where: { teacherId },
      include: {
        class: { select: { id: true, name: true, grade: true, stream: true, subject: true, branchId: true } },
        subject: { select: { id: true, name: true } }
      }
    }),
    prisma.section.findMany({
      where: { homeroomTeacherId: teacherId },
      include: {
        class: { select: { id: true, name: true, grade: true, stream: true, subject: true, branchId: true } }
      }
    })
  ]);

  const classMap = new Map();
  const gradesSet = new Set();
  const subjectsSet = new Set();

  if (teacher.subject) subjectsSet.add(teacher.subject.trim());

  const addClass = (cls, subjectName) => {
    if (!cls) return;
    const rawGrade = cls.grade || cls.name || 'General';
    const grade = rawGrade.trim();
    gradesSet.add(grade);
    if (subjectName && subjectName.trim()) subjectsSet.add(subjectName.trim());
    if (cls.subject && cls.subject.trim()) subjectsSet.add(cls.subject.trim());

    if (!classMap.has(cls.id)) {
      classMap.set(cls.id, {
        id: cls.id,
        name: cls.name,
        grade: grade,
        stream: cls.stream || null,
        branchId: cls.branchId,
        subjects: subjectName ? [subjectName.trim()] : (cls.subject ? [cls.subject.trim()] : []),
      });
    } else if (subjectName) {
      const existing = classMap.get(cls.id);
      if (!existing.subjects.includes(subjectName.trim())) {
        existing.subjects.push(subjectName.trim());
      }
    }
  };

  classesAsTeacher.forEach(c => addClass(c, c.subject));
  teacherAssignments.forEach(ta => addClass(ta.class, ta.subject?.name));
  classSubjects.forEach(cs => addClass(cs.class, cs.subject?.name));
  homeroomSections.forEach(s => addClass(s.class, null));

  let classesList = Array.from(classMap.values());
  let gradesList = Array.from(gradesSet);
  let subjectsList = Array.from(subjectsSet);

  // If no classes are specifically linked yet, pull available classes for their branch as fallback
  if (classesList.length === 0 && teacher.branchId) {
    const branchClasses = await prisma.class.findMany({
      where: { branchId: teacher.branchId },
      select: { id: true, name: true, grade: true, stream: true, subject: true, branchId: true },
      take: 20
    });
    branchClasses.forEach(c => addClass(c, c.subject));
    classesList = Array.from(classMap.values());
    gradesList = Array.from(gradesSet);
  }

  // Natural numeric sort for grades (e.g. Grade 1, Grade 2, ... Grade 12)
  gradesList.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB || a.localeCompare(b);
  });

  return {
    teacherName: teacher.user?.name || 'Teacher',
    branchId: teacher.branchId,
    classes: classesList,
    grades: gradesList.length > 0 ? gradesList : ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
    subjects: subjectsList.length > 0 ? subjectsList : (teacher.subject ? [teacher.subject] : ['General']),
  };
}

// ── Notification Dispatcher for Students and Parents ──────────────────────────

async function notifyStudentsAndParents({ classId, grade, branchId, teacherName, title, type, subject, dueDate, points }) {
  try {
    const whereStudent = {
      ...(branchId ? { branchId } : {}),
      ...(classId
        ? {
            OR: [
              { classes: { some: { id: classId } } },
              { enrollments: { some: { section: { classId } } } }
            ]
          }
        : { grade }
      ),
    };

    const students = await prisma.student.findMany({
      where: whereStudent,
      select: {
        id: true,
        userId: true,
        user: { select: { id: true, name: true } },
        guardians: {
          select: {
            id: true,
            fullName: true,
            userId: true,
            user: { select: { id: true } },
          }
        }
      }
    });

    if (!students || students.length === 0) return;

    const notifications = [];
    const formattedDue = dueDate
      ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

    for (const student of students) {
      // 1. Notify Student
      if (student.userId) {
        if (type === 'Assignment') {
          notifications.push({
            userId: student.userId,
            title: `New Assignment: ${title}`,
            message: `${teacherName} posted a new ${subject} assignment: "${title}". ${formattedDue ? `Due: ${formattedDue}.` : ''} (${points || 100} pts)`,
            type: 'Coursework',
          });
        } else {
          notifications.push({
            userId: student.userId,
            title: `New Study Material: ${title}`,
            message: `${teacherName} shared new study material for ${subject}: "${title}".`,
            type: 'Coursework',
          });
        }
      }

      // 2. Notify Parents / Guardians
      if (student.guardians && student.guardians.length > 0) {
        for (const guardian of student.guardians) {
          const parentUserId = guardian.userId || guardian.user?.id;
          if (parentUserId) {
            const studentName = student.user?.name || 'your child';
            if (type === 'Assignment') {
              notifications.push({
                userId: parentUserId,
                title: `New Homework: ${studentName}`,
                message: `${teacherName} assigned "${title}" in ${subject} for ${studentName}. ${formattedDue ? `Due date: ${formattedDue}.` : ''} (${points || 100} pts)`,
                type: 'Coursework',
              });
            } else {
              notifications.push({
                userId: parentUserId,
                title: `New Study Material: ${studentName}`,
                message: `${teacherName} shared "${title}" in ${subject} for ${studentName}.`,
                type: 'Coursework',
              });
            }
          }
        }
      }
    }

    if (notifications.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < notifications.length; i += chunkSize) {
        const chunk = notifications.slice(i, i + chunkSize);
        await prisma.notification.createMany({
          data: chunk,
          skipDuplicates: true
        });
      }
    }
  } catch (err) {
    console.error('[notifyStudentsAndParents error]', err?.message || err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER — ASSIGNED CLASSES & METADATA
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /api/coursework/teacher/classes — Get teacher's assigned classes & grade options */
exports.getTeacherClasses = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const teacher = await getTeacherId(userId);
    const assignedData = await getTeacherAssignedClassesAndGrades(teacher.id);
    res.json(assignedData);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER — ASSIGNMENTS (Coursework)
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /api/coursework/teacher/assignments */
exports.getMyAssignments = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const teacher = await getTeacherId(userId);
    const { status, grade, classId } = req.query;
    const where = {
      teacherId: teacher.id,
      ...(status && { status }),
      ...(grade && { grade }),
      ...(classId && { classId }),
    };
    const items = await prisma.coursework.findMany({
      where,
      select: courseSelect,
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

/** POST /api/coursework/assignments */
exports.createAssignment = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const teacher = await getTeacherId(userId);
    const { title, description, subject, grade, dueDate, points, classId, status, attachmentUrl, attachmentName } = req.body;

    if (!title || !subject || !grade) {
      return res.status(400).json({ message: 'Title, subject and grade are required.' });
    }

    const assigned = await getTeacherAssignedClassesAndGrades(teacher.id);
    const resolvedBranchId = teacher.branchId || null;
    const finalStatus = status || 'Draft';

    const item = await prisma.coursework.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        subject: subject.trim(),
        grade: grade.trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
        points: points ? Number(points) : 100,
        status: finalStatus,
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        teacherId: teacher.id,
        classId: classId || null,
        branchId: resolvedBranchId,
      },
      select: courseSelect,
    });

    // Notify students & parents if published immediately
    if (finalStatus === 'Published') {
      notifyStudentsAndParents({
        classId: classId || null,
        grade: grade.trim(),
        branchId: resolvedBranchId,
        teacherName: teacher.user?.name || 'Teacher',
        title: item.title,
        type: 'Assignment',
        subject: item.subject,
        dueDate: item.dueDate,
        points: item.points,
      }).catch(err => console.error('[Notification dispatch]', err));
    }

    res.status(201).json(item);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

/** PUT /api/coursework/assignments/:id */
exports.updateAssignment = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const teacher = await getTeacherId(userId);
    const existing = await prisma.coursework.findFirst({
      where: { id: req.params.id, teacherId: teacher.id }
    });
    if (!existing) return res.status(404).json({ message: 'Assignment not found or not authorized.' });

    const { title, description, subject, grade, dueDate, points, status, classId, attachmentUrl, attachmentName } = req.body;

    const updated = await prisma.coursework.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
        ...(subject !== undefined && { subject: subject.trim() }),
        ...(grade !== undefined && { grade: grade.trim() }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(points !== undefined && { points: Number(points) }),
        ...(status !== undefined && { status }),
        ...(classId !== undefined && { classId: classId || null }),
        ...(attachmentUrl !== undefined && { attachmentUrl }),
        ...(attachmentName !== undefined && { attachmentName }),
      },
      select: courseSelect,
    });

    // If transitioned to Published from Draft, dispatch notifications
    if (existing.status !== 'Published' && updated.status === 'Published') {
      notifyStudentsAndParents({
        classId: updated.classId,
        grade: updated.grade,
        branchId: updated.branchId,
        teacherName: teacher.user?.name || 'Teacher',
        title: updated.title,
        type: 'Assignment',
        subject: updated.subject,
        dueDate: updated.dueDate,
        points: updated.points,
      }).catch(err => console.error('[Notification dispatch]', err));
    }

    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

/** DELETE /api/coursework/assignments/:id */
exports.deleteAssignment = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const teacher = await getTeacherId(userId);
    const existing = await prisma.coursework.findFirst({ where: { id: req.params.id, teacherId: teacher.id } });
    if (!existing) return res.status(404).json({ message: 'Assignment not found or not authorized.' });
    await prisma.coursework.delete({ where: { id: req.params.id } });
    res.json({ message: 'Assignment deleted successfully.' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

/** GET /api/coursework/assignments/:id/submissions — teacher views student submissions */
exports.getSubmissions = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const teacher = await getTeacherId(userId);
    const work = await prisma.coursework.findFirst({
      where: { id: req.params.id, teacherId: teacher.id },
      select: { id: true }
    });
    if (!work) return res.status(404).json({ message: 'Assignment not found or not authorized.' });

    const subs = await prisma.courseSubmission.findMany({
      where: { courseworkId: req.params.id },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
          }
        }
      },
      orderBy: { submittedAt: 'asc' },
    });
    res.json(subs);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

/** POST /api/coursework/submissions/:id/grade */
exports.gradeSubmission = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const teacher = await getTeacherId(userId);
    const sub = await prisma.courseSubmission.findFirst({
      where: { id: req.params.id },
      include: {
        coursework: { select: { teacherId: true, title: true, points: true } },
        student: { select: { userId: true, user: { select: { name: true } }, guardians: { select: { userId: true } } } }
      },
    });
    if (!sub) return res.status(404).json({ message: 'Submission not found.' });
    if (sub.coursework.teacherId !== teacher.id) return res.status(403).json({ message: 'Forbidden.' });

    const { score, feedback } = req.body;
    const updated = await prisma.courseSubmission.update({
      where: { id: req.params.id },
      data: {
        score: score !== undefined ? Number(score) : sub.score,
        feedback: feedback ? feedback.trim() : null,
        status: 'Graded',
        gradedAt: new Date()
      },
    });

    // Notify student and parents of grade
    const studentUserId = sub.student?.userId;
    if (studentUserId) {
      const teacherName = teacher.user?.name || 'Teacher';
      const studentName = sub.student?.user?.name || 'your child';
      const scoreText = `${updated.score}/${sub.coursework.points}`;

      // Notify student
      prisma.notification.create({
        data: {
          userId: studentUserId,
          title: `Assignment Graded: ${sub.coursework.title}`,
          message: `Your submission for "${sub.coursework.title}" has been graded by ${teacherName}. Score: ${scoreText}.${feedback ? ` Feedback: "${feedback}"` : ''}`,
          type: 'Coursework',
        }
      }).catch(() => {});

      // Notify parents
      if (sub.student?.guardians?.length) {
        const parentNotifications = sub.student.guardians
          .filter(g => g.userId)
          .map(g => ({
            userId: g.userId,
            title: `Assignment Graded: ${studentName}`,
            message: `${studentName}'s assignment "${sub.coursework.title}" has been graded. Score: ${scoreText}.${feedback ? ` Feedback: "${feedback}"` : ''}`,
            type: 'Coursework',
          }));
        if (parentNotifications.length) {
          prisma.notification.createMany({ data: parentNotifications, skipDuplicates: true }).catch(() => {});
        }
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER — STUDY MATERIALS
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /api/coursework/teacher/materials */
exports.getMyMaterials = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const teacher = await getTeacherId(userId);
    const { grade, type, classId } = req.query;
    const where = {
      teacherId: teacher.id,
      ...(grade && { grade }),
      ...(type && { type }),
      ...(classId && { classId }),
    };
    const items = await prisma.studyMaterial.findMany({
      where,
      select: materialSelect,
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

/** POST /api/coursework/materials */
exports.createMaterial = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const teacher = await getTeacherId(userId);
    const { title, description, subject, grade, type, fileUrl, fileName, fileSize, classId } = req.body;

    if (!title || !subject || !grade || !fileUrl || !fileName) {
      return res.status(400).json({ message: 'Title, subject, grade, fileUrl and fileName are required.' });
    }

    const resolvedBranchId = teacher.branchId || null;

    const item = await prisma.studyMaterial.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        subject: subject.trim(),
        grade: grade.trim(),
        type: type || 'Other',
        fileUrl,
        fileName,
        fileSize: fileSize ? Number(fileSize) : null,
        teacherId: teacher.id,
        classId: classId || null,
        branchId: resolvedBranchId,
      },
      select: materialSelect,
    });

    // Notify students & parents of new study material
    notifyStudentsAndParents({
      classId: classId || null,
      grade: grade.trim(),
      branchId: resolvedBranchId,
      teacherName: teacher.user?.name || 'Teacher',
      title: item.title,
      type: 'StudyMaterial',
      subject: item.subject,
    }).catch(err => console.error('[Notification dispatch]', err));

    res.status(201).json(item);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

/** DELETE /api/coursework/materials/:id */
exports.deleteMaterial = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const teacher = await getTeacherId(userId);
    const existing = await prisma.studyMaterial.findFirst({
      where: { id: req.params.id, teacherId: teacher.id }
    });
    if (!existing) return res.status(404).json({ message: 'Material not found or not authorized.' });
    await prisma.studyMaterial.delete({ where: { id: req.params.id } });
    res.json({ message: 'Material deleted successfully.' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN OVERSIGHT
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /api/coursework/admin/overview */
exports.adminOverview = async (req, res) => {
  try {
    const { branchId } = req.query;
    const branchFilter = branchId ? { branchId } : {};

    const [totalMaterials, totalAssignments, totalSubmissions, activeAssignments, teachers] = await Promise.all([
      prisma.studyMaterial.count({ where: branchFilter }),
      prisma.coursework.count({ where: branchFilter }),
      prisma.courseSubmission.count(),
      prisma.coursework.count({ where: { ...branchFilter, status: 'Published' } }),
      prisma.teacher.count({ where: branchId ? { branchId } : {} }),
    ]);

    const activeTeacherIds = await prisma.coursework.findMany({
      where: { ...branchFilter, status: 'Published' },
      select: { teacherId: true },
      distinct: ['teacherId'],
    });
    const activeMaterialTeacherIds = await prisma.studyMaterial.findMany({
      where: branchFilter,
      select: { teacherId: true },
      distinct: ['teacherId'],
    });
    const activeSet = new Set([
      ...activeTeacherIds.map(t => t.teacherId),
      ...activeMaterialTeacherIds.map(t => t.teacherId),
    ]);

    res.json({
      totalMaterials,
      totalAssignments,
      activeAssignments,
      totalSubmissions,
      totalTeachers: teachers,
      activeTeachers: activeSet.size,
      teacherParticipationRate: teachers > 0 ? Math.round((activeSet.size / teachers) * 100) : 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/coursework/admin/all-assignments */
exports.adminAllAssignments = async (req, res) => {
  try {
    const { branchId, grade, status, teacherId, page = 1, limit = 50 } = req.query;
    const where = {
      ...(branchId && { branchId }),
      ...(grade && { grade }),
      ...(status && { status }),
      ...(teacherId && { teacherId }),
    };
    const [items, total] = await Promise.all([
      prisma.coursework.findMany({
        where,
        select: courseSelect,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.coursework.count({ where }),
    ]);
    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/coursework/admin/all-materials */
exports.adminAllMaterials = async (req, res) => {
  try {
    const { branchId, grade, type, teacherId, page = 1, limit = 50 } = req.query;
    const where = {
      ...(branchId && { branchId }),
      ...(grade && { grade }),
      ...(type && { type }),
      ...(teacherId && { teacherId }),
    };
    const [items, total] = await Promise.all([
      prisma.studyMaterial.findMany({
        where,
        select: materialSelect,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.studyMaterial.count({ where }),
    ]);
    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/coursework/admin/teacher-compliance */
exports.adminTeacherCompliance = async (req, res) => {
  try {
    const { branchId } = req.query;
    const teachers = await prisma.teacher.findMany({
      where: branchId ? { branchId } : {},
      select: {
        id: true,
        user: { select: { name: true, email: true } },
        subject: true,
        branchId: true,
        _count: { select: { courseworks: true, studyMaterials: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });
    const result = teachers.map(t => ({
      id: t.id,
      name: t.user.name,
      email: t.user.email,
      subject: t.subject,
      branchId: t.branchId,
      assignments: t._count.courseworks,
      materials: t._count.studyMaterials,
      isActive: t._count.courseworks > 0 || t._count.studyMaterials > 0,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT & PARENT COURSEWORK ACCESS
// ═══════════════════════════════════════════════════════════════════════════════

async function resolveTargetStudent(req) {
  const userId = req.user.id || req.user._id;

  if (req.user.role === 'Student') {
    const s = await prisma.student.findFirst({
      where: { userId },
      select: { id: true, grade: true, branchId: true }
    });
    if (!s) throw Object.assign(new Error('Student profile not found'), { status: 403 });
    return s;
  }

  if (req.user.role === 'Parent') {
    const parent = await prisma.parent.findFirst({
      where: { userId },
      include: {
        children: { select: { id: true, grade: true, branchId: true } }
      }
    });
    if (!parent || !parent.children?.length) {
      throw Object.assign(new Error('No children linked to parent account'), { status: 404 });
    }
    const targetStudentId = req.query.studentId;
    if (targetStudentId) {
      const child = parent.children.find(c => c.id === targetStudentId);
      if (child) return child;
    }
    return parent.children[0];
  }

  if (req.user.role === 'SuperAdmin' || req.user.role === 'Admin') {
    const targetStudentId = req.query.studentId;
    if (targetStudentId) {
      const s = await prisma.student.findUnique({
        where: { id: targetStudentId },
        select: { id: true, grade: true, branchId: true }
      });
      if (s) return s;
    }
    const firstStudent = await prisma.student.findFirst({
      select: { id: true, grade: true, branchId: true }
    });
    if (firstStudent) return firstStudent;
  }

  throw Object.assign(new Error('Unauthorized access'), { status: 403 });
}

/** GET /api/coursework/student/assignments */
exports.studentAssignments = async (req, res) => {
  try {
    const student = await resolveTargetStudent(req);
    const items = await prisma.coursework.findMany({
      where: {
        grade: student.grade,
        status: 'Published',
        ...(student.branchId && { branchId: student.branchId }),
      },
      select: {
        ...courseSelect,
        submissions: {
          where: { studentId: student.id },
          select: { id: true, status: true, score: true, feedback: true, submittedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

/** GET /api/coursework/student/materials */
exports.studentMaterials = async (req, res) => {
  try {
    const student = await resolveTargetStudent(req);
    const items = await prisma.studyMaterial.findMany({
      where: {
        grade: student.grade,
        ...(student.branchId && { branchId: student.branchId }),
      },
      select: materialSelect,
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

/** POST /api/coursework/assignments/:id/submit */
exports.submitAssignment = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const student = await prisma.student.findFirst({
      where: { userId },
      select: { id: true, grade: true, branchId: true }
    });
    if (!student) return res.status(403).json({ message: 'Only students can submit assignments.' });

    const work = await prisma.coursework.findFirst({
      where: { id: req.params.id, status: 'Published' },
      select: { id: true, dueDate: true },
    });
    if (!work) return res.status(404).json({ message: 'Assignment not found or not currently open.' });

    const { fileUrl, fileName, text } = req.body;
    if (!fileUrl && !text) {
      return res.status(400).json({ message: 'Provide a file upload or text answer.' });
    }

    const isLate = work.dueDate && new Date() > new Date(work.dueDate);
    const existing = await prisma.courseSubmission.findUnique({
      where: {
        courseworkId_studentId: {
          courseworkId: req.params.id,
          studentId: student.id
        }
      },
    });

    let submission;
    if (existing) {
      submission = await prisma.courseSubmission.update({
        where: { id: existing.id },
        data: {
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          text: text ? text.trim() : null,
          status: isLate ? 'Late' : 'Submitted',
        },
      });
    } else {
      submission = await prisma.courseSubmission.create({
        data: {
          courseworkId: req.params.id,
          studentId: student.id,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          text: text ? text.trim() : null,
          status: isLate ? 'Late' : 'Submitted',
        },
      });
    }
    res.status(201).json(submission);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

/** POST /api/coursework/materials/:id/download — increment download counter */
exports.trackDownload = async (req, res) => {
  try {
    const item = await prisma.studyMaterial.update({
      where: { id: req.params.id },
      data: { downloadCount: { increment: 1 } },
      select: { fileUrl: true, fileName: true, downloadCount: true },
    });
    res.json(item);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};
