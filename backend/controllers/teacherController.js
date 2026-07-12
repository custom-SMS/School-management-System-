const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const { sendTeacherCredentialsEmail } = require('../utils/emailService');

const generateTeacherId = async (tx = prisma) => {
  // Derive the next ID from the highest existing teacherId rather than count(),
  // so deletions don't cause re-collisions. Zero-padding keeps lexical order
  // aligned with numeric order, so ordering by teacherId desc yields the max.
  const last = await tx.teacher.findFirst({
    where: { teacherId: { startsWith: 'TCH-' } },
    orderBy: { teacherId: 'desc' },
    select: { teacherId: true },
  });

  const lastNum = last ? parseInt(last.teacherId.replace('TCH-', ''), 10) : 0;
  const nextNum = Number.isNaN(lastNum) ? 1 : lastNum + 1;
  return `TCH-${nextNum.toString().padStart(4, '0')}`;
};

const generatePassword = () => crypto.randomBytes(4).toString('hex');

const registerTeacher = async (req, res) => {
  try {
    const { name, email, password, subject } = req.body;

    if (!name || !subject) {
      return res.status(400).json({ message: 'Name and subject are required' });
    }

    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: { email }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const plainPassword = password || generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Generating the teacherId from the current max is racy under concurrent
    // registrations, so retry on a unique-constraint collision (P2002).
    const MAX_ATTEMPTS = 5;
    let teacher;
    let teacherId;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        teacher = await prisma.$transaction(async (tx) => {
          teacherId = await generateTeacherId(tx);

          const user = await tx.user.create({
            data: {
              name,
              email: email || null,
              password: hashedPassword,
              role: 'Teacher',
            }
          });

          return tx.teacher.create({
            data: {
              userId: user.id,
              teacherId,
              subject,
              branchId: req.user?.branchId || process.env.DEFAULT_BRANCH_ID || null,
            },
            include: { user: true }
          });
        }, {
          maxWait: 10000,
          timeout: 20000,
        });
        break;
      } catch (err) {
        const collidedOnTeacherId =
          err.code === 'P2002' && err.meta?.target?.includes?.('teacherId');
        if (collidedOnTeacherId && attempt < MAX_ATTEMPTS) {
          continue;
        }
        throw err;
      }
    }

    const responseTeacher = {
      ...teacher,
      _id: teacher.id,
      user: {
        ...teacher.user,
        _id: teacher.user.id
      }
    };

    // Attempt to email credentials to the teacher if email provided
    let emailStatus = null;
    try {
      if (teacher.user?.email) {
        const emailResult = await sendTeacherCredentialsEmail(teacher.user.email, teacher.user.name || 'Teacher', teacherId, plainPassword);
        emailStatus = { email: teacher.user.email, status: 'sent', resendId: emailResult.id || null };
      }
    } catch (emailErr) {
      console.error('Failed to send teacher credentials email:', emailErr);
      emailStatus = { email: teacher.user?.email || null, status: 'failed', reason: emailErr.message };
    }

    res.status(201).json({
      message: 'Teacher registered successfully',
      teacher: responseTeacher,
      credentials: {
        teacherId,
        password: plainPassword,
      },
      teacherEmailStatus: emailStatus,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTeachers = async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      where: { ...(req.branchFilter || {}) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true
          }
        }
      },
      orderBy: {
        hireDate: 'desc'
      }
    });

    const responseTeachers = teachers.map(t => ({
      ...t,
      _id: t.id,
      user: t.user ? { ...t.user, _id: t.user.id } : null
    }));

    res.json(responseTeachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, subject } = req.body;

    const existingTeacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!existingTeacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (email) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: existingTeacher.userId }
        }
      });

      if (duplicateUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const updatedTeacher = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existingTeacher.userId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email: email || null } : {})
        }
      });

      return tx.teacher.update({
        where: { id },
        data: {
          ...(subject !== undefined ? { subject } : {})
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(
      req.user._id,
      'Update Teacher',
      updatedTeacher.id,
      `Updated teacher ${updatedTeacher.teacherId} (${updatedTeacher.user?.name || 'Unknown'})`
    );

    res.status(200).json({
      message: 'Teacher updated successfully',
      teacher: {
        ...updatedTeacher,
        _id: updatedTeacher.id,
        user: updatedTeacher.user ? { ...updatedTeacher.user, _id: updatedTeacher.user.id } : null
      }
    });
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
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    await prisma.$transaction(async (tx) => {
      // Unset teacher in Class records
      await tx.class.updateMany({
        where: { teacherId: teacher.id },
        data: { teacherId: null }
      });

      // Delete teacher assignments
      await tx.teacherAssignment.deleteMany({
        where: { teacherId: teacher.id }
      });

      // Delete User account (which cascades and deletes Teacher)
      if (teacher.userId) {
        await tx.user.delete({
          where: { id: teacher.userId }
        });
      } else {
        await tx.teacher.delete({
          where: { id: teacher.id }
        });
      }
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    res.status(200).json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerTeacher, getTeachers, updateTeacher, deleteTeacher };
