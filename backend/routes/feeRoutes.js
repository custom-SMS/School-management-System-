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

/**
 * @swagger
 * tags:
 *   name: Fees
 *   description: Financial Management and Payments
 */

/**
 * @swagger
 * /fees:
 *   post:
 *     summary: Record a direct fee payment
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentId:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               month:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Payment recorded
 */
router.post('/', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), recordPayment);

/**
 * @swagger
 * /fees/defaulters/{month}:
 *   get:
 *     summary: Get defaulters for a specific month
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of defaulters
 */
router.get('/defaulters/:month', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), getDefaulters);

/**
 * @swagger
 * /fees/paid/{month}/{classId}:
 *   get:
 *     summary: Get paid students for a specific month and class
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of paid students
 */
router.get('/paid/:month/:classId', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), getPaidStudentsByClass);

// Fee structures management by grade level

/**
 * @swagger
 * /fees/structures:
 *   post:
 *     summary: Create a fee structure for a grade
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               grade:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Fee structure created
 */
router.post('/structures', verifyToken, checkRole(['SuperAdmin']), createFeeStructure);

/**
 * @swagger
 * /fees/structures:
 *   get:
 *     summary: Get all fee structures
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of fee structures
 */
router.get('/structures', verifyToken, getFeeStructures);

// Generate monthly tuition invoices

/**
 * @swagger
 * /fees/generate:
 *   post:
 *     summary: Generate monthly tuition invoices for all students
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               month:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invoices generated
 */
router.post('/generate', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), generateMonthlyFees);

/**
 * @swagger
 * /fees/reminders:
 *   post:
 *     summary: Send bulk fee reminders
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Reminders sent
 */
router.post('/reminders', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), sendBulkFeeReminders);

// Cashier desk

/**
 * @swagger
 * /fees/outstanding:
 *   get:
 *     summary: List outstanding invoices
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of outstanding invoices
 */
router.get('/outstanding', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), getOutstandingFees);

/**
 * @swagger
 * /fees/{feeId}/pay:
 *   patch:
 *     summary: Mark fee paid in cash
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: feeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fee marked as paid
 */
router.get('/payments', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), getCashierPayments);

router.patch('/:feeId/pay', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), markFeePaidInCash);

// Student/Parent fee portal

/**
 * @swagger
 * /fees/my:
 *   get:
 *     summary: Get fees for logged-in student or parent's child
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: childStudentId
 *         schema:
 *           type: string
 *         description: Required for Parent role
 *     responses:
 *       200:
 *         description: List of fees
 */
router.get('/my', verifyToken, checkRole(['Student', 'Parent']), getMyFees);

// Bank payment integration

/**
 * @swagger
 * /fees/bank-pay:
 *   post:
 *     summary: Submit a bank payment for verification
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               feeId:
 *                 type: string
 *               amount:
 *                 type: number
 *               transactionReference:
 *                 type: string
 *               bankName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bank payment submitted
 */
router.post('/bank-pay', verifyToken, checkRole(['Student', 'Parent', 'SuperAdmin']), submitBankPayment);

/**
 * @swagger
 * /fees/pending-verifications:
 *   get:
 *     summary: Get pending bank payments
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of pending payments
 */
router.get('/pending-verifications', verifyToken, checkRole(['Admin', 'SuperAdmin', 'Cashier']), getPendingPayments);

/**
 * @swagger
 * /fees/verify/{paymentId}:
 *   patch:
 *     summary: Verify a bank payment
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Verified, Rejected]
 *     responses:
 *       200:
 *         description: Payment verified
 */
router.patch('/verify/:paymentId', verifyToken, checkRole(['Cashier', 'SuperAdmin']), verifyPayment);

/**
 * @swagger
 * /fees/receipts/{paymentId}:
 *   get:
 *     summary: Get receipt for a payment
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Receipt details
 */
router.get('/receipts/:paymentId', verifyToken, getReceipt);

/**
 * @swagger
 * /fees/receipts/{paymentId}/pdf:
 *   get:
 *     summary: Download receipt PDF
 *     tags: [Fees]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF file stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/receipts/:paymentId/pdf', verifyToken, downloadReceiptPdf);

module.exports = router;
