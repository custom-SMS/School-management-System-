const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Parent = require('../models/Parent');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    const { identifier, email, studentId, password } = req.body;
    const loginValue = identifier || email || studentId;

    let user = null;
    let studentProfile = null;
    let teacherProfile = null;
    let parentProfile = null;

    if (loginValue) {
      user = await User.findOne({ email: loginValue });
    }

    if (!user && loginValue) {
      studentProfile = await Student.findOne({ studentId: loginValue }).populate('user');
      if (studentProfile) {
        user = studentProfile.user;
      }
    }

    if (!user && loginValue) {
      teacherProfile = await Teacher.findOne({ teacherId: loginValue }).populate('user');
      if (teacherProfile) {
        user = teacherProfile.user;
      }
    }

    if (!user && loginValue) {
      parentProfile = await Parent.findOne({ parentId: loginValue }).populate('user');
      if (parentProfile) {
        user = parentProfile.user;
      }
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // 2. Check if password is correct
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // 3. Create and assign a token
    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '1d' }
    );

    const responseUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    if (user.role === 'Student') {
      const student = studentProfile || await Student.findOne({ user: user._id });
      if (student) responseUser.studentId = student.studentId;
    }

    if (user.role === 'Teacher') {
      const teacher = teacherProfile || await Teacher.findOne({ user: user._id });
      if (teacher) responseUser.teacherId = teacher.teacherId;
    }

    if (user.role === 'Parent') {
      const parent = parentProfile || await Parent.findOne({ user: user._id });
      if (parent) responseUser.parentId = parent.parentId;
    }

    // 4. Return token and user details to frontend
    res.json({
      message: 'Logged in successfully',
      token,
      user: responseUser,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const logout = (req, res) => {
  // In a stateless JWT authentication, we don't store tokens on the server.
  // The frontend handles destruction of the token. We'll simulate a success response.
  res.json({ message: 'Logged out successfully' });
};

// Temp function helper to let you seed an admin directly during setup later
const registerInitialAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const admin = new User({
      name,
      email,
      password: hashedPassword,
      role: 'Admin'
    });
    
    await admin.save();
    res.status(201).json({ message: 'Admin user created successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { login, logout, registerInitialAdmin };