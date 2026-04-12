const User = require('../models/User');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const GradeFee = require('../models/GradeFee');
const Grade = require('../models/Grade');
const Fee = require('../models/Fee');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const TeacherAssignment = require('../models/TeacherAssignment');
const Counter = require('../models/Counter');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Helper to generate IDs
const getNextAvailableStudentId = async () => {
  const latestStudent = await Student.findOne({ studentId: /^STU-\d{4}$/ })
    .sort({ studentId: -1 })
    .select('studentId');

  const latestNumber = latestStudent
    ? Number(latestStudent.studentId.split('-')[1])
    : 0;

  const counter = await Counter.findOneAndUpdate(
    { _id: 'studentId' },
    {
      $setOnInsert: { seq: latestNumber },
      $inc: { seq: 1 },
    },
    { new: true, upsert: true }
  );

  return `STU-${String(counter.seq).padStart(4, '0')}`;
};

const generateParentId = async () => {
  const count = await Parent.countDocuments();
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

  await Class.findOneAndUpdate(
    { name: className },
    {
      $setOnInsert: {
        name: className,
        subject: 'General',
      },
      $addToSet: { students: student._id },
    },
    { upsert: true, new: true }
  );
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
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.role !== 'Parent') {
      throw new Error(`The email ${email} is already used by a ${existingUser.role.toLowerCase()}.`);
    }
  }

  let generatedPassword = null;
  let user = null;

  if (email) {
    user = await User.findOne({ email });
  }

  if (!user) {
    generatedPassword = generatePassword();
    user = await User.create({
      name: contact.fullName || `${studentName}'s Guardian`,
      email: email || undefined,
      password: await bcrypt.hash(generatedPassword, 10),
      role: 'Parent',
    });
  }

  let parentProfile = await Parent.findOne({ user: user._id });

  if (!parentProfile && email) {
    parentProfile = await Parent.findOne({ email });
  }

  if (parentProfile) {
    parentProfile.fullName = contact.fullName || parentProfile.fullName;
    parentProfile.email = email || parentProfile.email;
    parentProfile.phone = contact.phone || parentProfile.phone;
    parentProfile.relationship = contact.relationship || parentProfile.relationship;
    parentProfile.address = contact.address || parentProfile.address;
    parentProfile.user = parentProfile.user || user._id;
    if (!parentProfile.children.some((childId) => childId.toString() === student._id.toString())) {
      parentProfile.children.push(student._id);
    }
    await parentProfile.save();
  } else {
    parentProfile = await Parent.create({
      user: user._id,
      parentId: await generateParentId(),
      fullName: contact.fullName || `${studentName}'s Guardian`,
      email: email || undefined,
      phone: contact.phone || undefined,
      relationship: contact.relationship || 'Guardian',
      address: contact.address || undefined,
      children: [student._id],
    });
  }

  await Student.findByIdAndUpdate(student._id, {
    $addToSet: { guardians: parentProfile._id },
    $push: {
      guardianContacts: {
        parent: parentProfile._id,
        fullName: parentProfile.fullName,
        email: parentProfile.email || '',
        phone: parentProfile.phone || '',
        relationship: parentProfile.relationship || 'Guardian',
        address: parentProfile.address || '',
        primary: Boolean(contact.primary),
      },
    },
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
      parent = {},
      parentName,
      parentEmail,
      parentPhone,
      parentRelationship,
      parentAddress,
      dateOfBirth,
      gender,
      phone,
      address,
      fatherName,
      motherName,
      guardianName,
      occupation,
      notes,
    } = req.body;

    const normalizedStudentEmail = normalizeEmail(email);

    if (normalizedStudentEmail) {
      const existingUser = await User.findOne({ email: normalizedStudentEmail });
      if (existingUser) return res.status(400).json({ message: 'Email already exists' });
    }

    const studentPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(studentPassword, 10);

    // Ensure the grade has an associated fee setting if we want strict rules, 
    // or just let them register for now.
    const gradeSettings = await GradeFee.findOne({ grade });
    if (!gradeSettings) {
      return res.status(400).json({ message: `Registrar has not configured settings for Grade: ${grade}` });
    }

    // Generate System ID
    const studentId = await getNextAvailableStudentId();

    // Create User account
    const user = await User.create({
      name,
      email: normalizedStudentEmail || undefined,
      password: hashedPassword,
      role: 'Student'
    });

    const resolvedPersonalDetails = {
      dateOfBirth: personalDetails.dateOfBirth || dateOfBirth || undefined,
      gender: personalDetails.gender || gender || undefined,
      phone: personalDetails.phone || phone || undefined,
      address: personalDetails.address || address || undefined,
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
      return res.status(400).json({
        message: 'At least one guardian contact is required to register a student.',
      });
    }

    // Create Student profile linked to User
    let student;

    try {
      student = await Student.create({
        user: user._id,
        studentId: studentId,
        grade,
        personalDetails: resolvedPersonalDetails,
        familyBackground: resolvedFamilyBackground,
      });
    } catch (createError) {
      if (createError?.code === 11000 && createError?.keyPattern?.studentId) {
        const fallbackStudentId = await getNextAvailableStudentId();
        student = await Student.create({
          user: user._id,
          studentId: fallbackStudentId,
          grade,
          personalDetails: resolvedPersonalDetails,
          familyBackground: resolvedFamilyBackground,
        });
      } else {
        throw createError;
      }
    }

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

    res.status(201).json({ 
      message: 'Student registered successfully', 
      student,
      feeInfo: `Your monthly tuition is ETB ${gradeSettings.amount}`,
      credentials: {
        studentId: student.studentId,
        password: studentPassword,
      },
      guardianCredentials,
      parentCredentials: guardianCredentials[0] || null,
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
    if (req.user?.role === 'Teacher') {
      const Teacher = require('../models/Teacher');
      const TeacherAssignment = require('../models/TeacherAssignment');

      const teacher = await Teacher.findOne({ user: req.user._id });
      if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });

      const assignments = await TeacherAssignment.find({ teacher: teacher._id })
        .populate({
          path: 'class',
          populate: {
            path: 'students',
            populate: { path: 'user', select: 'name email' },
          },
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
          if (student?._id) allowedStudentIds.add(student._id.toString());
        });
      });

      const allStudents = await Student.find().populate('user', 'name email');
      const students = allStudents.filter((student) => {
        if (allowedStudentIds.has(student._id.toString())) return true;

        const gradeNumber = String(student.grade || '').match(/(\d+)/)?.[1];
        return gradeNumber ? allowedClassNumbers.has(gradeNumber) : false;
      });

      return res.status(200).json(students);
    }

    const students = await Student.find()
      .populate('user', 'name email')
      .populate('guardians')
      .populate('guardianContacts.parent');
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set fee amount for a specific grade
// @route   POST /api/students/grade-fee
// @access  Private (Admin/Registrar)
const setGradeFee = async (req, res) => {
  try {
    const { grade, amount } = req.body;
    let gradeFee = await GradeFee.findOne({ grade });
    if (gradeFee) {
      gradeFee.amount = amount;
      await gradeFee.save();
    } else {
      gradeFee = await GradeFee.create({ grade, amount });
    }
    res.status(200).json({ message: 'Grade fee configured successfully', gradeFee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all grade fee settings
// @route   GET /api/students/grade-fee
// @access  Public
const getGradeFees = async (req, res) => {
  try {
    const fees = await GradeFee.find();
    res.status(200).json(fees);
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
    const student = await Student.findById(id)
      .populate('user')
      .populate('guardians')
      .populate('guardianContacts.parent');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const studentId = student._id;
    const parentIds = new Set();

    (student.guardians || []).forEach((parent) => {
      if (parent?._id) parentIds.add(parent._id.toString());
    });

    (student.guardianContacts || []).forEach((contact) => {
      if (contact?.parent?._id) parentIds.add(contact.parent._id.toString());
    });

    await Promise.all([
      Grade.deleteMany({ student: studentId }),
      Fee.deleteMany({ student: studentId }),
      Attendance.updateMany(
        { 'records.student': studentId },
        { $pull: { records: { student: studentId } } },
      ),
      Class.updateMany(
        { students: studentId },
        { $pull: { students: studentId } },
      ),
      TeacherAssignment.updateMany(
        { students: studentId },
        { $pull: { students: studentId } },
      ),
      Parent.updateMany(
        { children: studentId },
        { $pull: { children: studentId } },
      ),
    ]);

    await Attendance.deleteMany({ records: { $size: 0 } });

    for (const parentId of parentIds) {
      const parent = await Parent.findById(parentId).populate('user');
      if (!parent) continue;

      if (!parent.children || parent.children.length === 0) {
        if (parent.user?._id) {
          await User.findByIdAndDelete(parent.user._id);
        }
        await Parent.findByIdAndDelete(parent._id);
      }
    }

    if (student.user?._id) {
      await User.findByIdAndDelete(student.user._id);
    }

    await Student.findByIdAndDelete(studentId);

    res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerStudent, getStudents, setGradeFee, getGradeFees, deleteStudent };