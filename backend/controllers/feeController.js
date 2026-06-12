const prisma = require('../prisma');

// @desc    Record a new payment
// @route   POST /api/fees
// @access  Private (Admin/Bursar)
const recordPayment = async (req, res) => {
  try {
    const { studentId, amount, description, month, dueDate } = req.body;

    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (req.user.role === 'Parent') {
      const parent = await prisma.parent.findFirst({
        where: { userId: req.user._id },
        include: { children: true }
      });
      if (!parent) {
        return res.status(404).json({ message: 'Parent profile not found' });
      }

      const isLinkedChild = parent.children.some((child) => child.id === student.id);
      if (!isLinkedChild) {
        return res.status(403).json({ message: 'You can only pay fees for your linked students.' });
      }
    }

    const fee = await prisma.fee.create({
      data: {
        studentId: studentId,
        amount: Number(amount),
        description,
        month,
        dueDate: new Date(dueDate),
        paid: true, // Assuming this endpoint records actual payments made
        paymentDate: new Date(),
      }
    });

    const responseFee = {
      ...fee,
      _id: fee.id,
      student: fee.studentId
    };

    res.status(201).json(responseFee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get defaulters (students who haven't paid for a specific month)
// @route   GET /api/fees/defaulters/:month
// @access  Private (Admin/Bursar)
const getDefaulters = async (req, res) => {
  try {
    const { month } = req.params;

    // Find all students
    const allStudents = await prisma.student.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Find all fees paid for the specified month
    const paidFees = await prisma.fee.findMany({
      where: {
        month,
        paid: true
      }
    });
    
    // Extract IDs of students who have paid
    const paidStudentIds = paidFees.map(fee => fee.studentId);

    // Filter students who are NOT in the paid list
    const defaulters = allStudents.filter(
      student => !paidStudentIds.includes(student.id)
    );

    const responseDefaulters = defaulters.map(student => ({
      ...student,
      _id: student.id,
      user: student.user ? { ...student.user, _id: student.user.id } : null
    }));

    res.status(200).json(responseDefaulters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get students who paid for a given month within a class
// @route   GET /api/fees/paid/:month/:classId
// @access  Private (Admin/Bursar)
const getPaidStudentsByClass = async (req, res) => {
  try {
    const { month, classId } = req.params;

    const klass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    if (!klass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const studentIds = (klass.students || []).map((student) => student.id);

    const paidFees = await prisma.fee.findMany({
      where: {
        month,
        paid: true,
        studentId: { in: studentIds },
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: [
        { paymentDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const feeByStudentId = new Map();

    paidFees.forEach((fee) => {
      const studentId = fee.student?.id;
      if (!studentId || feeByStudentId.has(studentId)) return;
      feeByStudentId.set(studentId, fee);
    });

    const paidStudents = (klass.students || [])
      .filter((student) => feeByStudentId.has(student.id))
      .map((student) => {
        const fee = feeByStudentId.get(student.id);
        return {
          _id: student.id,
          studentId: student.studentId,
          grade: student.grade,
          user: student.user ? { ...student.user, _id: student.user.id } : null,
          month: fee.month,
          amount: fee.amount,
          description: fee.description,
          paymentDate: fee.paymentDate,
          dueDate: fee.dueDate,
        };
      });

    res.status(200).json({
      classInfo: {
        _id: klass.id,
        name: klass.name,
        subject: klass.subject,
        schedule: klass.schedule,
      },
      month,
      totalStudents: klass.students.length,
      paidCount: paidStudents.length,
      paidStudents,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  recordPayment,
  getDefaulters,
  getPaidStudentsByClass,
};