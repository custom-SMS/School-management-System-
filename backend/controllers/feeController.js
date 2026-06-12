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

    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });

    const fee = await prisma.fee.create({
      data: {
        studentId: studentId,
        academicYearId: activeYear?.id || null,
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

const createFeeStructure = async (req, res) => {
  try {
    const { grade, amount, description } = req.body;
    if (!grade || !amount) {
      return res.status(400).json({ message: 'Grade and amount are required.' });
    }

    const feeStructure = await prisma.feeStructure.upsert({
      where: { grade },
      update: { amount: Number(amount), description },
      create: { grade, amount: Number(amount), description }
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Set Fee Structure', feeStructure.id, `Set tuition for Grade ${grade} to ETB ${amount}`);

    res.status(200).json(feeStructure);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFeeStructures = async (req, res) => {
  try {
    const structures = await prisma.feeStructure.findMany({
      orderBy: { grade: 'asc' }
    });
    res.status(200).json(structures);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitBankPayment = async (req, res) => {
  try {
    const { feeId, amount, transactionReference, bankName } = req.body;

    if (!feeId || !amount || !transactionReference || !bankName) {
      return res.status(400).json({ message: 'feeId, amount, transactionReference, and bankName are required.' });
    }

    // Check unique transaction reference
    const existingPayment = await prisma.payment.findUnique({
      where: { transactionReference }
    });
    if (existingPayment) {
      return res.status(400).json({ message: 'This transaction reference has already been submitted.' });
    }

    const payment = await prisma.payment.create({
      data: {
        feeId,
        amount: Number(amount),
        transactionReference,
        bankName,
        status: 'Pending'
      }
    });

    res.status(201).json({ message: 'Payment submitted for verification.', payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPendingPayments = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { status: 'Pending' },
      include: {
        fee: {
          include: {
            student: {
              include: {
                user: { select: { name: true, email: true } }
              }
            }
          }
        }
      },
      orderBy: { paymentDate: 'asc' }
    });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body; // 'Verified' or 'Rejected'

    if (!['Verified', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be Verified or Rejected.' });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { fee: true }
    });
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
    }

    const updatedPayment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status,
          verifiedById: req.user._id,
          verificationDate: new Date()
        }
      });

      if (status === 'Verified') {
        // Update corresponding fee
        await tx.fee.update({
          where: { id: payment.feeId },
          data: {
            paid: true,
            paymentDate: new Date()
          }
        });

        // Generate receipt
        const receiptNumber = `REC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        await tx.receipt.create({
          data: {
            receiptNumber,
            paymentId,
            issuedById: req.user._id
          }
        });
      }

      return p;
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, `${status} Payment`, paymentId, `${status} payment of ETB ${payment.amount} with Ref: ${payment.transactionReference}`);

    res.status(200).json({ message: `Payment is now ${status}.`, payment: updatedPayment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const receipt = await prisma.receipt.findUnique({
      where: { paymentId },
      include: {
        payment: {
          include: {
            fee: {
              include: {
                student: {
                  include: {
                    user: { select: { name: true } }
                  }
                }
              }
            }
          }
        },
        issuedBy: { select: { name: true } }
      }
    });

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found.' });
    }

    res.status(200).json(receipt);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  recordPayment,
  getDefaulters,
  getPaidStudentsByClass,
  createFeeStructure,
  getFeeStructures,
  submitBankPayment,
  getPendingPayments,
  verifyPayment,
  getReceipt
};