const prisma = require('../prisma');
const { ensureHomeroomAssignmentAllowed, resolveClassHomeroomTeacherId } = require('../utils/homeroomGuard');

const getAssignmentOptions = async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      where: { ...(req.branchFilter || {}) },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    const classes = await prisma.class.findMany({
      where: { ...(req.branchFilter || {}) },
      orderBy: { name: 'asc' },
      include: {
        teacher: { select: { teacherId: true } },
        students: { select: { studentId: true } }
      }
    });

    const mappedTeachers = teachers.map(t => ({
      ...t,
      _id: t.id,
      user: t.user ? { ...t.user, _id: t.user.id } : null
    }));

    const mappedClasses = classes.map(c => ({
      ...c,
      _id: c.id,
      teacher: c.teacher,
      students: c.students.map(s => ({ _id: s.id, studentId: s.studentId }))
    }));

    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' }
    });

    const sections = await prisma.section.findMany({
      where: { class: { ...(req.branchFilter || {}) } },
      orderBy: [
        { class: { name: 'asc' } },
        { name: 'asc' }
      ],
      include: {
        class: { select: { id: true, name: true } }
      }
    });

    const mappedSections = sections.map((s) => ({
      ...s,
      _id: s.id,
      className: s.class?.name || '',
      label: `${(s.class?.name || '').trim()} ${s.name || ''}`.trim()
    }));

    const specificClasses = Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`);

    res.json({ teachers: mappedTeachers, classes: mappedClasses, specificClasses, subjects, sections: mappedSections });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAssignment = async (req, res) => {
  try {
    const { teacherId, subjectId, sectionId, classId, classIds = [], specificClassNames = [], notes, assignmentType = 'SubjectTeacher' } = req.body;
    const normalizedClassIds = [...new Set([
      ...(Array.isArray(classIds) ? classIds : []),
      classId,
    ].filter(Boolean))];
    const normalizedSpecificClassNames = [...new Set((Array.isArray(specificClassNames) ? specificClassNames : []).filter(Boolean))];

    if (!teacherId) {
      return res.status(400).json({ message: 'teacherId is required' });
    }

    if (assignmentType === 'SubjectTeacher' && !subjectId) {
      return res.status(400).json({ message: 'subjectId is required for Subject Teacher assignments' });
    }

    if (!sectionId && !normalizedClassIds.length && !normalizedSpecificClassNames.length) {
      return res.status(400).json({ message: 'At least one class or section is required' });
    }

    if (!['SubjectTeacher', 'HomeRoomTeacher'].includes(assignmentType)) {
      return res.status(400).json({ message: 'Invalid assignment type. Must be SubjectTeacher or HomeRoomTeacher' });
    }

    // HomeRoomTeacher can only be assigned to one class at a time
    if (assignmentType === 'HomeRoomTeacher' && (normalizedClassIds.length + normalizedSpecificClassNames.length) > 1) {
      return res.status(400).json({ message: 'Home Room Teacher can only be assigned to one class at a time.' });
    }

    const branchId = req.branchFilter?.branchId || null;

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId }
    });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    if (branchId && teacher.branchId !== branchId) {
      return res.status(403).json({ message: 'Access denied. Teacher belongs to another branch.' });
    }

    let resolvedClasses = [];
    let resolvedSection = null;

    if (sectionId) {
      resolvedSection = await prisma.section.findUnique({
        where: { id: sectionId },
        include: { class: true }
      });

      if (!resolvedSection) {
        return res.status(404).json({ message: 'Section not found' });
      }
      if (branchId && resolvedSection.class?.branchId !== branchId) {
        return res.status(403).json({ message: 'Access denied. Section belongs to another branch.' });
      }

      resolvedClasses = [{ id: resolvedSection.classId }];
    } else {
      const classes = normalizedClassIds.length ? await prisma.class.findMany({
        where: { id: { in: normalizedClassIds } }
      }) : [];
      if (classes.length !== normalizedClassIds.length) {
        return res.status(404).json({ message: 'One or more classes were not found' });
      }
      if (branchId && classes.some(c => c.branchId !== branchId)) {
        return res.status(403).json({ message: 'Access denied. One or more classes belong to another branch.' });
      }

      const specificClassDocs = [];
      for (const className of normalizedSpecificClassNames) {
        let existingClass = await prisma.class.findFirst({
          where: { name: className, branchId }
        });
        if (existingClass) {
          specificClassDocs.push(existingClass);
          continue;
        }

        const createdClass = await prisma.class.create({
          data: {
            name: className,
            subject: 'General',
            branchId
          }
        });
        specificClassDocs.push(createdClass);
      }

      resolvedClasses = [...classes, ...specificClassDocs];
    }

    if (assignmentType === 'HomeRoomTeacher') {
      if (resolvedClasses.length !== 1) {
        return res.status(400).json({ message: 'Home Room Teacher can only be assigned to one class at a time.' });
      }

      const homeroomCheck = await ensureHomeroomAssignmentAllowed(prisma, {
        teacherId,
        classId: resolvedClasses[0].id
      });

      if (!homeroomCheck.ok) {
        return res.status(400).json({ message: homeroomCheck.message });
      }
    }

    const assignments = [];
    for (const selectedClass of resolvedClasses) {
      const selectedClassId = selectedClass.id;
      let assignment = await prisma.teacherAssignment.findFirst({
        where: { teacherId, classId: selectedClassId, subjectId, assignmentType }
      });

      if (assignment) {
        assignment = await prisma.teacherAssignment.update({
          where: { id: assignment.id },
          data: { notes, assignmentType, subjectId }
        });
      } else {
        assignment = await prisma.teacherAssignment.create({
          data: {
            teacherId,
            classId: selectedClassId,
            subjectId,
            notes,
            assignmentType,
            assignedById: req.user._id,
          }
        });
      }

      // Keep the class homeroom pointer in sync for HomeRoomTeacher assignments
      if (assignmentType === 'HomeRoomTeacher') {
        await prisma.class.update({
          where: { id: selectedClassId },
          data: { teacherId }
        });

        if (resolvedSection) {
          await prisma.section.update({
            where: { id: resolvedSection.id },
            data: { homeroomTeacherId: teacherId }
          });
        }
      }
      
      assignments.push({
        ...assignment,
        _id: assignment.id,
        teacher: assignment.teacherId,
        class: assignment.classId,
        assignedBy: assignment.assignedById
      });
    }

    res.status(201).json({ message: 'Teacher assignment saved successfully', assignments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyAssignments = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user._id }
    });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found' });
    }

    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: teacher.id },
      include: {
        class: {
          include: {
            students: {
              include: {
                user: { select: { id: true, name: true, email: true } },
                guardians: { select: { id: true, fullName: true, phone: true, email: true, relationship: true } }
              }
            }
          }
        }
      }
    });

    const responseAssignments = assignments.map(assignment => ({
      ...assignment,
      _id: assignment.id,
      teacher: assignment.teacherId,
      class: assignment.class ? {
        ...assignment.class,
        _id: assignment.class.id,
        students: (assignment.class.students || []).map(student => ({
          ...student,
          _id: student.id,
          user: student.user ? { ...student.user, _id: student.user.id } : null,
          guardians: student.guardians || []
        }))
      } : null
    }));

    res.json(responseAssignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllAssignments = async (req, res) => {
  try {
    const where = {};
    if (req.branchFilter && Object.keys(req.branchFilter).length > 0) {
      where.class = { ...(req.branchFilter || {}) };
    }

    const assignments = await prisma.teacherAssignment.findMany({
      where,
      include: {
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
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

    const responseAssignments = assignments.map(assignment => ({
      ...assignment,
      _id: assignment.id,
      teacher: assignment.teacher ? {
        ...assignment.teacher,
        _id: assignment.teacher.id,
        user: assignment.teacher.user ? { ...assignment.teacher.user, _id: assignment.teacher.user.id } : null
      } : null,
      class: assignment.class ? {
        ...assignment.class,
        _id: assignment.class.id,
        students: (assignment.class.students || []).map(student => ({
          ...student,
          _id: student.id,
          user: student.user ? { ...student.user, _id: student.user.id } : null
        }))
      } : null
    }));

    res.json(responseAssignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeHomeRoomAssignment = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!classId) {
      return res.status(400).json({ message: 'classId is required' });
    }

    const klass = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true, teacherId: true }
    });

    if (!klass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const previousTeacherId = klass.teacherId;

    const [deletedAssignments, clearedSections] = await prisma.$transaction(async (tx) => {
      const removedAssignments = await tx.teacherAssignment.deleteMany({
        where: { classId, assignmentType: 'HomeRoomTeacher' }
      });

      const cleared = previousTeacherId
        ? await tx.section.updateMany({
            where: {
              classId,
              homeroomTeacherId: previousTeacherId
            },
            data: { homeroomTeacherId: null }
          })
        : { count: 0 };

        return [removedAssignments, cleared];
    });

      const resolvedTeacherId = await resolveClassHomeroomTeacherId(prisma, classId, { fallbackToClass: false });
      const updatedClass = await prisma.class.update({
        where: { id: classId },
        data: { teacherId: resolvedTeacherId }
      });

    return res.status(200).json({
      message: `Homeroom teacher removed from ${klass.name}.`,
      class: {
        ...updatedClass,
        _id: updatedClass.id
      },
      removedAssignments: deletedAssignments.count,
      clearedSections: clearedSections.count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAssignmentOptions, createAssignment, getMyAssignments, getAllAssignments, removeHomeRoomAssignment };
