const Fee = require('../models/Fee');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const Class = require('../models/Class');

// @desc    Record a new payment
// @route   POST /api/fees
// @access  Private (Admin/Bursar)
const recordPayment = async (req, res) => {
  try {
    const { studentId, amount, description, month, dueDate } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (req.user.role === 'Parent') {
      const parent = await Parent.findOne({ user: req.user._id });
      if (!parent) {
        return res.status(404).json({ message: 'Parent profile not found' });
      }

      const isLinkedChild = parent.children.some((childId) => childId.toString() === student._id.toString());
      if (!isLinkedChild) {
        return res.status(403).json({ message: 'You can only pay fees for your linked students.' });
      }
    }

    const fee = await Fee.create({
      student: studentId,
      amount,
      description,
      month,
      dueDate,
      paid: true, // Assuming this endpoint records actual payments made
      paymentDate: Date.now(),
    });

    res.status(201).json(fee);
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
    const allStudents = await Student.find().populate('user', 'name email');

    // Find all fees paid for the specified month
    const paidFees = await Fee.find({ month, paid: true });
    
    // Extract IDs of students who have paid
    const paidStudentIds = paidFees.map(fee => fee.student.toString());

    // Filter students who are NOT in the paid list
    const defaulters = allStudents.filter(
      student => !paidStudentIds.includes(student._id.toString())
    );

    res.status(200).json(defaulters);
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

    const klass = await Class.findById(classId)
      .populate({
        path: 'students',
        populate: { path: 'user', select: 'name email' },
      });

    if (!klass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const studentIds = (klass.students || []).map((student) => student._id);

    const paidFees = await Fee.find({
      month,
      paid: true,
      student: { $in: studentIds },
    })
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' },
      })
      .sort({ paymentDate: -1, createdAt: -1 });

    const feeByStudentId = new Map();

    paidFees.forEach((fee) => {
      const studentId = fee.student?._id?.toString();
      if (!studentId || feeByStudentId.has(studentId)) return;
      feeByStudentId.set(studentId, fee);
    });

    const paidStudents = (klass.students || [])
      .filter((student) => feeByStudentId.has(student._id.toString()))
      .map((student) => {
        const fee = feeByStudentId.get(student._id.toString());
        return {
          _id: student._id,
          studentId: student.studentId,
          grade: student.grade,
          user: student.user,
          month: fee.month,
          amount: fee.amount,
          description: fee.description,
          paymentDate: fee.paymentDate,
          dueDate: fee.dueDate,
        };
      });

    res.status(200).json({
      classInfo: {
        _id: klass._id,
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