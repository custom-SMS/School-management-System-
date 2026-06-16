const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const generateTeacherId = async () => {
  const count = await prisma.teacher.count();
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
      const existingUser = await prisma.user.findFirst({
        where: { email }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const teacherId = await generateTeacherId();
    const plainPassword = password || generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const teacher = await prisma.$transaction(async (tx) => {
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
        },
        include: { user: true }
      });
    });

    const responseTeacher = {
      ...teacher,
      _id: teacher.id,
      user: {
        ...teacher.user,
        _id: teacher.user.id
      }
    };

    res.status(201).json({
      message: 'Teacher registered successfully',
      teacher: responseTeacher,
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
    const teachers = await prisma.teacher.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
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
    });

    res.status(200).json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update teacher details
// @route   PUT /api/teachers/:id
// @access  Private (Admin/SuperAdmin)
const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, subject, status, qualification, department } = req.body;

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const updatedTeacher = await prisma.$transaction(async (tx) => {
      // Update user if name or email provided
      if (name || email) {
        const userData = {};
        if (name) userData.name = name;
        if (email !== undefined) {
          const normalizedEmail = String(email || '').trim().toLowerCase();
          if (normalizedEmail && normalizedEmail !== teacher.user?.email) {
            const existingUser = await tx.user.findFirst({
              where: { email: normalizedEmail }
            });
            if (existingUser && existingUser.id !== teacher.userId) {
              throw new Error('Email already exists');
            }
            userData.email = normalizedEmail;
          }
        }
        
        if (Object.keys(userData).length > 0) {
          await tx.user.update({
            where: { id: teacher.userId },
            data: userData
          });
        }
      }

      // Update teacher record
      const teacherData = {};
      if (subject) teacherData.subject = subject;
      if (status) teacherData.status = status;
      if (qualification) teacherData.qualification = qualification;
      if (department) teacherData.department = department;

      const updated = await tx.teacher.update({
        where: { id },
        data: teacherData,
        include: { user: true }
      });

      return updated;
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Update Teacher', teacher.id, `Updated teacher ${teacher.teacherId}`);

    const responseTeacher = {
      ...updatedTeacher,
      _id: updatedTeacher.id,
      user: updatedTeacher.user ? { ...updatedTeacher.user, _id: updatedTeacher.user.id } : null
    };

    res.status(200).json({
      message: 'Teacher updated successfully',
      teacher: responseTeacher
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerTeacher, getTeachers, deleteTeacher, updateTeacher };
