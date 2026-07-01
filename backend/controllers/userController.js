const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const { logActivity } = require('../middleware/auditLogger');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (SuperAdmin)
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Activate or deactivate a user
// @route   PATCH /api/users/:id/status
// @access  Private (SuperAdmin)
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ message: 'isActive status is required.' });
    }

    // Protect from deactivating oneself
    if (id === req.user._id) {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });

    await logActivity(
      req.user._id,
      'Update User Status',
      updatedUser.id,
      `User ${updatedUser.name} (${updatedUser.email}) status changed to ${isActive ? 'Active' : 'Inactive'}`
    );

    res.status(200).json({ message: `User status updated to ${isActive ? 'Active' : 'Inactive'}`, user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Assign/Update user role
// @route   PATCH /api/users/:id/role
// @access  Private (SuperAdmin)
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Role is required.' });
    }

    if (id === req.user._id) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent updating student and parent roles
    if (user.role === 'Student' || user.role === 'Parent') {
      return res.status(403).json({
        message: `${user.role} roles cannot be changed.`
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role }
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset user password
// @route   POST /api/users/:id/reset-password
// @access  Private (SuperAdmin)
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
      select: { id: true, name: true, email: true }
    });

    await logActivity(
      req.user._id,
      'Reset User Password',
      updatedUser.id,
      `Password reset for user ${updatedUser.name} (${updatedUser.email})`
    );

    res.status(200).json({ message: 'Password reset successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  updateUserStatus,
  updateUserRole,
  resetUserPassword
};
