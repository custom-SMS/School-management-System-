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

// @desc    Generate monthly tuition invoices (unpaid Fee records) for all students
// @route   POST /api/fees/generate
// @access  Private (Admin/SuperAdmin/Cashier)
const generateMonthlyFees = async (req, res) => {
  try {
    const { month, dueDate, description } = req.body;
    if (!month) {
      return res.status(400).json({ message: 'month is required.' });
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });

    const feeStructures = await prisma.feeStructure.findMany();
    const feeByGrade = new Map(feeStructures.map((fs) => [String(fs.grade), fs.amount]));

    const students = await prisma.student.findMany({
      select: { id: true, grade: true }
    });

    // Skip students who already have a fee record for this month
    const existingFees = await prisma.fee.findMany({
      where: { month },
      select: { studentId: true }
    });
    const alreadyInvoiced = new Set(existingFees.map((fee) => fee.studentId));

    const resolvedDueDate = dueDate ? new Date(dueDate) : new Date();
    const feeDescription = description || `Monthly Tuition - ${month}`;

    let created = 0;
    let skippedNoFee = 0;

    for (const student of students) {
      if (alreadyInvoiced.has(student.id)) continue;

      const amount = feeByGrade.get(String(student.grade));
      if (amount === undefined) {
        skippedNoFee += 1;
        continue;
      }

      await prisma.fee.create({
        data: {
          studentId: student.id,
          academicYearId: activeYear?.id || null,
          amount: Number(amount),
          description: feeDescription,
          month,
          dueDate: resolvedDueDate,
          paid: false
        }
      });
      created += 1;
    }

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Generate Monthly Invoices', month, `Generated ${created} tuition invoices for ${month}`);

    res.status(201).json({
      message: `Generated ${created} invoice(s) for ${month}.`,
      created,
      skippedExisting: alreadyInvoiced.size,
      skippedNoFeeConfigured: skippedNoFee
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get the logged-in student's (or a linked child's) fees with payment status
// @route   GET /api/fees/my
// @access  Private (Student/Parent)
const getMyFees = async (req, res) => {
  try {
    let studentId;

    if (req.user.role === 'Student') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user._id },
        select: { id: true }
      });
      if (!student) return res.status(404).json({ message: 'Student profile not found.' });
      studentId = student.id;
    } else if (req.user.role === 'Parent') {
      const { childStudentId } = req.query;
      if (!childStudentId) {
        return res.status(400).json({ message: 'childStudentId query parameter is required for parents.' });
      }
      const parent = await prisma.parent.findFirst({
        where: { userId: req.user._id },
        include: { children: { select: { id: true } } }
      });
      if (!parent) return res.status(404).json({ message: 'Parent profile not found.' });
      const isLinked = parent.children.some((child) => child.id === childStudentId);
      if (!isLinked) {
        return res.status(403).json({ message: 'You can only view fees for your linked students.' });
      }
      studentId = childStudentId;
    } else {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const fees = await prisma.fee.findMany({
      where: { studentId },
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const response = fees.map((fee) => {
      const latestPayment = fee.payments[0] || null;
      let status = 'Unpaid';
      if (fee.paid) {
        status = 'Paid';
      } else if (latestPayment?.status === 'Pending') {
        status = 'Pending Verification';
      } else if (latestPayment?.status === 'Rejected') {
        status = 'Rejected';
      }

      return {
        _id: fee.id,
        amount: fee.amount,
        description: fee.description,
        month: fee.month,
        dueDate: fee.dueDate,
        paid: fee.paid,
        status,
        latestPayment: latestPayment
          ? {
              status: latestPayment.status,
              transactionReference: latestPayment.transactionReference,
              bankName: latestPayment.bankName
            }
          : null
      };
    });

    res.status(200).json(response);
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

    // Verify the fee exists and belongs to the requesting student/parent
    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: { student: { select: { id: true, userId: true } } }
    });
    if (!fee) {
      return res.status(404).json({ message: 'Fee record not found.' });
    }
    if (fee.paid) {
      return res.status(400).json({ message: 'This fee has already been paid.' });
    }

    if (req.user.role === 'Student' && fee.student?.userId !== req.user._id) {
      return res.status(403).json({ message: 'You can only pay your own fees.' });
    }
    if (req.user.role === 'Parent') {
      const parent = await prisma.parent.findFirst({
        where: { userId: req.user._id },
        include: { children: { select: { id: true } } }
      });
      const isLinked = parent?.children.some((child) => child.id === fee.student?.id);
      if (!isLinked) {
        return res.status(403).json({ message: 'You can only pay fees for your linked students.' });
      }
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

// @desc    List unpaid invoices (outstanding fees) for the cashier to collect
// @route   GET /api/fees/outstanding
// @access  Private (Admin/SuperAdmin/Cashier)
const getOutstandingFees = async (req, res) => {
  try {
    const { month } = req.query;

    const fees = await prisma.fee.findMany({
      where: {
        paid: false,
        ...(month ? { month } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            grade: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    res.status(200).json(fees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark an existing invoice as paid in cash at the desk (issues a receipt)
// @route   PATCH /api/fees/:feeId/pay
// @access  Private (Admin/SuperAdmin/Cashier)
const markFeePaidInCash = async (req, res) => {
  try {
    const { feeId } = req.params;

    const fee = await prisma.fee.findUnique({ where: { id: feeId } });
    if (!fee) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }
    if (fee.paid) {
      return res.status(400).json({ message: 'This invoice has already been paid.' });
    }

    const transactionReference = `CASH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const receiptNumber = `REC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const result = await prisma.$transaction(async (tx) => {
      await tx.fee.update({
        where: { id: feeId },
        data: { paid: true, paymentDate: new Date() },
      });

      const payment = await tx.payment.create({
        data: {
          feeId,
          amount: fee.amount,
          transactionReference,
          bankName: 'Cash',
          status: 'Verified',
          verifiedById: req.user._id,
          verificationDate: new Date(),
        },
      });

      const receipt = await tx.receipt.create({
        data: {
          receiptNumber,
          paymentId: payment.id,
          issuedById: req.user._id,
        },
      });

      return { payment, receipt };
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Record Cash Payment', feeId, `Collected ETB ${fee.amount} cash for ${fee.month || 'fee'} (Receipt ${receiptNumber})`);

    res.status(200).json({ message: 'Cash payment recorded.', ...result });
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
  generateMonthlyFees,
  getMyFees,
  submitBankPayment,
  getOutstandingFees,
  markFeePaidInCash,
  getPendingPayments,
  verifyPayment,
  getReceipt
};