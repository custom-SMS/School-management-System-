const express = require('express');
const router = express.Router();
const { 
  recordPayment, 
  getDefaulters, 
  getPaidStudentsByClass,
  createFeeStructure,
  getFeeStructures,
  generateMonthlyFees,
  sendBulkFeeReminders,
  getMyFees,
  submitBankPayment,
  getOutstandingFees,
  getCashierPayments,
  markFeePaidInCash,
  getPendingPayments,
  verifyPayment,
  getReceipt,
  downloadReceiptPdf
} = require('../controllers/feeController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Get/Record direct fee payments (Admins/Bursars/Cashiers)
router.post('/', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), recordPayment);
router.get('/defaulters/:month', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), getDefaulters);
router.get('/paid/:month/:classId', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), getPaidStudentsByClass);

// Fee structures management by grade level (Cashier/Admin/SuperAdmin)
// Only SuperAdmin may create or update fee structures.
router.post('/structures', verifyToken, checkRole(['SuperAdmin']), createFeeStructure);
router.get('/structures', verifyToken, getFeeStructures);

// Generate monthly tuition invoices for all students (Cashier/Admin/SuperAdmin)
router.post('/generate', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), generateMonthlyFees);
router.post('/reminders', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), sendBulkFeeReminders);

// Cashier desk: list outstanding invoices and collect cash against them
router.get('/outstanding', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), getOutstandingFees);
router.get('/payments', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), getCashierPayments);
router.patch('/:feeId/pay', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), markFeePaidInCash);

// Student/Parent fee portal
router.get('/my', verifyToken, checkRole(['Student', 'Parent']), getMyFees);

// Bank payment integration (Students/Parents submit, Cashier verifies)
router.post('/bank-pay', verifyToken, checkRole(['Student', 'Parent', 'SuperAdmin']), submitBankPayment);
router.get('/pending-verifications', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), getPendingPayments);
router.patch('/verify/:paymentId', verifyToken, checkRole(['Cashier', 'SuperAdmin']), verifyPayment);
router.get('/receipts/:paymentId', verifyToken, getReceipt);
router.get('/receipts/:paymentId/pdf', verifyToken, downloadReceiptPdf);

module.exports = router;
