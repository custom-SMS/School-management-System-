const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const { logActivity } = require('../middleware/auditLogger');

// Helper to check if a target user is within the requesting admin's school/branch scope
const isUserInScope = async (reqUser, targetUserId) => {
  if (reqUser.role === 'SuperAdmin') return true;
  if (reqUser.role !== 'Admin') return false;

  const { scopeType, schoolId, branchId } = reqUser;

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      role: true,
      studentProfile: { select: { branchId: true } },
      teacherProfile: { select: { branchId: true } },
      parentProfile: {
        select: {
          children: {
            select: { branchId: true, branch: { select: { schoolId: true } } }
          }
        }
      },
      userScope: {
        select: {
          schoolId: true,
          branchId: true
        }
      }
    }
  });

  if (!targetUser) return false;
  
  // Normal admins cannot manage or view SuperAdmins
  if (targetUser.role === 'SuperAdmin') return false;

  // SchoolAdmin check
  if (scopeType === 'SchoolAdmin' && schoolId) {
    // 1. Target is student in same school
    if (targetUser.studentProfile?.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: targetUser.studentProfile.branchId },
        select: { schoolId: true }
      });
      if (branch?.schoolId === schoolId) return true;
    }
    // 2. Target is teacher in same school
    if (targetUser.teacherProfile?.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: targetUser.teacherProfile.branchId },
        select: { schoolId: true }
      });
      if (branch?.schoolId === schoolId) return true;
    }
    // 3. Target is parent with child in same school
    if (targetUser.parentProfile?.children?.some(c => c.branch?.schoolId === schoolId)) {
      return true;
    }
    // 4. Target has userScope in same school
    if (targetUser.userScope?.some(s => s.schoolId === schoolId)) {
      return true;
    }
  }

  // BranchAdmin/other check
  if (branchId) {
    // 1. Target is student in same branch
    if (targetUser.studentProfile?.branchId === branchId) return true;
    // 2. Target is teacher in same branch
    if (targetUser.teacherProfile?.branchId === branchId) return true;
    // 3. Target is parent with child in same branch
    if (targetUser.parentProfile?.children?.some(c => c.branchId === branchId)) return true;
    // 4. Target has userScope in same branch
    if (targetUser.userScope?.some(s => s.branchId === branchId)) return true;
  }

  return false;
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private (SuperAdmin)
const getUsers = async (req, res) => {
  try {
    const { role, scopeType, schoolId, branchId } = req.user || {};
    
    let where = {};
    
    if (role === 'Admin') {
      if (scopeType === 'SchoolAdmin' && schoolId) {
        where = {
          OR: [
            { studentProfile: { branch: { schoolId } } },
            { teacherProfile: { branch: { schoolId } } },
            { parentProfile: { children: { some: { branch: { schoolId } } } } },
            { userScope: { some: { schoolId } } }
          ]
        };
      } else if (branchId) {
        where = {
          OR: [
            { studentProfile: { branchId } },
            { teacherProfile: { branchId } },
            { parentProfile: { children: { some: { branchId } } } },
            { userScope: { some: { branchId } } }
          ]
        };
      } else {
        where = { id: '__none__' };
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userScope: {
          select: {
            scopeType: true,
            schoolId: true,
            branchId: true,
            levelId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single user details
// @route   GET /api/users/:id
// @access  Private (SuperAdmin)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const hasScope = await isUserInScope(req.user, id);
    if (!hasScope) {
      return res.status(403).json({ message: 'Access Denied. User is outside your scope.' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        studentProfile: {
          select: {
            id: true,
            studentId: true,
            grade: true,
            enrollmentDate: true,
            personalDetails: true,
            familyBackground: true,
            guardianContacts: true,
            guardians: {
              select: {
                id: true,
                parentId: true,
                fullName: true,
                email: true,
                phone: true,
                relationship: true,
                address: true
              }
            },
            enrollments: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                grade: true,
                status: true,
                createdAt: true,
                academicYear: {
                  select: {
                    year: true
                  }
                },
                section: {
                  select: {
                    name: true,
                    class: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        parentProfile: {
          select: {
            id: true,
            parentId: true,
            fullName: true,
            email: true,
            phone: true,
            relationship: true,
            address: true,
            createdAt: true,
            children: {
              select: {
                id: true,
                studentId: true,
                grade: true,
                personalDetails: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    isActive: true
                  }
                }
              }
            }
          }
        },
        teacherProfile: {
          select: {
            id: true,
            teacherId: true,
            subject: true,
            qualification: true,
            department: true,
            status: true,
            hireDate: true,
            classes: {
              select: {
                id: true,
                name: true,
                subject: true,
                schedule: true
              }
            },
            assignments: {
              select: {
                id: true,
                assignmentType: true,
                notes: true,
                createdAt: true,
                class: {
                  select: {
                    name: true,
                    subject: true
                  }
                },
                subject: {
                  select: {
                    name: true,
                    department: true
                  }
                },
                students: {
                  select: {
                    id: true,
                    studentId: true,
                    grade: true,
                    user: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const systemId =
      user.studentProfile?.studentId ||
      user.parentProfile?.parentId ||
      user.teacherProfile?.teacherId ||
      null;

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      systemId,
      studentProfile: user.studentProfile,
      parentProfile: user.parentProfile,
      teacherProfile: user.teacherProfile
    });
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

    const hasScope = await isUserInScope(req.user, id);
    if (!hasScope) {
      return res.status(403).json({ message: 'Access Denied. User is outside your scope.' });
    }

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

    if (updatedUser.role === 'Teacher' && !updatedUser.isActive) {
      const teacherProfile = await prisma.teacher.findUnique({
        where: { userId: updatedUser.id },
        select: { id: true }
      });

      if (teacherProfile) {
        await prisma.section.updateMany({
          where: { homeroomTeacherId: teacherProfile.id },
          data: { homeroomTeacherId: null }
        });
      }
    }

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

    // Only allow Admin -> SuperAdmin promotion
    if (user.role !== 'Admin' || role !== 'SuperAdmin') {
      return res.status(403).json({
        message: 'Only Admin users can be promoted to SuperAdmin.'
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

    const hasScope = await isUserInScope(req.user, id);
    if (!hasScope) {
      return res.status(403).json({ message: 'Access Denied. User is outside your scope.' });
    }

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
  getUserById,
  updateUserStatus,
  updateUserRole,
  resetUserPassword
};
