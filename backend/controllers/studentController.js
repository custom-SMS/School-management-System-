const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { isRegistrationOpen } = require('../utils/academicYear');
const { sendGuardianCredentialsEmail } = require('../utils/emailService');

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

// Place the student into one explicit class chosen at registration. Returns
// false when the class id is missing/invalid so the caller can fall back to
// grade-based placement.
const attachStudentToClassId = async (studentId, classId) => {
  if (!classId) return false;
  const klass = await prisma.class.findUnique({ where: { id: classId } });
  if (!klass) return false;
  await prisma.class.update({
    where: { id: classId },
    data: { students: { connect: { id: studentId } } },
  });
  return true;
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
      classId,
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
    if (!isRegistrationOpen(activeYear)) {
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

    const gradeSettings = await prisma.feeStructure.findFirst({
      where: { grade }
    });
    if (!gradeSettings) {
      return res.status(400).json({ message: `Registrar has not configured settings for Grade: ${grade}` });
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

    const placedByClassId = await attachStudentToClassId(student.id, classId);
    if (!placedByClassId) {
      await attachStudentToGradeClass(student, grade);
    }

    const guardianCredentials = [];
    const guardianEmailStatus = [];

    for (const contact of guardianContacts) {
      const credentials = await upsertGuardianProfile({
        contact,
        student,
        studentName: name,
      });
      guardianCredentials.push(credentials);

      if (!credentials.email) {
        guardianEmailStatus.push({
          email: null,
          status: 'skipped',
          reason: 'missing guardian email',
        });
        continue;
      }

      if (!credentials.password) {
        guardianEmailStatus.push({
          email: credentials.email,
          status: 'skipped',
          reason: 'guardian already has an account',
        });
        continue;
      }

      try {
        const emailResult = await sendGuardianCredentialsEmail(
          credentials.email,
          credentials.fullName || 'Guardian',
          name,
          credentials.password
        );

        guardianEmailStatus.push({
          email: credentials.email,
          status: 'sent',
          resendId: emailResult.id || null,
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${credentials.email}:`, emailError);
        guardianEmailStatus.push({
          email: credentials.email,
          status: 'failed',
          reason: emailError.message,
        });
      }
    }

    const finalStudent = await prisma.student.findUnique({
      where: { id: student.id }
    });

    const responseStudent = {
      ...finalStudent,
      _id: finalStudent.id
    };

    // Only return guardian emails, no passwords shown to admin/teacher
    const guardianEmailsForResponse = guardianCredentials.map(cred => ({
      fullName: cred.fullName,
      email: cred.email,
      relationship: cred.relationship,
      primary: cred.primary,
    }));

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
      guardiansNotified: guardianEmailsForResponse,
      guardianEmailStatus,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all students
// @route   GET /api/students
// @access  Private (Admin/Teacher)
const getStudents = async (req, res) => {
  try {
    const { id } = req.params || {};
    if (id) {
      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          guardians: true,
          fees: true,
          classes: { select: { id: true, name: true } },
          enrollments: {
            include: {
              academicYear: true
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      return res.status(200).json({
        ...student,
        _id: student.id,
        classes: (student.classes || []).map((c) => ({ ...c, _id: c.id })),
        user: student.user ? { ...student.user, _id: student.user.id } : null,
        guardians: (student.guardians || []).map((g) => ({
          ...g,
          _id: g.id
        }))
      });
    }

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
        fees: true,
        enrollments: {
          include: {
            academicYear: true
          },
          orderBy: { createdAt: 'desc' }
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

// @desc    Aggregated academic + attendance performance for a single student
// @route   GET /api/students/:id/performance
// @access  Private (Teacher/Admin/SuperAdmin)
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getStudentPerformance = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const grades = await prisma.grade.findMany({
      where: { studentId: id },
      orderBy: { createdAt: 'asc' }
    });

    // Average percentage per subject.
    const subjectMap = new Map();
    grades.forEach((g) => {
      const key = g.subject || 'General';
      const cur = subjectMap.get(key) || { subject: key, sum: 0, count: 0 };
      cur.sum += Number(g.percentage || 0);
      cur.count += 1;
      subjectMap.set(key, cur);
    });
    const subjects = Array.from(subjectMap.values()).map((s) => ({
      subject: s.subject,
      percentage: Math.round(s.sum / s.count),
      count: s.count,
    }));

    const studentAverage = grades.length
      ? Math.round(grades.reduce((sum, g) => sum + Number(g.percentage || 0), 0) / grades.length)
      : 0;
    const gpa = Number(((studentAverage / 100) * 4).toFixed(2));

    // Chronological trend, averaged per calendar month (last 6 buckets).
    const trendMap = new Map();
    grades.forEach((g) => {
      const d = new Date(g.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      const cur = trendMap.get(key) || { label: MONTH_LABELS[d.getMonth()], sum: 0, count: 0 };
      cur.sum += Number(g.percentage || 0);
      cur.count += 1;
      trendMap.set(key, cur);
    });
    const trend = Array.from(trendMap.values())
      .slice(-6)
      .map((t) => ({ label: t.label, percentage: Math.round(t.sum / t.count) }));

    // Attendance summary + recent register.
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { studentId: id },
      include: { attendance: { select: { date: true } } }
    });
    let present = 0;
    let late = 0;
    let absent = 0;
    attendanceRecords.forEach((r) => {
      if (r.status === 'Present') present += 1;
      else if (r.status === 'Late') late += 1;
      else if (r.status === 'Absent') absent += 1;
    });
    const totalAttendance = attendanceRecords.length;
    const attendanceRate = totalAttendance ? Number(((present / totalAttendance) * 100).toFixed(1)) : 0;
    const attendanceCalendar = attendanceRecords
      .map((r) => ({ date: r.attendance?.date, status: r.status }))
      .filter((r) => r.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-35);

    // Class rank within the same grade level, by average percentage.
    const classmates = await prisma.student.findMany({
      where: { grade: student.grade },
      select: { id: true }
    });
    const classmateIds = classmates.map((c) => c.id);
    const classmateGrades = await prisma.grade.findMany({
      where: { studentId: { in: classmateIds } },
      select: { studentId: true, percentage: true }
    });
    const avgByStudent = new Map();
    classmateGrades.forEach((g) => {
      const cur = avgByStudent.get(g.studentId) || { sum: 0, count: 0 };
      cur.sum += Number(g.percentage || 0);
      cur.count += 1;
      avgByStudent.set(g.studentId, cur);
    });
    const ranked = classmateIds
      .map((sid) => {
        const a = avgByStudent.get(sid);
        return { studentId: sid, avg: a && a.count ? a.sum / a.count : 0 };
      })
      .sort((a, b) => b.avg - a.avg);
    const rankIndex = ranked.findIndex((r) => r.studentId === id);
    const classRank = { rank: rankIndex >= 0 ? rankIndex + 1 : null, total: classmateIds.length };
    const classAverage = ranked.length
      ? Math.round(ranked.reduce((sum, r) => sum + r.avg, 0) / ranked.length)
      : 0;

    const latestComment = [...grades].reverse().find((g) => g.comments)?.comments || null;

    res.status(200).json({
      student: {
        _id: student.id,
        studentId: student.studentId,
        name: student.user?.name || 'Student',
        email: student.user?.email || null,
        grade: student.grade,
      },
      gpa,
      studentAverage,
      classAverage,
      classRank,
      subjects,
      trend,
      attendance: { present, late, absent, total: totalAttendance, rate: attendanceRate },
      attendanceCalendar,
      latestComment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set fee amount for a specific grade
// @route   POST /api/students/grade-fee
// @access  Private (Admin/Registrar)
const setGradeFee = async (req, res) => {
  try {
    const { grade, amount, description } = req.body;
    const gradeFee = await prisma.feeStructure.upsert({
      where: { grade },
      update: { amount: Number(amount), description },
      create: { grade, amount: Number(amount), description }
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
    const fees = await prisma.feeStructure.findMany();
    res.status(200).json(fees.map(f => ({ ...f, _id: f.id })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Class list for the registration class-placement dropdown
// @route   GET /api/students/classes
// @access  Private (student_registration permission)
const getRegistrationClasses = async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { name: 'asc' },
      include: { teacher: { include: { user: { select: { name: true } } } } },
    });
    res.status(200).json(
      classes.map((c) => ({
        id: c.id,
        _id: c.id,
        name: c.name,
        subject: c.subject,
        teacherName: c.teacher?.user?.name || null,
      })),
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a student and their dependent records
// @route   DELETE /api/students/:id
// @access  Private (Admin)
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      grade,
      classId,
      personalDetails,
      familyBackground
    } = req.body;
    const guardianContacts = buildGuardianContacts(req.body);

    const existingStudent = await prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        guardians: true
      }
    });

    if (!existingStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (email) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: existingStudent.userId }
        }
      });

      if (duplicateUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const updatedStudent = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existingStudent.userId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email: email || null } : {})
        }
      });

      let nextGuardianContacts;
      if (guardianContacts.length) {
        const contact = guardianContacts[0];
        const primaryGuardian = existingStudent.guardians?.[0];

        if (primaryGuardian) {
          const updatedGuardian = await tx.parent.update({
            where: { id: primaryGuardian.id },
            data: {
              fullName: contact.fullName || primaryGuardian.fullName,
              email: normalizeEmail(contact.email) || primaryGuardian.email,
              phone: contact.phone || primaryGuardian.phone,
              relationship: contact.relationship || primaryGuardian.relationship,
              address: contact.address || primaryGuardian.address
            }
          });

          nextGuardianContacts = [{
            parent: updatedGuardian.id,
            fullName: updatedGuardian.fullName,
            email: updatedGuardian.email || '',
            phone: updatedGuardian.phone || '',
            relationship: updatedGuardian.relationship || 'Guardian',
            address: updatedGuardian.address || '',
            primary: true
          }];
        } else {
          nextGuardianContacts = guardianContacts;
        }
      }

      return tx.student.update({
        where: { id },
        data: {
          ...(grade !== undefined ? { grade } : {}),
          ...(personalDetails !== undefined ? { personalDetails } : {}),
          ...(familyBackground !== undefined ? { familyBackground } : {}),
          ...(nextGuardianContacts !== undefined ? { guardianContacts: nextGuardianContacts } : {})
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          guardians: true,
          fees: true,
          enrollments: {
            include: {
              academicYear: true
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    });

    // Re-place the student into the chosen class (single placement: replace any
    // existing class membership) when a class is explicitly selected.
    if (classId) {
      const klass = await prisma.class.findUnique({ where: { id: classId } });
      if (klass) {
        await prisma.student.update({
          where: { id },
          data: { classes: { set: [{ id: classId }] } },
        });
      }
    }

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(
      req.user._id,
      'Update Student',
      updatedStudent.id,
      `Updated student ${updatedStudent.studentId} (${updatedStudent.user?.name || 'Unknown'})`
    );

    res.status(200).json({
      message: 'Student updated successfully',
      student: {
        ...updatedStudent,
        _id: updatedStudent.id,
        user: updatedStudent.user ? { ...updatedStudent.user, _id: updatedStudent.user.id } : null,
        guardians: (updatedStudent.guardians || []).map((g) => ({
          ...g,
          _id: g.id
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

module.exports = { 
  registerStudent,
  getStudents,
  getStudentPerformance,
  setGradeFee,
  getGradeFees,
  getRegistrationClasses,
  updateStudent,
  deleteStudent,
  promoteStudent,
  repeatStudent,
  setStudentStatus
};
