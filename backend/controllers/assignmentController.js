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
        class: { select: { id: true, name: true, stream: true } }
      }
    });

    const mappedSections = sections.map((s) => ({
      ...s,
      _id: s.id,
      className: s.class?.name || '',
      label: `${(s.class?.name || '').trim()}${s.class?.stream ? ` (${s.class.stream})` : ''} ${s.name || ''}`.trim()
    }));

    const specificClasses = Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`);

    const unassignedSections = await prisma.section.findMany({
      where: {
        homeroomTeacherId: null,
        class: { ...(req.branchFilter || {}) }
      },
      include: {
        class: { select: { id: true, name: true, stream: true } }
      }
    });

    const unassignedClassSubjects = await prisma.classSubject.findMany({
      where: {
        teacherId: null,
        class: { ...(req.branchFilter || {}) }
      },
      include: {
        class: { select: { id: true, name: true, stream: true } },
        subject: { select: { id: true, name: true, code: true } }
      }
    });

    res.json({
      teachers: mappedTeachers,
      classes: mappedClasses,
      specificClasses,
      subjects,
      sections: mappedSections,
      unassignedSections,
      unassignedClassSubjects
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAssignment = async (req, res) => {
  try {
    const { teacherId, subjectId, sectionId, classId, classIds = [], specificClassNames = [], notes, assignmentType = 'SubjectTeacher', confirmOverride = false } = req.body;
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

    // Get the active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true, branchId: teacher.branchId || undefined }
    }) || await prisma.academicYear.findFirst({
      where: { isActive: true }
    });

    if (!activeYear) {
      return res.status(400).json({ message: 'No active academic year found.' });
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

      // Always run the homeroom guard so the same conflict message is shown across all branches/flows.
      // If sectionId is provided, pass excludeSectionId to allow overrides of the same section.
      const classIdForCheck = resolvedSection?.classId || resolvedClasses[0].id;

      const homeroomCheck = await ensureHomeroomAssignmentAllowed(prisma, {
        teacherId,
        classId: classIdForCheck,
        excludeSectionId: resolvedSection ? resolvedSection.id : null
      });

      if (!homeroomCheck.ok) {
        return res.status(400).json({ message: homeroomCheck.message });
      }

      // Check if we'd be overriding an existing homeroom teacher on the target section/class
      if (!confirmOverride) {
        let previousTeacherName = null;
        let previousTeacherId = null;

        if (resolvedSection) {
          // Check if the section already has a different homeroom teacher
          const sectionWithTeacher = await prisma.section.findUnique({
            where: { id: resolvedSection.id },
            include: {
              homeroomTeacher: {
                include: { user: { select: { name: true } } }
              },
              class: { select: { name: true } }
            }
          });

          if (sectionWithTeacher?.homeroomTeacherId &&
              sectionWithTeacher.homeroomTeacherId !== teacherId) {
            previousTeacherName = sectionWithTeacher.homeroomTeacher?.user?.name ||
                                  sectionWithTeacher.homeroomTeacher?.teacherId || 'Unknown';
            previousTeacherId = sectionWithTeacher.homeroomTeacherId;
          }
        }

        // Also check the class-level homeroom teacher
        if (!previousTeacherId) {
          const classWithTeacher = await prisma.class.findUnique({
            where: { id: classIdForCheck },
            include: {
              teacher: {
                include: { user: { select: { name: true } } }
              }
            }
          });

          if (classWithTeacher?.teacherId &&
              classWithTeacher.teacherId !== teacherId) {
            previousTeacherName = classWithTeacher.teacher?.user?.name ||
                                  classWithTeacher.teacher?.teacherId || 'Unknown';
            previousTeacherId = classWithTeacher.teacherId;
          }
        }

        if (previousTeacherId) {
          // Look up the new teacher's name for the confirmation message
          const newTeacher = await prisma.teacher.findUnique({
            where: { id: teacherId },
            include: { user: { select: { name: true } } }
          });
          const newTeacherName = newTeacher?.user?.name || newTeacher?.teacherId || 'Unknown';

          return res.status(409).json({
            message: `This section already has a homeroom teacher (${previousTeacherName}). ` +
                     `Assigning ${newTeacherName} will replace them. Do you want to proceed?`,
            requiresConfirmation: true,
            previousTeacher: previousTeacherName,
            newTeacher: newTeacherName
          });
        }
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
            academicYearId: activeYear.id,
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

    // Get active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });

    const assignments = await prisma.teacherAssignment.findMany({
      where: { 
        teacherId: teacher.id,
        ...(activeYear ? { academicYearId: activeYear.id } : {})
      },
      include: {
        class: {
          include: {
            students: {
              include: {
                user: { select: { id: true, name: true, email: true } },
                guardians: { select: { id: true, fullName: true, phone: true, email: true, relationship: true } }
              }
            },
            sections: {
              where: activeYear ? { academicYearId: activeYear.id } : {},
              include: {
                enrollments: {
                  where: { status: { in: ['Enrolled', 'Promoted', 'Repeated'] } },
                  include: {
                    student: {
                      include: {
                        user: { select: { id: true, name: true, email: true } },
                        guardians: { select: { id: true, fullName: true, phone: true, email: true, relationship: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        subject: true
      }
    });

    const responseAssignments = assignments.map(assignment => {
      const cls = assignment.class;
      let students = [];

      if (cls) {
        // Prefer students from section enrollments; fall back to direct M2M
        const enrolledStudents = (cls.sections || [])
          .flatMap(section => (section.enrollments || []).map(e => e.student).filter(Boolean));

        const source = enrolledStudents.length > 0 ? enrolledStudents : (cls.students || []);

        // De-duplicate by id
        const seen = new Set();
        students = source
          .filter(s => s && !seen.has(s.id) && seen.add(s.id))
          .map(student => ({
            ...student,
            _id: student.id,
            user: student.user ? { ...student.user, _id: student.user.id } : null,
            guardians: student.guardians || []
          }));
      }

      return {
        ...assignment,
        _id: assignment.id,
        teacher: assignment.teacherId,
        class: cls ? {
          ...cls,
          _id: cls.id,
          subject: assignment.subject?.name || cls.subject || 'General',
          students
        } : null
      };
    });

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
        subject: { select: { id: true, name: true } },
        class: {
          include: {
            // Legacy direct M2M (kept for backward compat)
            students: {
              include: {
                user: { select: { id: true, name: true, email: true } }
              }
            },
            // Current model: students enrolled via sections
            sections: {
              include: {
                enrollments: {
                  where: { status: { in: ['Enrolled', 'Promoted', 'Repeated'] } },
                  include: {
                    student: {
                      include: {
                        user: { select: { id: true, name: true, email: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Also fetch the section directly linked to each assignment
    const assignmentSectionIds = [...new Set(assignments.map(a => a.sectionId).filter(Boolean))];
    const sectionMap = new Map();
    if (assignmentSectionIds.length > 0) {
      const sections = await prisma.section.findMany({
        where: { id: { in: assignmentSectionIds } },
        select: { id: true, name: true }
      });
      sections.forEach(s => sectionMap.set(s.id, s));
    }

    const responseAssignments = assignments.map(assignment => {
      const cls = assignment.class;
      let students = [];

      if (cls) {
        // Prefer students from section enrollments; fall back to direct M2M
        const enrolledStudents = (cls.sections || [])
          .flatMap(section => (section.enrollments || []).map(e => e.student).filter(Boolean));

        const source = enrolledStudents.length > 0 ? enrolledStudents : (cls.students || []);

        // De-duplicate by id
        const seen = new Set();
        students = source
          .filter(s => s && !seen.has(s.id) && seen.add(s.id))
          .map(student => ({
            ...student,
            _id: student.id,
            user: student.user ? { ...student.user, _id: student.user.id } : null
          }));
      }

      return {
        ...assignment,
        _id: assignment.id,
        teacher: assignment.teacher ? {
          ...assignment.teacher,
          _id: assignment.teacher.id,
          user: assignment.teacher.user ? { ...assignment.teacher.user, _id: assignment.teacher.user.id } : null
        } : null,
        subject: assignment.subject ? { ...assignment.subject, _id: assignment.subject.id } : null,
        section: assignment.sectionId ? (sectionMap.get(assignment.sectionId) || null) : null,
        class: cls ? {
          ...cls,
          _id: cls.id,
          students
        } : null
      };
    });

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

const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.teacherAssignment.findUnique({
      where: { id }
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.teacherAssignment.delete({
        where: { id }
      });

      if (assignment.classId && assignment.subjectId && assignment.teacherId) {
        await tx.classSubject.updateMany({
          where: {
            classId: assignment.classId,
            subjectId: assignment.subjectId,
            teacherId: assignment.teacherId
          },
          data: { teacherId: null }
        });
      }

      if (assignment.assignmentType === 'HomeRoomTeacher' && assignment.classId && assignment.teacherId) {
        await tx.section.updateMany({
          where: { classId: assignment.classId, homeroomTeacherId: assignment.teacherId },
          data: { homeroomTeacherId: null }
        });
        const { resolveClassHomeroomTeacherId } = require('../utils/homeroomGuard');
        const resolvedTeacherId = await resolveClassHomeroomTeacherId(tx, assignment.classId, { fallbackToClass: false });
        await tx.class.update({
          where: { id: assignment.classId },
          data: { teacherId: resolvedTeacherId }
        });
      }
    });

    return res.status(200).json({ message: 'Teacher assignment deleted successfully.' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getAssignmentOptions, createAssignment, getMyAssignments, getAllAssignments, removeHomeRoomAssignment, deleteAssignment };
