const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { isRegistrationOpen } = require('../utils/academicYear');
const { sendGuardianCredentialsEmail } = require('../utils/emailService');
const { createStudentSchema, updateStudentSchema } = require('../utils/validation');

const resolveGradeSubjectName = (grade) => {
  if (!grade) return 'Subject';
  return grade.subjectRef?.name || grade.subject || grade.class?.subject || 'Subject';
};

const resolveGradeSubjectKey = (grade) => {
  return String(grade.subjectId || grade.subjectRef?.id || resolveGradeSubjectName(grade));
};

const resolveGradeCourseCode = (grade) => {
  if (!grade) return null;
  return grade.class?.subject || grade.subject || null;
};

const normalizeNumeric = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const getGradeComponentScore = (grade, field) => {
  const marks = grade.marks || {};
  return normalizeNumeric(marks[field] ?? grade[field]);
};

const buildAssessmentRowsFromGrade = (grade, weights) => {
  // weights come from the active grading structure; fall back to defaults
  const w = weights || { quizWeight: 10, assignmentWeight: 20, midtermWeight: 30, finalWeight: 40 };
  const componentDefs = [
    ['quiz', 'Quiz', w.quizWeight],
    ['assignment', 'Assignment', w.assignmentWeight],
    ['midterm', 'Midterm', w.midtermWeight],
    ['final', 'Final', w.finalWeight],
  ];

  return componentDefs.map(([field, label, weight]) => {
    const score = getGradeComponentScore(grade, field);
    // null score means teacher hasn't entered a value — return the row with nulls so
    // the student portal can display '—' rather than hiding the row entirely
    if (score === null) {
      return {
        id: `${grade.id}-${field}`,
        type: field,
        name: label,
        score: null,
        max: weight,
        percentage: null,
        date: grade.updatedAt || grade.createdAt,
        recordedAt: grade.updatedAt || grade.createdAt,
      };
    }
    const raw = Number(score);
    const contribution = raw > weight ? (raw / 100) * weight : raw;
    const percentage = weight > 0 ? Number(((contribution / weight) * 100).toFixed(2)) : 0;
    return {
      id: `${grade.id}-${field}`,
      type: field,
      name: label,
      score: Number(contribution.toFixed(2)),
      max: weight,
      percentage,
      date: grade.updatedAt || grade.createdAt,
      recordedAt: grade.updatedAt || grade.createdAt,
    };
  });
};

