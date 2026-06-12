const express = require('express');
const router = express.Router();
const { 
  recordPayment, 
  getDefaulters, 
  getPaidStudentsByClass,
  createFeeStructure,
  getFeeStructures,
  submitBankPayment,
  getPendingPayments,
  verifyPayment,
  getReceipt
} = require('../controllers/feeController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Get/Record direct fee payments (Admins/Bursars/Cashiers)
router.post('/', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), recordPayment);
router.get('/defaulters/:month', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), getDefaulters);
router.get('/paid/:month/:classId', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), getPaidStudentsByClass);

// Fee structures management by grade level (Cashier/Admin/SuperAdmin)
router.post('/structures', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), createFeeStructure);
router.get('/structures', verifyToken, getFeeStructures);

// Bank payment integration (Students/Parents submit, Cashier verifies)
router.post('/bank-pay', verifyToken, checkRole(['Student', 'Parent', 'SuperAdmin']), submitBankPayment);
router.get('/pending-verifications', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), getPendingPayments);
router.patch('/verify/:paymentId', verifyToken, checkRole(['Cashier', 'SuperAdmin']), verifyPayment);
router.get('/receipts/:paymentId', verifyToken, getReceipt);

module.exports = router;