const prisma = require('../prisma');

const getAssignmentOptions = async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    const classes = await prisma.class.findMany({
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

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId }
    });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // If creating a HomeRoomTeacher assignment, remove any existing HomeRoomTeacher assignments for this teacher
    if (assignmentType === 'HomeRoomTeacher') {
      const existingHomeRoomAssignments = await prisma.teacherAssignment.findMany({
        where: { teacherId, assignmentType: 'HomeRoomTeacher' }
      });
      
      for (const existing of existingHomeRoomAssignments) {
        // Remove teacherId from the class if it was set
        if (existing.classId) {
          await prisma.class.update({
            where: { id: existing.classId },
            data: { teacherId: null }
          });
        }
        // Delete the existing assignment
        await prisma.teacherAssignment.delete({
          where: { id: existing.id }
        });
      }
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

      resolvedClasses = [{ id: resolvedSection.classId }];
    } else {
      const classes = normalizedClassIds.length ? await prisma.class.findMany({
        where: { id: { in: normalizedClassIds } }
      }) : [];
      if (classes.length !== normalizedClassIds.length) {
        return res.status(404).json({ message: 'One or more classes were not found' });
      }

      const specificClassDocs = [];
      for (const className of normalizedSpecificClassNames) {
        let existingClass = await prisma.class.findFirst({
          where: { name: className }
        });
        if (existingClass) {
          specificClassDocs.push(existingClass);
          continue;
        }

        const createdClass = await prisma.class.create({
          data: {
            name: className,
            subject: 'General',
          }
        });
        specificClassDocs.push(createdClass);
      }

      resolvedClasses = [...classes, ...specificClassDocs];
    }

    const assignments = [];
    for (const selectedClass of resolvedClasses) {
      const selectedClassId = selectedClass.id;
      let assignment = await prisma.teacherAssignment.findFirst({
        where: { teacherId, classId: selectedClassId, subjectId }
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

      // Only update class teacherId for HomeRoomTeacher assignments
      if (assignmentType === 'HomeRoomTeacher') {
        await prisma.class.update({
          where: { id: selectedClassId },
          data: { teacherId }
        });
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
      teacher: assignment.teacherId,
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

const getAllAssignments = async (req, res) => {
  try {
    const assignments = await prisma.teacherAssignment.findMany({
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

module.exports = { getAssignmentOptions, createAssignment, getMyAssignments, getAllAssignments };
