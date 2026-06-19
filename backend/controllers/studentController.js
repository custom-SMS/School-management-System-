const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Helper to generate IDs
const getNextAvailableStudentId = async () => {
  const latestStudent = await prisma.student.findFirst({
    where: {
      studentId: {
        startsWith: 'STU-'
      }
    },
    orderBy: {
      studentId: 'desc'
    }
  });

  const latestNumber = latestStudent
    ? Number(latestStudent.studentId.split('-')[1])
    : 0;

  const counter = await prisma.counter.upsert({
    where: { id: 'studentId' },
    update: { seq: { increment: 1 } },
    create: { id: 'studentId', seq: latestNumber + 1 }
  });

  return `STU-${String(counter.seq).padStart(4, '0')}`;
};

const generateParentId = async () => {
  const count = await prisma.parent.count();
  return `PAR-${(count + 1).toString().padStart(4, '0')}`;
};

const generatePassword = () => crypto.randomBytes(4).toString('hex');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const resolveClassNameFromGrade = (grade) => {
  const gradeText = String(grade || '').trim();
  const match = gradeText.match(/(\d+)/);

  if (match) {
    return `Class ${match[1]}`;
  }

  return gradeText ? `Class ${gradeText}` : 'Class 1';
};

const attachStudentToGradeClass = async (student, grade) => {
  const className = resolveClassNameFromGrade(grade);

  let klass = await prisma.class.findFirst({ where: { name: className } });
  if (!klass) {
    klass = await prisma.class.create({
      data: {
        name: className,
        subject: 'General',
        students: {
          connect: { id: student.id }
        }
      }
    });
  } else {
    await prisma.class.update({
      where: { id: klass.id },
      data: {
        students: {
          connect: { id: student.id }
        }
      }
    });
  }
};

const buildGuardianContacts = (reqBody) => {
  const contacts = Array.isArray(reqBody.guardians) ? reqBody.guardians : [];

  if (contacts.length > 0) {
    return contacts
      .map((contact, index) => ({
        fullName: contact.fullName || contact.name || '',
        email: normalizeEmail(contact.email),
        phone: contact.phone || '',
        relationship: contact.relationship || 'Guardian',
        address: contact.address || '',
        primary: Boolean(contact.primary || index === 0),
      }))
      .filter((contact) => contact.fullName || contact.email || contact.phone);
  }

  const fallbackContact = {
    fullName: reqBody.parent?.fullName || reqBody.parentName || reqBody.guardianName || '',
    email: normalizeEmail(reqBody.parent?.email || reqBody.parentEmail || ''),
    phone: reqBody.parent?.phone || reqBody.parentPhone || '',
    relationship: reqBody.parent?.relationship || reqBody.parentRelationship || 'Guardian',
    address: reqBody.parent?.address || reqBody.parentAddress || '',
    primary: true,
  };

  return fallbackContact.fullName || fallbackContact.email || fallbackContact.phone ? [fallbackContact] : [];
};