const getPortalStudentByUserId = async (userId) => {
  return prisma.student.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      enrollments: {
        include: {
          section: { select: { id: true, name: true } },
          academicYear: { select: { id: true, year: true, isActive: true } }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
};

const resolvePortalStudent = async (req) => {
  if (req.user.role === 'Parent') {
    const childStudentId = req.query.childStudentId;
    if (!childStudentId) {
      return { error: { status: 400, message: 'childStudentId is required for Parent role.' } };
    }
    const parent = await prisma.parent.findUnique({
      where: { userId: req.user._id },
      include: { children: { select: { id: true } } }
    });
    if (!parent) {
      return { error: { status: 404, message: 'Parent profile not found' } };
    }
    const isLinked = parent.children.some((child) => child.id === childStudentId);
    if (!isLinked) {
      return { error: { status: 403, message: 'You are not authorized to view this student.' } };
    }
    const student = await prisma.student.findUnique({
      where: { id: childStudentId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        enrollments: {
          include: {
            section: { select: { id: true, name: true } },
            academicYear: { select: { id: true, year: true, isActive: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!student) {
      return { error: { status: 404, message: 'Student not found' } };
    }
    return { student };
  }

  const student = await getPortalStudentByUserId(req.user._id);
  if (!student) {
    return { error: { status: 404, message: 'Student Profile not found' } };
  }
  return { student };
};

// Helper to generate IDs
const getNextAvailableStudentId = async () => {
  const latestStudent = await prisma.student.findFirst({
    where: {
      studentId: {
        startsWith: 'STU/',
      }
    },
    orderBy: {
      studentId: 'desc'
    }
  });

  const latestNumber = latestStudent
    ? Number(latestStudent.studentId.split('/')[1])
    : 0;

  const now = new Date();
  const gregYear = now.getFullYear();
  const month = now.getMonth() + 1;

  // Ethiopian calendar approximation
  const etYear = month >= 9 ? gregYear - 7 : gregYear - 8;
  const etYearLast2 = etYear.toString().slice(-2);

  const counter = await prisma.counter.upsert({
    where: { id: 'studentId' },
    update: { seq: { increment: 1 } },
    create: { id: 'studentId', seq: latestNumber + 1 }
  });

  return `STU/${String(counter.seq).padStart(4, '0')}/${etYearLast2}`;
};

const generateParentId = async () => {
  const count = await prisma.parent.count();

  const now = new Date();
  const gregYear = now.getFullYear();
  const month = now.getMonth() + 1;

  // Ethiopian year approximation
  const etYear = month >= 9 ? gregYear - 7 : gregYear - 8;

  const etYearLast2 = etYear.toString().slice(-2);

  return `PAR/${(count + 1).toString().padStart(4, '0')}/${etYearLast2}`;
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

const cleanGradeName = (name) => {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/grade|class/g, '');
};

// Fee rules and class names are configured with slightly different labels
// ("Class 5" vs "Grade 5"). Match on the numeric level when present, and fall
// back to a case/space-insensitive comparison of the full label otherwise.
const normalizeLabel = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const findFeeForGrade = async (grade) => {
  const exact = await prisma.feeStructure.findFirst({ where: { grade } });
  if (exact) return exact;

  const target = normalizeLabel(grade);
  const targetNumber = target.match(/\d+/)?.[0] || '';
  const allFees = await prisma.feeStructure.findMany();

  return (
    allFees.find((fee) => {
      const feeLabel = normalizeLabel(fee.grade);
      const feeNumber = feeLabel.match(/\d+/)?.[0] || '';
      if (targetNumber && feeNumber) return feeNumber === targetNumber;
      return feeLabel === target;
    }) || null
  );
};

const attachStudentToGradeClass = async (student, grade) => {
  const className = resolveClassNameFromGrade(grade);
  const branchId = student.branchId || null;

  let klass = await prisma.class.findFirst({
    where: {
      name: className,
      branchId: branchId
    }
  });
  if (!klass) {
    klass = await prisma.class.create({
      data: {
        name: className,
        subject: 'General',
        branchId: branchId,
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

// The class the registrar picks is the single source of truth for the student's
// grade level. Derive a clean grade label from the class name (e.g. "Grade 5",
// "Nursery") so we never require a separate grade field at registration.
const deriveGradeFromClassName = (className) => {
  const name = String(className || '').trim();
  const match = name.match(/(\d+)/);
  if (match) return `Grade ${match[1]}`;
  return name || null;
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
    const validatedData = createStudentSchema.parse(req.body);
    const {
      name,
      email,
      grade: gradeFromBody,
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
      stream,
    } = validatedData;

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

    const resolvedBranchId = (req.branchFilter && req.branchFilter.branchId && req.branchFilter.branchId !== '__none__')
      ? req.branchFilter.branchId
      : (req.body.branchId || req.headers['x-branch-id'] || req.user?.branchId || process.env.DEFAULT_BRANCH_ID || null);

    // Enforce +2519XXXXXXXX phone validation server-side (guardian phone)
    // The UI sends guardian phone as personalDetails.phone (parentPhone).
    const resolvedGuardianPhone = personalDetails.phone || phone || undefined;
    if (resolvedGuardianPhone) {
      const isValid = /^\+2519\d{8}$/.test(String(resolvedGuardianPhone));
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid phone number. Expected +2519XXXXXXXX' });
      }
    }

    // The class chosen from the dropdown is the source of truth. Resolve it now
    // and derive the grade from it; fall back to any grade sent in the body only
    // when no class was selected.
    let selectedClass = null;
    if (classId) {
      selectedClass = await prisma.class.findUnique({ where: { id: classId } });
      if (!selectedClass) {
        return res.status(400).json({ message: 'Selected class was not found.' });
      }

      // Branch isolation: class must belong to the same branch as the registration context.
      if (resolvedBranchId && selectedClass.branchId !== resolvedBranchId) {
        return res.status(403).json({ message: 'Access denied. Selected class does not belong to your branch.' });
      }
    }

    const grade = selectedClass
      ? deriveGradeFromClassName(selectedClass.name)
      : gradeFromBody;

    if (!grade) {
      return res.status(400).json({ message: 'Please select a class for the student.' });
    }

    const studentPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(studentPassword, 10);

    const gradeSettings = await findFeeForGrade(grade);
    if (!gradeSettings) {
      return res.status(400).json({ message: `Registrar has not configured a fee for ${grade}. Please set the grade fee before registering.` });
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
          stream,
          branchId: resolvedBranchId,
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
            stream,
            branchId: resolvedBranchId,
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
        stream,
        status: 'Enrolled'
      }
    });

    if (selectedClass) {
      await prisma.class.update({
        where: { id: selectedClass.id },
        data: { students: { connect: { id: student.id } } },
      });
    } else {
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
          user: { select: { id: true, name: true, email: true, isActive: true } },
          guardians: true,
          fees: true,
          classes: { select: { id: true, name: true } },
          enrollments: {
            include: {
              academicYear: true,
              section: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const latestEnrollment = (student.enrollments || [])[0] || null;

      return res.status(200).json({
        ...student,
        _id: student.id,
        section: latestEnrollment?.section?.name || null,
        sectionId: latestEnrollment?.section?.id || null,
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
                  user: { select: { id: true, name: true, email: true, isActive: true } }
                }
              }
            }
          }
        }
      });

      const allowedStudentIds = new Set();
      const allowedGradeNames = new Set();

      assignments.forEach((assignment) => {
        const className = String(assignment.class?.name || '');
        const classClean = cleanGradeName(className);
        if (classClean) {
          allowedGradeNames.add(classClean);
        }

        (assignment.class?.students || []).forEach((student) => {
          if (student?.id) allowedStudentIds.add(student.id);
        });
      });

      const allStudents = await prisma.student.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, isActive: true } },
          enrollments: {
            include: {
              section: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      const students = allStudents.filter((student) => {
        if (allowedStudentIds.has(student.id)) return true;

        const gradeClean = cleanGradeName(student.grade);
        return gradeClean ? allowedGradeNames.has(gradeClean) : false;
      });

      const responseStudents = students.map(student => {
        const latestEnrollment = (student.enrollments || [])[0] || null;
        return {
          ...student,
          _id: student.id,
          section: latestEnrollment?.section?.name || null,
          sectionId: latestEnrollment?.section?.id || null,
          user: student.user ? { ...student.user, _id: student.user.id } : null
        };
      });

      return res.status(200).json(responseStudents);
    }

    const { page = 1, limit = 50, grade, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const whereClause = {
      ...(req.branchFilter || {}),  // scope to branch automatically
      ...(grade && { grade }),
      ...(search && {
        user: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }
      })
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, email: true, isActive: true } },
          guardians: true,
          enrollments: {
            include: {
              academicYear: true,
              section: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 1 // Only latest enrollment
          }
        },
        skip,
        take: Number(limit),
        orderBy: { enrollmentDate: 'desc' }
      }),
      prisma.student.count({ where: whereClause })
    ]);

    const responseStudents = students.map(student => {
      const latestEnrollment = (student.enrollments || [])[0] || null;
      return {
        ...student,
        _id: student.id,
        section: latestEnrollment?.section?.name || null,
        sectionId: latestEnrollment?.section?.id || null,
        user: student.user ? { ...student.user, _id: student.user.id } : null,
        guardians: (student.guardians || []).map(g => ({
          ...g,
          _id: g.id
        }))
      };
    });

    res.status(200).json({
      students: responseStudents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentSubjectSummaries = async (req, res) => {
  try {
    const resolved = await resolvePortalStudent(req);
    if (resolved.error) {
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }
    const { student } = resolved;

    // Fetch active grading weights so we recalculate correctly on read
    const gradingStructure = await prisma.gradingStructure.findFirst({
      where: { isActive: true }
    }) || { quizWeight: 10, assignmentWeight: 20, midtermWeight: 30, finalWeight: 40 };

    const componentDefs = [
      ['quiz', gradingStructure.quizWeight],
      ['assignment', gradingStructure.assignmentWeight],
      ['midterm', gradingStructure.midtermWeight],
      ['final', gradingStructure.finalWeight],
    ];

    // Recalculate total/percentage from raw marks — never trust the stored value
    const recalcFromGrade = (grade) => {
      const filled = componentDefs.filter(([field]) => {
        const v = grade[field];
        return v !== null && v !== undefined;
      });
      if (filled.length === 0) return { total: null, percentage: null };
      const totalContrib = filled.reduce((sum, [field, weight]) => {
        const raw = Number(grade[field]);
        const contribution = raw > weight ? (raw / 100) * weight : raw;
        return sum + contribution;
      }, 0);
      const filledWeightSum = filled.reduce((s, [, w]) => s + w, 0);
      const percentage = filledWeightSum > 0
        ? Number(((totalContrib / filledWeightSum) * 100).toFixed(2))
        : null;
      return { total: Number(totalContrib.toFixed(2)), percentage };
    };

    const grades = await prisma.grade.findMany({
      where: { studentId: student.id },
      include: {
        class: { select: { id: true, name: true, subject: true } },
        subjectRef: { select: { id: true, name: true } }
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
    });

    const activeEnrollment = (student.enrollments || []).find((entry) => entry.academicYear?.isActive) || student.enrollments?.[0] || null;
    const subjectMap = new Map();

    grades.forEach((grade) => {
      const subjectKey = resolveGradeSubjectKey(grade);
      const subjectName = resolveGradeSubjectName(grade);
      const { total, percentage } = recalcFromGrade(grade);
      const existing = subjectMap.get(subjectKey);

      if (!existing) {
        subjectMap.set(subjectKey, {
          subjectKey,
          subjectId: grade.subjectId || grade.subjectRef?.id || null,
          subjectName,
          courseCode: resolveGradeCourseCode(grade),
          classId: grade.classId || grade.class?.id || null,
          className: grade.class?.name || null,
          latestTotalMarks: total,
          latestPercentage: percentage,
          assessmentsCount: buildAssessmentRowsFromGrade(grade, gradingStructure).length,
          recordsCount: 1,
          updatedAt: grade.updatedAt || grade.createdAt,
        });
        return;
      }

      existing.recordsCount += 1;
      const candidateUpdatedAt = grade.updatedAt || grade.createdAt;
      if (new Date(candidateUpdatedAt) > new Date(existing.updatedAt)) {
        existing.latestTotalMarks = total;
        existing.latestPercentage = percentage;
        existing.classId = grade.classId || grade.class?.id || existing.classId;
        existing.className = grade.class?.name || existing.className;
        existing.courseCode = resolveGradeCourseCode(grade) || existing.courseCode;
        existing.assessmentsCount = buildAssessmentRowsFromGrade(grade, gradingStructure).length;
        existing.updatedAt = candidateUpdatedAt;
      }
    });

    const responseStudent = {
      ...student,
      _id: student.id,
      section: activeEnrollment?.section?.name || null,
      sectionId: activeEnrollment?.section?.id || null,
      user: student.user ? { ...student.user, _id: student.user.id } : null,
    };

    res.status(200).json({
      student: responseStudent,
      subjects: Array.from(subjectMap.values()).sort((left, right) => left.subjectName.localeCompare(right.subjectName)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentSubjectResults = async (req, res) => {
  try {
    const { subjectKey } = req.params;
    const decodedSubjectKey = decodeURIComponent(subjectKey || '');
    const resolved = await resolvePortalStudent(req);
    if (resolved.error) {
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }
    const { student } = resolved;

    // Fetch active grading weights
    const gradingStructure = await prisma.gradingStructure.findFirst({
      where: { isActive: true }
    }) || { quizWeight: 10, assignmentWeight: 20, midtermWeight: 30, finalWeight: 40 };

    const grades = await prisma.grade.findMany({
      where: { studentId: student.id },
      include: {
        class: { select: { id: true, name: true, subject: true } },
        subjectRef: { select: { id: true, name: true } }
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
    });

    const subjectGrades = grades.filter((grade) => {
      const gradeKey = resolveGradeSubjectKey(grade);
      const gradeName = resolveGradeSubjectName(grade);
      return gradeKey === decodedSubjectKey || gradeName === decodedSubjectKey;
    });

    if (!subjectGrades.length) {
      return res.status(404).json({ message: 'No results found for this subject.' });
    }

    const latestGrade = subjectGrades[0];
    const assessments = buildAssessmentRowsFromGrade(latestGrade, gradingStructure);

    // Total and percentage — only count filled components
    const componentDefs = [
      ['quiz', gradingStructure.quizWeight],
      ['assignment', gradingStructure.assignmentWeight],
      ['midterm', gradingStructure.midtermWeight],
      ['final', gradingStructure.finalWeight],
    ];
    const filledComponents = componentDefs.filter(([field]) => getGradeComponentScore(latestGrade, field) !== null);
    const totalMarks = filledComponents.reduce((sum, [field, weight]) => {
      const raw = Number(getGradeComponentScore(latestGrade, field));
      const contribution = raw > weight ? (raw / 100) * weight : raw;
      return sum + contribution;
    }, 0);
    const filledWeightSum = filledComponents.reduce((s, [, w]) => s + w, 0);
    const percentage = filledWeightSum > 0 ? Number(((totalMarks / filledWeightSum) * 100).toFixed(2)) : null;
    const latestTotalMarks = filledComponents.length > 0 ? Number(totalMarks.toFixed(2)) : null;
    const maxTotal = filledWeightSum > 0 ? filledWeightSum : 100;

    res.status(200).json({
      subject: {
        subjectKey: resolveGradeSubjectKey(latestGrade),
        subjectId: latestGrade.subjectId || latestGrade.subjectRef?.id || null,
        name: resolveGradeSubjectName(latestGrade),
        courseCode: resolveGradeCourseCode(latestGrade),
        classId: latestGrade.classId || latestGrade.class?.id || null,
        className: latestGrade.class?.name || null,
      },
      assessments,
      summary: {
        totalMarks: latestTotalMarks,
        maxTotal,
        percentage,
        assessmentsCount: filledComponents.length,
        recordsCount: subjectGrades.length,
        updatedAt: latestGrade.updatedAt || latestGrade.createdAt,
      }
    });
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
    const [classes, fees] = await Promise.all([
      prisma.class.findMany({
        where: {
          ...(req.branchFilter || {}),
        },
        orderBy: { name: 'asc' },
        include: { teacher: { include: { user: { select: { name: true } } } } },
      }),
      prisma.feeStructure.findMany(),
    ]);

    const feeForGrade = (grade) => {
      const exact = fees.find((f) => f.grade === grade);
      if (exact) return exact;
      const target = normalizeLabel(grade);
      const targetNumber = target.match(/\d+/)?.[0] || '';
      return (
        fees.find((f) => {
          const label = normalizeLabel(f.grade);
          const num = label.match(/\d+/)?.[0] || '';
          if (targetNumber && num) return num === targetNumber;
          return label === target;
        }) || null
      );
    };

    res.status(200).json(
      classes.map((c) => {
        const grade = deriveGradeFromClassName(c.name);
        const fee = feeForGrade(grade);
        return {
          id: c.id,
          _id: c.id,
          name: c.name,
          subject: c.subject,
          stream: c.stream || null,
          teacherName: c.teacher?.user?.name || null,
          grade,
          feeConfigured: Boolean(fee),
          feeAmount: fee ? fee.amount : null,
        };
      }),
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
    const validatedData = updateStudentSchema.parse(req.body);
    const {
      name,
      email,
      grade: gradeFromBody,
      stream,
      classId,
      personalDetails,
      familyBackground
    } = validatedData;
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

    if (req.branchFilter && req.branchFilter.branchId && req.branchFilter.branchId !== '__none__') {
      if (existingStudent.branchId !== req.branchFilter.branchId) {
        return res.status(403).json({ message: 'Access denied. Student does not belong to your branch.' });
      }
    }

    // When a class is picked, it dictates the grade level; otherwise honour any
    // grade explicitly provided in the body.
    let selectedClass = null;
    if (classId) {
      selectedClass = await prisma.class.findUnique({ where: { id: classId } });
      if (!selectedClass) {
        return res.status(400).json({ message: 'Selected class was not found.' });
      }
    }
    const grade = selectedClass
      ? deriveGradeFromClassName(selectedClass.name)
      : gradeFromBody;

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
          ...(stream !== undefined ? { stream } : {}),
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
    if (selectedClass) {
      await prisma.student.update({
        where: { id },
        data: { classes: { set: [{ id: selectedClass.id }] } },
      });
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

    if (req.branchFilter && req.branchFilter.branchId && req.branchFilter.branchId !== '__none__') {
      if (student.branchId !== req.branchFilter.branchId) {
        return res.status(403).json({ message: 'Access denied. Student does not belong to your branch.' });
      }
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

    if (req.branchFilter && req.branchFilter.branchId && req.branchFilter.branchId !== '__none__') {
      if (student.branchId !== req.branchFilter.branchId) {
        return res.status(403).json({ message: 'Access denied. Student does not belong to your branch.' });
      }
    }

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

    if (req.branchFilter && req.branchFilter.branchId && req.branchFilter.branchId !== '__none__') {
      if (student.branchId !== req.branchFilter.branchId) {
        return res.status(403).json({ message: 'Access denied. Student does not belong to your branch.' });
      }
    }

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

    if (req.branchFilter && req.branchFilter.branchId && req.branchFilter.branchId !== '__none__') {
      if (student.branchId !== req.branchFilter.branchId) {
        return res.status(403).json({ message: 'Access denied. Student does not belong to your branch.' });
      }
    }

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
  getStudentSubjectSummaries,
  getStudentSubjectResults,
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
