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

module.exports = { registerTeacher, getTeachers, deleteTeacher };