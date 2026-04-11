const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const TeacherAssignment = require('../models/TeacherAssignment');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const generateTeacherId = async () => {
  const count = await Teacher.countDocuments();
  return `TCH-${(count + 1).toString().padStart(4, '0')}`;
};

const generatePassword = () => crypto.randomBytes(4).toString('hex');

const registerTeacher = async (req, res) => {
  try {
    const { name, email, password, subject } = req.body;

    if (!name || !subject) {
      return res.status(400).json({ message: 'Name and subject are required' });
    }

    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const teacherId = await generateTeacherId();
    const plainPassword = password || generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = await User.create({
      name,
      email: email || undefined,
      password: hashedPassword,
      role: 'Teacher',
    });

    const teacher = await Teacher.create({
      user: user._id,
      teacherId,
      subject,
    });

    res.status(201).json({
      message: 'Teacher registered successfully',
      teacher,
      credentials: {
        teacherId,
        password: plainPassword,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find()
      .populate('user', 'name email role')
      .sort({ hireDate: -1 });

    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a teacher and clean up assignments
// @route   DELETE /api/teachers/:id
// @access  Private (Admin)
const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findById(id).populate('user', 'name email role');

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    await Promise.all([
      Class.updateMany(
        { teacher: teacher._id },
        { $unset: { teacher: '' } },
      ),
      TeacherAssignment.deleteMany({ teacher: teacher._id }),
    ]);

    await Teacher.findByIdAndDelete(teacher._id);

    res.status(200).json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerTeacher, getTeachers, deleteTeacher };