const upsertGuardianProfile = async ({ contact, student, studentName }) => {
  const email = normalizeEmail(contact.email);

  if (email) {
    const existingUser = await prisma.user.findFirst({
      where: { email }
    });
    if (existingUser && existingUser.role !== 'Parent') {
      throw new Error(`The email ${email} is already used by a ${existingUser.role.toLowerCase()}.`);
    }
  }

  let generatedPassword = null;
  let user = null;

  if (email) {
    user = await prisma.user.findFirst({
      where: { email }
    });
  }

  if (!user) {
    generatedPassword = generatePassword();
    user = await prisma.user.create({
      data: {
        name: contact.fullName || `${studentName}'s Guardian`,
        email: email || null,
        password: await bcrypt.hash(generatedPassword, 10),
        role: 'Parent',
      }
    });
  }

  let parentProfile = await prisma.parent.findFirst({
    where: { userId: user.id }
  });

  if (!parentProfile && email) {
    parentProfile = await prisma.parent.findFirst({
      where: { email }
    });
  }

  if (parentProfile) {
    parentProfile = await prisma.parent.update({
      where: { id: parentProfile.id },
      data: {
        fullName: contact.fullName || parentProfile.fullName,
        email: email || parentProfile.email,
        phone: contact.phone || parentProfile.phone,
        relationship: contact.relationship || parentProfile.relationship,
        address: contact.address || parentProfile.address,
        userId: parentProfile.userId || user.id,
        children: {
          connect: { id: student.id }
        }
      },
      include: { children: true }
    });
  } else {
    parentProfile = await prisma.parent.create({
      data: {
        userId: user.id,
        parentId: await generateParentId(),
        fullName: contact.fullName || `${studentName}'s Guardian`,
        email: email || null,
        phone: contact.phone || null,
        relationship: contact.relationship || 'Guardian',
        address: contact.address || null,
        children: {
          connect: { id: student.id }
        }
      },
      include: { children: true }
    });
  }

  const currentGuardianContacts = Array.isArray(student.guardianContacts) ? student.guardianContacts : [];
  const newContact = {
    parent: parentProfile.id,
    fullName: parentProfile.fullName,
    email: parentProfile.email || '',
    phone: parentProfile.phone || '',
    relationship: parentProfile.relationship || 'Guardian',
    address: parentProfile.address || '',
    primary: Boolean(contact.primary),
  };

  const contactExists = currentGuardianContacts.some(c => c.parent === parentProfile.id);
  const updatedGuardianContacts = contactExists ? currentGuardianContacts : [...currentGuardianContacts, newContact];

  await prisma.student.update({
    where: { id: student.id },
    data: {
      guardians: {
        connect: { id: parentProfile.id }
      },
      guardianContacts: updatedGuardianContacts
    }
  });

  return {
    parentId: parentProfile.parentId,
    fullName: parentProfile.fullName,
    email: parentProfile.email || null,
    password: generatedPassword,
    primary: Boolean(contact.primary),
  };
};

