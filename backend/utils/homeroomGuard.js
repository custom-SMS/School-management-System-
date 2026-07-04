const formatClassLabel = (className) => `Class ${String(className || '').trim()}`.trim();

const formatSectionLabel = (section) => {
  const className = String(section?.class?.name || section?.className || '').trim();
  const sectionName = String(section?.name || '').trim();
  const classLabel = formatClassLabel(className);

  if (!className && !sectionName) {
    return 'Unknown section';
  }

  if (!sectionName) {
    return classLabel;
  }

  return `${classLabel} - Section ${sectionName}`.trim();
};

const addRemovalHint = (message) => `${message} Remove the teacher from the matching entry first, then assign another teacher.`;

const buildConflictMessage = async (prisma, conflict) => {
  if (!conflict) {
    return 'This teacher is already assigned as a homeroom teacher.';
  }

  if (conflict.type === 'section') {
    const sectionLabel = conflict.label || 'Unknown section';
    return `This teacher is already assigned as a homeroom teacher for ${sectionLabel}. Go to Sections and remove this teacher from that section first, then assign another teacher.`;
  }

  const className = String(conflict.label || 'Unknown class').replace(/^Class\s+/i, '');
  const relatedSections = await prisma.section.findMany({
    where: { classId: conflict.classId },
    select: { id: true, name: true }
  });

  const sectionNames = relatedSections.map((section) => String(section.name || '').trim()).filter(Boolean);
  const sectionHint = sectionNames.length
    ? ` If you want to unassign a specific section inside ${className}, go to Sections and remove it from ${className} - Section ${sectionNames[0]}.`
    : '';

  return `This teacher is already assigned as a homeroom teacher for ${conflict.label}. Go to Classes and remove this teacher from that class first, then assign another teacher.${sectionHint}`;
};

const resolveClassHomeroomTeacherId = async (prisma, classId, { fallbackToClass = true } = {}) => {
  if (!classId) return null;

  const [sectionHomeroom, assignmentHomeroom, classRecord] = await Promise.all([
    prisma.section.findFirst({
      where: {
        classId,
        homeroomTeacherId: { not: null }
      },
      orderBy: { createdAt: 'asc' },
      select: { homeroomTeacherId: true }
    }),
    prisma.teacherAssignment.findFirst({
      where: { classId, assignmentType: 'HomeRoomTeacher' },
      orderBy: { createdAt: 'asc' },
      select: { teacherId: true }
    }),
    prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true }
    })
  ]);

  return sectionHomeroom?.homeroomTeacherId || assignmentHomeroom?.teacherId || (fallbackToClass ? classRecord?.teacherId : null) || null;
};

const buildConflictEntries = async (prisma, teacherId, excludeSectionId = null) => {
  const [teacherClasses, teacherSections, teacherAssignments] = await Promise.all([
    prisma.class.findMany({
      where: { teacherId },
      select: { id: true, name: true }
    }),
    prisma.section.findMany({
      where: {
        homeroomTeacherId: teacherId,
        ...(excludeSectionId ? { id: { not: excludeSectionId } } : {})
      },
      include: {
        class: { select: { name: true } }
      }
    }),
    prisma.teacherAssignment.findMany({
      where: { teacherId, assignmentType: 'HomeRoomTeacher' },
      select: { classId: true }
    })
  ]);

  const assignmentClassIds = [...new Set(teacherAssignments.map((item) => item.classId).filter(Boolean))];
  const assignmentClasses = assignmentClassIds.length
    ? await prisma.class.findMany({
        where: { id: { in: assignmentClassIds } },
        select: { id: true, name: true }
      })
    : [];

  const assignmentClassMap = new Map(assignmentClasses.map((item) => [item.id, item.name]));

  const entries = [
    ...teacherClasses.map((item) => ({
      type: 'class',
      classId: item.id,
      label: formatClassLabel(item.name)
    })),
    ...teacherSections.map((item) => ({
      type: 'section',
      classId: item.classId,
      label: formatSectionLabel(item)
    })),
    ...teacherAssignments
      .filter((item) => item.classId)
      .map((item) => ({
        type: 'class',
        classId: item.classId,
        label: formatClassLabel(assignmentClassMap.get(item.classId) || 'Unknown class')
      }))
  ];

  const seen = new Set();
  return entries.filter((entry) => {
    const key = `${entry.type}:${entry.classId}:${entry.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const ensureHomeroomAssignmentAllowed = async (prisma, { teacherId, classId = null, excludeSectionId = null }) => {
  if (!teacherId) {
    return { ok: false, message: 'teacherId is required.' };
  }

  const conflicts = await buildConflictEntries(prisma, teacherId, excludeSectionId);

  if (!classId) {
    if (conflicts.length > 0) {
      return {
        ok: false,
        message: await buildConflictMessage(prisma, conflicts[0])
      };
    }

    return { ok: true };
  }

  const conflictingEntries = conflicts.filter((entry) => entry.classId !== classId);
  if (conflictingEntries.length > 0) {
    return {
      ok: false,
      message: await buildConflictMessage(prisma, conflictingEntries[0])
    };
  }

  // Check if the teacher is already assigned to a section (other than excludeSectionId)
  const teacherSectionConflicts = conflicts.filter(c => c.type === 'section');
  if (teacherSectionConflicts.length > 0) {
    return {
      ok: false,
      message: `This teacher is already assigned as a homeroom teacher for ${teacherSectionConflicts[0].label}. A teacher can only be a homeroom teacher for one section.`
    };
  }

  return { ok: true };
};

module.exports = { ensureHomeroomAssignmentAllowed, resolveClassHomeroomTeacherId };