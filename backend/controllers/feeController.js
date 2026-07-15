const prisma = require('../prisma');
const { generateReceiptPdf } = require('../utils/receiptGenerator');

const normalizeGradeKey = (grade) => {
  const number = String(grade || '').match(/\d+/)?.[0];
  return number || String(grade || '').trim().toLowerCase();
};

const notifyFeeAudience = async ({ student, title, message, type = 'Fee' }) => {
  const notifications = [];

  if (student.user?.id) {
    notifications.push({
      userId: student.user.id,
      title,
      message,
      type
    });
  }

  (student.guardians || []).forEach((guardian) => {
    if (guardian.user?.id) {
      notifications.push({
        userId: guardian.user.id,
        title,
        message: `${student.user?.name || student.studentId}: ${message}`,
        type
      });
    }
  });

  if (notifications.length) {
    await prisma.notification.createMany({ data: notifications });
  }
};

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

    // Branch-scoped users (BranchAdmin, BranchCashier) can only record payments
    // for students in their own branch.
    if (req.branchFilter && req.branchFilter.branchId && req.branchFilter.branchId !== '__none__') {
      if (student.branchId !== req.branchFilter.branchId) {
        return res.status(403).json({ message: 'Access denied. Student does not belong to your branch.' });
      }
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
      where: { ...(req.branchFilter || {}) },
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
    const { grade: rawGrade, amount, description } = req.body;
    if (!rawGrade || !amount) {
      return res.status(400).json({ message: 'Grade and amount are required.' });
    }

    // Normalize grade string to prevent case/spacing duplicates
    const grade = String(rawGrade).trim();

    // Check if a fee for this grade already exists (case-insensitive check)
    const existing = await prisma.feeStructure.findFirst({
      where: { grade: { equals: grade, mode: 'insensitive' } }
    });

    let feeStructure;
    if (existing) {
      // Update the existing record using its actual stored grade key
      feeStructure = await prisma.feeStructure.update({
        where: { id: existing.id },
        data: { amount: Number(amount), description }
      });
    } else {
      feeStructure = await prisma.feeStructure.create({
        data: { grade, amount: Number(amount), description }
      });
    }

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Set Fee Structure', feeStructure.id, `Set tuition for ${grade} to ETB ${amount}`);

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

const deleteFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.feeStructure.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Fee structure not found.' });
    }
    await prisma.feeStructure.delete({ where: { id } });
    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Delete Fee Structure', id, `Deleted fee structure for ${existing.grade}`);
    res.status(200).json({ message: `Fee structure for ${existing.grade} deleted.` });
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
    const feeByGrade = new Map(feeStructures.map((fs) => [normalizeGradeKey(fs.grade), fs.amount]));

    const students = await prisma.student.findMany({
      where: { ...(req.branchFilter || {}) },
      select: {
        id: true,
        studentId: true,
        grade: true,
        user: { select: { id: true, name: true } },
        guardians: {
          include: {
            user: { select: { id: true } }
          }
        }
      }
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

      const amount = feeByGrade.get(normalizeGradeKey(student.grade));
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
      await notifyFeeAudience({
        student,
        title: 'New Tuition Invoice',
        message: `${feeDescription} invoice for ${month} has been issued. Amount: ETB ${Number(amount).toFixed(2)}. Due date: ${resolvedDueDate.toLocaleDateString()}.`,
        type: 'Invoice'
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

const sendBulkFeeReminders = async (req, res) => {
  try {
    const { month, message } = req.body;
    if (!month) {
      return res.status(400).json({ message: 'month is required.' });
    }

    const fees = await prisma.fee.findMany({
      where: {
        month,
        paid: false,
        student: { ...(req.branchFilter || {}) }
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true } },
            guardians: {
              include: {
                user: { select: { id: true } }
              }
            }
          }
        }
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }]
    });

    if (!fees.length) {
      return res.status(404).json({ message: `No unpaid invoices found for ${month}. Generate invoices first if needed.` });
    }

    const notifications = [];
    const fallbackMessage = `Please settle your unpaid ${month} tuition invoice. Contact the cashier office if you already paid.`;

    fees.forEach((fee) => {
      const text = `${message || fallbackMessage} Amount due: ETB ${Number(fee.amount || 0).toFixed(2)}.`;
      if (fee.student?.user?.id) {
        notifications.push({
          userId: fee.student.user.id,
          title: 'Tuition Payment Reminder',
          message: text,
          type: 'FeeReminder'
        });
      }

      (fee.student?.guardians || []).forEach((guardian) => {
        if (guardian.user?.id) {
          notifications.push({
            userId: guardian.user.id,
            title: 'Tuition Payment Reminder',
            message: `${fee.student?.user?.name || 'Student'}: ${text}`,
            type: 'FeeReminder'
          });
        }
      });
    });

    if (!notifications.length) {
      return res.status(404).json({ message: 'No student or parent portal accounts are linked to these unpaid invoices.' });
    }

    await prisma.notification.createMany({ data: notifications });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(req.user._id, 'Send Bulk Fee Reminders', month, `Sent ${notifications.length} fee reminder notifications for ${month}`);

    res.status(201).json({
      message: `Sent ${notifications.length} reminder notification${notifications.length === 1 ? '' : 's'} for ${fees.length} unpaid invoice${fees.length === 1 ? '' : 's'}.`,
      notifications: notifications.length,
      invoices: fees.length
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
            id: latestPayment.id,
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
    const { feeId, amount, transactionReference, bankName, receiptImageUrl } = req.body;

    if (!feeId || !amount || !transactionReference || !bankName) {
      return res.status(400).json({ message: 'feeId, amount, transactionReference, and bankName are required.' });
    }

    // Verify the fee exists and belongs to the requesting student/parent
    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: {
        student: {
          select: {
            id: true,
            userId: true,
            studentId: true,
            branchId: true,
            user: { select: { name: true } }
          }
        }
      }
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
        receiptImageUrl: receiptImageUrl || null,
        status: 'Pending'
      }
    });

    const cashiers = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'SuperAdmin' },
          {
            role: { in: ['Cashier', 'Admin'] },
            userScope: {
              some: {
                branchId: fee.student?.branchId
              }
            }
          }
        ]
      },
      select: { id: true }
    });

    if (cashiers.length) {
      await prisma.notification.createMany({
        data: cashiers.map((cashier) => ({
          userId: cashier.id,
          title: 'Payment Verification Needed',
          message: `From: ${fee.student?.user?.name || 'Student'} (${fee.student?.studentId || ''})\nInvoice: ${fee.description || 'Tuition'} - ${fee.month || ''}\nAmount: ETB ${Number(amount).toFixed(2)}\nBank: ${bankName}\nReference: ${transactionReference}`,
          type: 'PaymentVerification'
        }))
      });
    }

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
    const { month, q, grade, page = 1, limit = 10 } = req.query;
    const currentPage = Math.max(Number(page) || 1, 1);
    const take = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (currentPage - 1) * take;

    const where = {
      paid: false,
      ...(month ? { month } : {}),
      ...(grade
        ? { student: { grade: { contains: String(grade).trim(), mode: 'insensitive' } } }
        : {}),
    };

    if (req.branchFilter && Object.keys(req.branchFilter).length > 0) {
      where.student = { ...(where.student || {}), ...req.branchFilter };
    }

    if (q) {
      const query = String(q).trim();
      where.OR = [
        { description: { contains: query, mode: 'insensitive' } },
        { month: { contains: query, mode: 'insensitive' } },
        { student: { studentId: { contains: query, mode: 'insensitive' } } },
        { student: { grade: { contains: query, mode: 'insensitive' } } },
        { student: { user: { name: { contains: query, mode: 'insensitive' } } } },
      ];
    }

    const [totalItems, fees] = await Promise.all([
      prisma.fee.count({ where }),
      prisma.fee.findMany({
        where,
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
        skip,
        take,
      }),
    ]);

    res.status(200).json({
      items: fees,
      pagination: {
        page: currentPage,
        limit: take,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / take)),
      },
    });
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

    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: { student: { select: { branchId: true } } }
    });
    if (!fee) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }
    if (fee.paid) {
      return res.status(400).json({ message: 'This invoice has already been paid.' });
    }

    // Branch-scoped users can only mark fees paid for students in their own branch.
    if (req.branchFilter && req.branchFilter.branchId && req.branchFilter.branchId !== '__none__') {
      if (fee.student?.branchId !== req.branchFilter.branchId) {
        return res.status(403).json({ message: 'Access denied. This invoice does not belong to your branch.' });
      }
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
      where: { 
        status: 'Pending',
        fee: { student: { ...(req.branchFilter || {}) } }
      },
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

const getCashierPayments = async (req, res) => {
  try {
    const { status, month, q, limit = 50 } = req.query;
    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);

    const where = {};

    if (req.branchFilter && Object.keys(req.branchFilter).length > 0) {
      where.fee = { student: { ...req.branchFilter } };
    }

    if (status && ['Pending', 'Verified', 'Rejected'].includes(status)) {
      where.status = status;
    }

    if (month) {
      where.fee = { ...(where.fee || {}), month };
    }

    if (q) {
      const query = String(q).trim();
      where.OR = [
        { transactionReference: { contains: query, mode: 'insensitive' } },
        { bankName: { contains: query, mode: 'insensitive' } },
        { fee: { description: { contains: query, mode: 'insensitive' } } },
        { fee: { month: { contains: query, mode: 'insensitive' } } },
        { fee: { student: { studentId: { contains: query, mode: 'insensitive' } } } },
        { fee: { student: { user: { name: { contains: query, mode: 'insensitive' } } } } },
      ];
    }

    const [totalItems, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: {
          fee: {
            include: {
              student: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
          receipt: {
            select: {
              id: true,
              receiptNumber: true,
              createdAt: true,
            },
          },
          verifiedBy: { select: { id: true, name: true } },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take,
      }),
    ]);

    res.status(200).json({
      items: payments,
      pagination: {
        page: currentPage,
        limit: take,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / take)),
      },
    });
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
      include: { fee: { include: { student: { select: { branchId: true } } } } }
    });
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
    }

    // Branch-scoped users can only verify payments for students in their own branch.
    if (req.branchFilter && req.branchFilter.branchId && req.branchFilter.branchId !== '__none__') {
      if (payment.fee?.student?.branchId !== req.branchFilter.branchId) {
        return res.status(403).json({ message: 'Access denied. This payment does not belong to your branch.' });
      }
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

// @desc    Download receipt as PDF
// @route   GET /api/fees/receipts/:paymentId/pdf
// @access  Private (Student/Parent/Cashier/Admin)
const downloadReceiptPdf = async (req, res) => {
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

    const studentId = receipt.payment?.fee?.student?.id;

    if (req.user.role === 'Student') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user._id },
        select: { id: true }
      });

      if (!student || student.id !== studentId) {
        return res.status(403).json({ message: 'You can only download your own receipts.' });
      }
    } else if (req.user.role === 'Parent') {
      const parent = await prisma.parent.findFirst({
        where: { userId: req.user._id },
        include: { children: { select: { id: true } } }
      });

      const isLinked = parent?.children.some((child) => child.id === studentId);
      if (!isLinked) {
        return res.status(403).json({ message: 'You can only download receipts for your linked students.' });
      }
    }

    // Fetch school settings for branding
    const settingsRows = await prisma.systemSetting.findMany({
      where: { key: 'branding' }
    });
    let schoolSettings = {};
    if (settingsRows.length > 0) {
      schoolSettings = { branding: settingsRows[0].value };
    }

    // Generate PDF
    const pdfBuffer = await generateReceiptPdf({
      receipt,
      payment: receipt.payment,
      fee: receipt.payment.fee,
      student: receipt.payment.fee.student,
      issuedBy: receipt.issuedBy
    }, schoolSettings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${receipt.receiptNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  recordPayment,
  getDefaulters,
  getPaidStudentsByClass,
  createFeeStructure,
  deleteFeeStructure,
  getFeeStructures,
  generateMonthlyFees,
  sendBulkFeeReminders,
  getMyFees,
  submitBankPayment,
  getOutstandingFees,
  markFeePaidInCash,
  getPendingPayments,
  getCashierPayments,
  verifyPayment,
  getReceipt,
  downloadReceiptPdf
};
