const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const isProduction = process.env.NODE_ENV === 'production';

// Sanitize errors before sending to client — never expose DB hostnames, file paths, or stack traces
const safeError = (err, res) => {
  console.error('[auth error]', err?.message || err);
  if (err?.message?.includes("Can't reach database") || err?.code === 'P1001') {
    return res.status(503).json({ message: 'Service temporarily unavailable. Please try again shortly.' });
  }
  res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
};

// Shared options for the auth cookie. In production cookies must be Secure + SameSite=None
// to be sent on cross-site requests; in local dev SameSite=Lax over http works.
const AUTH_COOKIE = 'token';
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 1 day, matches the JWT expiry
};

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

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Your account is deactivated. Please contact the school administration.' });
    }

    // 2. Check if password is correct
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Look up UserScope for scoped admin roles
    let scopeType = null;
    let schoolId = null;
    let branchId = null;
    let levelId = null;

    if (['Admin', 'Cashier'].includes(user.role)) {
      const scope = await prisma.userScope.findFirst({
        where: { userId: user.id },
      });
      if (scope) {
        scopeType = scope.scopeType;
        schoolId = scope.schoolId;
        branchId = scope.branchId;
        levelId = scope.levelId;
      }
    }

    // For Teachers, store their branchId too
    if (user.role === 'Teacher' && teacherProfile) {
      branchId = teacherProfile.branchId || process.env.DEFAULT_BRANCH_ID || null;
    }

    // For Students, store their branchId
    if (user.role === 'Student' && studentProfile) {
      branchId = studentProfile.branchId || process.env.DEFAULT_BRANCH_ID || null;
      levelId = studentProfile.levelId || null;
    }

    // 3. Create and assign a token
    const token = jwt.sign(
      {
        _id: user.id,
        role: user.role,
        scopeType,            // null for Teacher/Student/Parent/SuperAdmin
        schoolId,
        branchId,
        levelId,
      },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '1d' }
    );

    const responseUser = {
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      scopeType: scopeType || null,
      schoolId: schoolId || null,
      branchId: branchId || null,
      levelId: levelId || null,
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

    // 4. Store the JWT in an httpOnly cookie and return the (non-sensitive) user details
    res.cookie(AUTH_COOKIE, token, cookieOptions);
    res.json({
      message: 'Logged in successfully',
      user: responseUser,
    });
  } catch (err) {
    safeError(err, res);
  }
};

const logout = (req, res) => {
  // Clear the auth cookie. Options (except maxAge) must match those used when setting it.
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
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
    safeError(err, res);
  }
};

const getRolePermissions = async (req, res) => {
  try {
    const perms = await prisma.rolePermission.findMany();
    res.status(200).json(perms);
  } catch (err) {
    safeError(err, res);
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
    safeError(err, res);
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
    safeError(err, res);
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
