const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const TeacherAssignment = require('../models/TeacherAssignment');

const getAssignmentOptions = async (req, res) => {
  try {
    const teachers = await Teacher.find().populate('user', 'name email');
    const classes = await Class.find().sort({ name: 1 }).populate('teacher', 'teacherId').populate('students', 'studentId');
    const specificClasses = Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`);

    res.json({ teachers, classes, specificClasses });
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

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const classes = normalizedClassIds.length ? await Class.find({ _id: { $in: normalizedClassIds } }) : [];
    if (classes.length !== normalizedClassIds.length) {
      return res.status(404).json({ message: 'One or more classes were not found' });
    }

    const specificClassDocs = [];
    for (const className of normalizedSpecificClassNames) {
      const existingClass = await Class.findOne({ name: className });
      if (existingClass) {
        specificClassDocs.push(existingClass);
        continue;
      }

      const createdClass = await Class.create({
        name: className,
        subject: 'General',
      });
      specificClassDocs.push(createdClass);
    }

    const resolvedClasses = [...classes, ...specificClassDocs];
    const assignments = [];
    for (const selectedClass of resolvedClasses) {
      const selectedClassId = selectedClass._id;
      let assignment = await TeacherAssignment.findOne({ teacher: teacherId, class: selectedClassId });

      if (assignment) {
        assignment.notes = notes;
        await assignment.save();
      } else {
        assignment = await TeacherAssignment.create({
          teacher: teacherId,
          class: selectedClassId,
          notes,
          assignedBy: req.user._id,
        });
      }

      await Class.findByIdAndUpdate(selectedClassId, {
        teacher: teacherId,
      });
      assignments.push(assignment);
    }

    res.status(201).json({ message: 'Teacher assignment saved successfully', assignments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyAssignments = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found' });
    }

    const assignments = await TeacherAssignment.find({ teacher: teacher._id })
      .populate({
        path: 'class',
        select: 'name subject schedule students',
        populate: {
          path: 'students',
          select: 'studentId grade user',
          populate: { path: 'user', select: 'name email' },
        },
      });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllAssignments = async (req, res) => {
  try {
    const assignments = await TeacherAssignment.find()
      .populate({ path: 'teacher', populate: { path: 'user', select: 'name email' } })
      .populate({
        path: 'class',
        select: 'name subject schedule students',
        populate: {
          path: 'students',
          select: 'studentId grade user',
          populate: { path: 'user', select: 'name email' },
        },
      });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAssignmentOptions, createAssignment, getMyAssignments, getAllAssignments };