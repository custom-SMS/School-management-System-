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

    const specificClasses = Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`);

    res.json({ teachers: mappedTeachers, classes: mappedClasses, specificClasses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAssignment = async (req, res) => {
  try {
    const { teacherId, classId, classIds = [], specificClassNames = [], notes } = req.body;
    const normalizedClassIds = [...new Set([
      ...(Array.isArray(classIds) ? classIds : []),
      classId,
    ].filter(Boolean))];
    const normalizedSpecificClassNames = [...new Set((Array.isArray(specificClassNames) ? specificClassNames : []).filter(Boolean))];

    if (!teacherId) {
      return res.status(400).json({ message: 'teacherId is required' });
    }

    if (!normalizedClassIds.length && !normalizedSpecificClassNames.length) {
      return res.status(400).json({ message: 'At least one class is required' });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId }
    });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

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

    const resolvedClasses = [...classes, ...specificClassDocs];
    const assignments = [];
    for (const selectedClass of resolvedClasses) {
      const selectedClassId = selectedClass.id;
      let assignment = await prisma.teacherAssignment.findFirst({
        where: { teacherId, classId: selectedClassId }
      });

      if (assignment) {
        assignment = await prisma.teacherAssignment.update({
          where: { id: assignment.id },
          data: { notes }
        });
      } else {
        assignment = await prisma.teacherAssignment.create({
          data: {
            teacherId,
            classId: selectedClassId,
            notes,
            assignedById: req.user._id,
          }
        });
      }

      await prisma.class.update({
        where: { id: selectedClassId },
        data: { teacherId }
      });
      
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
    const assignments = await prisma.teacherAssignment.find({
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