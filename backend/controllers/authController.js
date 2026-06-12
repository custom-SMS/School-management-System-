const prisma = require('../prisma');
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
      user = await prisma.user.findFirst({
        where: { email: loginValue }
      });
    }

    if (!user && loginValue) {
      studentProfile = await prisma.student.findFirst({
        where: { studentId: loginValue },
        include: { user: true }
      });
      if (studentProfile) {
        user = studentProfile.user;
      }
    }

    if (!user && loginValue) {
      teacherProfile = await prisma.teacher.findFirst({
        where: { teacherId: loginValue },
        include: { user: true }
      });
      if (teacherProfile) {
        user = teacherProfile.user;
      }
    }

    if (!user && loginValue) {
      parentProfile = await prisma.parent.findFirst({
        where: { parentId: loginValue },
        include: { user: true }
      });
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
      { _id: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '1d' }
    );

    const responseUser = {
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    if (user.role === 'Student') {
      const student = studentProfile || await prisma.student.findFirst({
        where: { userId: user.id }
      });
      if (student) responseUser.studentId = student.studentId;
    }

    if (user.role === 'Teacher') {
      const teacher = teacherProfile || await prisma.teacher.findFirst({
        where: { userId: user.id }
      });
      if (teacher) responseUser.teacherId = teacher.teacherId;
    }

    if (user.role === 'Parent') {
      const parent = parentProfile || await prisma.parent.findFirst({
        where: { userId: user.id }
      });
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

const registerInitialAdmin = async (req, res) => {
  try {
    const { name, email, password, role = 'Admin' } = req.body;
    
    const existingUser = await prisma.user.findFirst({
      where: { email }
    });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role
      }
    });
    
    res.status(201).json({ message: `${role} user created successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getRolePermissions = async (req, res) => {
  try {
    const perms = await prisma.rolePermission.findMany();
    res.status(200).json(perms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateRolePermissions = async (req, res) => {
  try {
    const { role, permissions } = req.body;
    const { logActivity } = require('../middleware/auditLogger');

    // Delete existing permissions for this role
    await prisma.rolePermission.deleteMany({
      where: { role }
    });

    // Insert new permissions
    if (Array.isArray(permissions) && permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissions.map(permission => ({
          role,
          permission
        }))
      });
    }

    await logActivity(req.user._id, 'Update Permissions', role, `Updated permissions to: ${permissions.join(', ')}`);

    res.status(200).json({ message: `Permissions for role ${role} updated successfully.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getCurrentUserPermissions = async (req, res) => {
  try {
    if (req.user.role === 'SuperAdmin') {
      return res.json({ permissions: ["*"] });
    }
    const perms = await prisma.rolePermission.findMany({
      where: { role: req.user.role }
    });
    res.json({ permissions: perms.map(p => p.permission) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { 
  login, 
  logout, 
  registerInitialAdmin, 
  getRolePermissions, 
  updateRolePermissions, 
  getCurrentUserPermissions 
};