// @desc    Register a new student (Self-Register or Admin)
// @route   POST /api/students
// @access  Public (so students can self-register)
const registerStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      grade,
      personalDetails = {},
      familyBackground = {},
      dateOfBirth,
      gender,
      phone,
      address,
      previousSchool,
      emergencyContacts,
      fatherName,
      motherName,
      guardianName,
      occupation,
      notes,
    } = req.body;

    // Enforce active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });
    if (!activeYear) {
      return res.status(400).json({ message: 'No active academic year found. Registration is closed.' });
    }
    if (!activeYear.registrationOpen) {
      return res.status(400).json({ message: `Registration period for academic year ${activeYear.year} is closed.` });
    }

    const normalizedStudentEmail = normalizeEmail(email);

    if (normalizedStudentEmail) {
      const existingUser = await prisma.user.findFirst({
        where: { email: normalizedStudentEmail }
      });
      if (existingUser) return res.status(400).json({ message: 'Email already exists' });
    }

    const studentPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(studentPassword, 10);

    const gradeSettings = await prisma.gradeFee.findFirst({
      where: { grade }
    });
    if (!gradeSettings) {
        return res.status(400).json({ message: `Grade fee settings have not been configured for Grade: ${grade}` });
    }

    // Generate System ID
    const studentId = await getNextAvailableStudentId();

    // Create User account
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedStudentEmail || null,
        password: hashedPassword,
        role: 'Student'
      }
    });

    const resolvedPersonalDetails = {
      dateOfBirth: personalDetails.dateOfBirth || dateOfBirth || undefined,
      gender: personalDetails.gender || gender || undefined,
      phone: personalDetails.phone || phone || undefined,
      address: personalDetails.address || address || undefined,
      previousSchool: personalDetails.previousSchool || previousSchool || undefined,
      emergencyContacts: personalDetails.emergencyContacts || emergencyContacts || undefined,
    };

    const resolvedFamilyBackground = {
      fatherName: familyBackground.fatherName || fatherName || undefined,
      motherName: familyBackground.motherName || motherName || undefined,
      guardianName: familyBackground.guardianName || guardianName || undefined,
      occupation: familyBackground.occupation || occupation || undefined,
      notes: familyBackground.notes || notes || undefined,
    };

    const guardianContacts = buildGuardianContacts(req.body);

    if (!guardianContacts.length) {
      await prisma.user.delete({ where: { id: user.id } });
      return res.status(400).json({
        message: 'At least one guardian contact is required to register a student.',
      });
    }

    let student;

    try {
      student = await prisma.student.create({
        data: {
          userId: user.id,
          studentId: studentId,
          grade,
          personalDetails: resolvedPersonalDetails,
          familyBackground: resolvedFamilyBackground,
          guardianContacts: []
        }
      });
    } catch (createError) {
      if (createError.code === 'P2002' && createError.meta?.target?.includes('studentId')) {
        const fallbackStudentId = await getNextAvailableStudentId();
        student = await prisma.student.create({
          data: {
            userId: user.id,
            studentId: fallbackStudentId,
            grade,
            personalDetails: resolvedPersonalDetails,
            familyBackground: resolvedFamilyBackground,
            guardianContacts: []
          }
        });
      } else {
        await prisma.user.delete({ where: { id: user.id } });
        throw createError;
      }
    }

    // Create Year-specific Enrollment record separate from permanent profile
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        academicYearId: activeYear.id,
        grade,
        status: 'Enrolled'
      }
    });

    await attachStudentToGradeClass(student, grade);

    const guardianCredentials = [];
    for (const contact of guardianContacts) {
      const credentials = await upsertGuardianProfile({
        contact,
        student,
        studentName: name,
      });
      guardianCredentials.push(credentials);
    }

    const finalStudent = await prisma.student.findUnique({
      where: { id: student.id }
    });

    const responseStudent = {
      ...finalStudent,
      _id: finalStudent.id
    };

    res.status(201).json({ 
      message: 'Student registered successfully', 
      student: responseStudent,
      feeInfo: `Your monthly tuition is ETB ${gradeSettings.amount}`,
      credentials: {
        studentId: finalStudent.studentId,
        password: studentPassword,
      },
      guardianCredentials,
      parentCredentials: guardianCredentials[0] || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get students (teachers see only assigned students, admins see all)
// @route   GET /api/students
// @access  Private (Admin/Teacher/SuperAdmin)
const getStudents = async (req, res) => {
  try {
    if (req.user?.role === 'Teacher') {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user._id }
      });
      if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });

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

      const allowedStudentIds = new Set();
      const allowedClassNumbers = new Set();

      assignments.forEach((assignment) => {
        const className = String(assignment.class?.name || '');
        const classNumber = className.match(/(\d+)/)?.[1];
        if (classNumber) {
          allowedClassNumbers.add(classNumber);
        }

        (assignment.class?.students || []).forEach((student) => {
          if (student?.id) allowedStudentIds.add(student.id);
        });
      });

      const allStudents = await prisma.student.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      });

      const students = allStudents.filter((student) => {
        if (allowedStudentIds.has(student.id)) return true;

        const gradeNumber = String(student.grade || '').match(/(\d+)/)?.[1];
        return gradeNumber ? allowedClassNumbers.has(gradeNumber) : false;
      });

      const responseStudents = students.map(student => ({
        ...student,
        _id: student.id,
        user: student.user ? { ...student.user, _id: student.user.id } : null
      }));

      return res.status(200).json(responseStudents);
    }

    const students = await prisma.student.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        guardians: true,
        enrollments: {
          include: {
            academicYear: true
          }
        }
      }
    });

    const responseStudents = students.map(student => ({
      ...student,
      _id: student.id,
      user: student.user ? { ...student.user, _id: student.user.id } : null,
      guardians: (student.guardians || []).map(g => ({
        ...g,
        _id: g.id
      }))
    }));

    res.status(200).json(responseStudents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// @desc    Get all students from the database without teacher-based filtering
// @route   GET /api/students/all
// @access  Private (Admin/SuperAdmin)
const getAllStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        guardians: true,
        enrollments: {
          include: {
            academicYear: true
          }
        }
      }
    });

    const responseStudents = students.map(student => ({
      ...student,
      _id: student.id,
      user: student.user ? { ...student.user, _id: student.user.id } : null,
      guardians: (student.guardians || []).map(g => ({
        ...g,
        _id: g.id
      }))
    }));

    res.status(200).json(responseStudents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set fee amount for a specific grade
// @route   POST /api/students/grade-fee
// @access  Private (Admin or role with student_registration permission)
const setGradeFee = async (req, res) => {
  try {
    const { grade, amount } = req.body;
    const gradeFee = await prisma.gradeFee.upsert({
      where: { grade },
      update: { amount: Number(amount) },
      create: { grade, amount: Number(amount) }
    });

    res.status(200).json({
      message: 'Grade fee configured successfully',
      gradeFee: {
        ...gradeFee,
        _id: gradeFee.id
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all grade fee settings
// @route   GET /api/students/grade-fee
// @access  Public
const getGradeFees = async (req, res) => {
  try {
    const fees = await prisma.gradeFee.findMany();
    res.status(200).json(fees.map(f => ({ ...f, _id: f.id })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a student and their dependent records
// @route   DELETE /api/students/:id
// @access  Private (Admin)
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
        guardians: {
          include: {
            children: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const studentId = student.id;
    const parentIds = new Set();

    (student.guardians || []).forEach((parent) => {
      if (parent?.id) parentIds.add(parent.id);
    });

    const guardianContacts = Array.isArray(student.guardianContacts) ? student.guardianContacts : [];
    guardianContacts.forEach((contact) => {
      if (contact?.parent) parentIds.add(contact.parent);
    });

    await prisma.$transaction(async (tx) => {
      // Delete Enrollments
      await tx.enrollment.deleteMany({ where: { studentId } });

      // Delete Grades
      await tx.grade.deleteMany({ where: { studentId } });

      // Delete Fees
      await tx.fee.deleteMany({ where: { studentId } });

      // Delete Attendance Records
      await tx.attendanceRecord.deleteMany({ where: { studentId } });

      // Remove empty Attendance sessions (where no records remain)
      const emptyAttendances = await tx.attendance.findMany({
        where: {
          records: {
            none: {}
          }
        },
        select: { id: true }
      });
      if (emptyAttendances.length) {
        await tx.attendance.deleteMany({
          where: {
            id: { in: emptyAttendances.map(a => a.id) }
          }
        });
      }

      // Disconnect Student from Classes
      const studentClasses = await tx.class.findMany({
        where: {
          students: {
            some: { id: studentId }
          }
        },
        select: { id: true }
      });
      for (const klass of studentClasses) {
        await tx.class.update({
          where: { id: klass.id },
          data: {
            students: {
              disconnect: { id: studentId }
            }
          }
        });
      }

      // Disconnect Student from TeacherAssignments
      const studentAssignments = await tx.teacherAssignment.findMany({
        where: {
          students: {
            some: { id: studentId }
          }
        },
        select: { id: true }
      });
      for (const assignment of studentAssignments) {
        await tx.teacherAssignment.update({
          where: { id: assignment.id },
          data: {
            students: {
              disconnect: { id: studentId }
            }
          }
        });
      }

      // Clean up Parents if they have no other children
      for (const parentId of parentIds) {
        const parent = await tx.parent.findUnique({
          where: { id: parentId },
          include: {
            children: true
          }
        });
        if (!parent) continue;

        const otherChildren = parent.children.filter(child => child.id !== studentId);
        if (otherChildren.length === 0) {
          if (parent.userId) {
            await tx.user.delete({ where: { id: parent.userId } });
          } else {
            await tx.parent.delete({ where: { id: parent.id } });
          }
        } else {
          await tx.parent.update({
            where: { id: parent.id },
            data: {
              children: {
                disconnect: { id: studentId }
              }
            }
          });
        }
      }

      // Delete student user account (which cascades and deletes Student due to onDelete: Cascade)
      if (student.userId) {
        await tx.user.delete({
          where: { id: student.userId }
        });
      } else {
        await tx.student.delete({
          where: { id: studentId }
        });
      }
    });

    res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Promote a student to next grade level / academic year
// @route   POST /api/students/promote
// @access  Private (Admin/SuperAdmin)
const promoteStudent = async (req, res) => {
  try {
    const { studentId, nextGrade, nextAcademicYearId, sectionId } = req.body;

    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const nextYear = await prisma.academicYear.findUnique({
      where: { id: nextAcademicYearId }
    });
    if (!nextYear) return res.status(404).json({ message: 'Target academic year not found.' });

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: { studentId, academicYearId: nextAcademicYearId }
    });
    if (existingEnrollment) {
      return res.status(400).json({ message: 'Student already has an enrollment/promotion record for this academic year.' });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        academicYearId: nextAcademicYearId,
        grade: nextGrade,
        sectionId: sectionId || null,
        status: 'Promoted'
      }
    });

    // Update current grade on student's permanent profile
    await prisma.student.update({
      where: { id: studentId },
      data: { grade: nextGrade }
    });

    await attachStudentToGradeClass(student, nextGrade);

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Promote Student', student.id, `Promoted student ${student.studentId} to Grade ${nextGrade} for year ${nextYear.year}`);

    res.status(200).json({ message: 'Student promoted successfully', enrollment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Enroll a student to repeat same grade level / academic year
// @route   POST /api/students/repeat
// @access  Private (Admin/SuperAdmin)
const repeatStudent = async (req, res) => {
  try {
    const { studentId, targetAcademicYearId, sectionId } = req.body;

    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const year = await prisma.academicYear.findUnique({
      where: { id: targetAcademicYearId }
    });
    if (!year) return res.status(404).json({ message: 'Target academic year not found.' });

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: { studentId, academicYearId: targetAcademicYearId }
    });
    if (existingEnrollment) {
      return res.status(400).json({ message: 'Student has an enrollment record for this academic year.' });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        academicYearId: targetAcademicYearId,
        grade: student.grade,
        sectionId: sectionId || null,
        status: 'Repeated'
      }
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Repeat Student', student.id, `Set student ${student.studentId} to repeat Grade ${student.grade} for year ${year.year}`);

    res.status(200).json({ message: 'Student set to repeat grade successfully', enrollment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update student/enrollment status (Transferred, Graduated, etc.)
// @route   PATCH /api/students/:id/status
// @access  Private (Admin/SuperAdmin)
const setStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, enrollmentId } = req.body;

    if (!status) return res.status(400).json({ message: 'Status is required.' });

    const student = await prisma.student.findUnique({
      where: { id }
    });
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    if (enrollmentId) {
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status }
      });
    }

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Update Student Status', student.id, `Set student status to: ${status}`);

    res.status(200).json({ message: `Student status updated to ${status}.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update student details
// @route   PUT /api/students/:id
// @access  Private (Admin/SuperAdmin)
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      grade,
      personalDetails = {},
      familyBackground = {},
      guardianContacts = []
    } = req.body;

    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const updatedStudent = await prisma.$transaction(async (tx) => {
      // Update user if name or email provided
      if (name || email) {
        const userData = {};
        if (name) userData.name = name;
        if (email !== undefined) {
          const normalizedEmail = normalizeEmail(email);
          if (normalizedEmail && normalizedEmail !== student.user?.email) {
            const existingUser = await tx.user.findFirst({
              where: { email: normalizedEmail }
            });
            if (existingUser && existingUser.id !== student.userId) {
              throw new Error('Email already exists');
            }
            userData.email = normalizedEmail;
          }
        }
        
        if (Object.keys(userData).length > 0) {
          await tx.user.update({
            where: { id: student.userId },
            data: userData
          });
        }
      }

      // Update student record
      const studentData = {};
      if (grade) studentData.grade = grade;
      
      if (Object.keys(personalDetails).length > 0) {
        studentData.personalDetails = {
          ...(student.personalDetails || {}),
          ...personalDetails
        };
      }
      
      if (Object.keys(familyBackground).length > 0) {
        studentData.familyBackground = {
          ...(student.familyBackground || {}),
          ...familyBackground
        };
      }
      
      if (guardianContacts.length > 0) {
        studentData.guardianContacts = guardianContacts;
      }

      const updated = await tx.student.update({
        where: { id },
        data: studentData,
        include: { user: true }
      });

      return updated;
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Update Student', student.id, `Updated student ${student.studentId}`);

    const responseStudent = {
      ...updatedStudent,
      _id: updatedStudent.id,
      user: updatedStudent.user ? { ...updatedStudent.user, _id: updatedStudent.user.id } : null
    };

    res.status(200).json({
      message: 'Student updated successfully',
      student: responseStudent
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
  registerStudent, 
  getStudents,
  getAllStudents,
  setGradeFee, 
  getGradeFees, 
  deleteStudent,
  promoteStudent,
  repeatStudent,
  setStudentStatus,
  updateStudent
};
