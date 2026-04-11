const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const TeacherAssignment = require('../models/TeacherAssignment');

const getTeacherProfile = async (userId) => Teacher.findOne({ user: userId });

const populateClassRoster = {
  path: 'students',
  select: 'studentId grade user',
  populate: {
    path: 'user',
    select: 'name email',
  },
};

const populateClassTeacher = {
  path: 'teacher',
  select: 'teacherId subject user',
  populate: {
    path: 'user',
    select: 'name email',
  },
};

const isTeacherAssignedToClass = async (teacherId, classId) => {
  if (!classId) return false;
  const assignment = await TeacherAssignment.findOne({ teacher: teacherId, class: classId });
  if (assignment) return true;

  const klass = await Class.findById(classId);
  return !!klass && !!klass.teacher && klass.teacher.toString() === teacherId.toString();
};

const isTeacherAssignedToStudents = async (teacherId, studentIds = []) => {
  if (!studentIds.length) return false;

  const assignments = await TeacherAssignment.find({ teacher: teacherId }).populate({
    path: 'class',
    select: 'students',
    populate: {
      path: 'students',
      select: '_id',
    },
  });

  const allowed = new Set();
  assignments.forEach((assignment) => {
    (assignment.class?.students || []).forEach((student) => {
      if (student?._id) {
        allowed.add(student._id.toString());
      }
    });
  });

  return studentIds.every((studentId) => allowed.has(studentId.toString()));
};

const resolveTeacherClass = async (teacherId, classId, studentIds = []) => {
  if (classId && classId !== 'General') {
    const klass = await Class.findById(classId);
    if (klass) return klass;
  }

  const assignedClass = await Class.findOne({ teacher: teacherId });
  if (assignedClass) return assignedClass;

  return Class.findOneAndUpdate(
    { name: 'Default', teacher: teacherId, subject: 'General' },
    { name: 'Default', teacher: teacherId, subject: 'General', students: studentIds },
    { upsert: true, new: true }
  );
};

// @desc    Get classroom options for grades/attendance screens
// @route   GET /api/classroom/options
// @access  Private (Teacher/Admin)
const getClassroomOptions = async (req, res) => {
  try {
    let classesQuery = Class.find();

    if (req.user.role !== 'Admin') {
      const teacher = await getTeacherProfile(req.user._id);
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher profile not found' });
      }

      classesQuery = Class.find({ teacher: teacher._id });
    }

    const classes = await classesQuery
      .populate(populateClassTeacher)
      .populate(populateClassRoster)
      .sort({ createdAt: -1 });

    res.status(200).json({ classes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const ensureTeacherAuthorization = async (req, classId, studentIds = []) => {
  if (req.user.role === 'Admin') return { ok: true };

  const teacher = await getTeacherProfile(req.user._id);
  if (!teacher) {
    return { ok: false, status: 404, message: 'Teacher profile not found' };
  }

  if (classId && classId !== 'General') {
    const classAllowed = await isTeacherAssignedToClass(teacher._id, classId);
    if (classAllowed) return { ok: true, teacher };
  }

  const studentAllowed = await isTeacherAssignedToStudents(teacher._id, studentIds);
  if (studentAllowed) return { ok: true, teacher };

  return { ok: false, status: 403, message: 'Access denied. Students/classes are not assigned to this teacher.' };
};

// @desc    Record or update attendance for a class
// @route   POST /api/classroom/attendance
// @access  Private (Teacher/Admin)
const recordAttendance = async (req, res) => {
  try {
    const { classId, date, records, teacherId } = req.body;
    const studentIds = (records || []).map((record) => record.student).filter(Boolean);

    const authorization = await ensureTeacherAuthorization(req, classId, studentIds);
    if (!authorization.ok) {
      return res.status(authorization.status).json({ message: authorization.message });
    }

    const teacherProfile = authorization.teacher || await getTeacherProfile(req.user._id);
    const targetClass = await resolveTeacherClass(teacherProfile?._id || teacherId, classId, studentIds);

    const attendance = await Attendance.create({
      class: targetClass._id,
      date: date || Date.now(),
      records,
      recordedBy: req.user._id,
    });

    res.status(201).json({ message: 'Attendance recorded successfully', attendance });
  } catch (error) {
    console.error('Attendance Error:', error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Bulk save/update grades (like a spreadsheet)
// @route   POST /api/classroom/grades
// @access  Private (Teacher/Admin)
const saveGrades = async (req, res) => {
  try {
    const { classId, subject, teacherId, gradesData } = req.body;
    if (!classId || !subject || !Array.isArray(gradesData)) {
      return res.status(400).json({ message: 'classId, subject, and gradesData are required' });
    }

    const studentIds = (gradesData || []).map((data) => data.student).filter(Boolean);

    const authorization = await ensureTeacherAuthorization(req, classId, studentIds);
    if (!authorization.ok) {
      return res.status(authorization.status).json({ message: authorization.message });
    }

    const teacherProfile = authorization.teacher || await getTeacherProfile(req.user._id);
    
    const results = [];

    for (let data of gradesData) {
      let grade = await Grade.findOne({ student: data.student, class: classId, subject });

      if (grade) {
        grade.marks = data.marks;
        grade.teacher = req.user._id;
        await grade.save();
        results.push(grade);
      } else {
        const newGrade = await Grade.create({
          student: data.student,
          class: classId,
          subject,
          teacher: req.user._id,
          marks: data.marks
        });
        results.push(newGrade);
      }
    }

    res.status(200).json({ message: 'Grades saved successfully', results });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get grades for a specific class and subject
// @route   GET /api/classroom/grades/:classId/:subject
// @access  Private (Teacher/Admin)
const getGrades = async (req, res) => {
  try {
    const { classId, subject } = req.params;

    if (req.user.role !== 'Admin') {
      const teacher = await getTeacherProfile(req.user._id);
      if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });
      const allowed = await isTeacherAssignedToClass(teacher._id, classId);
      if (!allowed) {
        return res.status(403).json({ message: 'Access denied. This class is not assigned to you.' });
      }
    }
    
    const grades = await Grade.find({ class: classId, subject })
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' }
      });

    res.status(200).json(grades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { recordAttendance, saveGrades, getGrades, getClassroomOptions };
