const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllAsRead, sendParentNotifications, submitStudentRecordRequest, broadcastNotification, getAllNotifications, sendStudentNotifications, sendBothNotifications, getTeachersForStudent, sendParentToTeachers, sendSmsToParents } = require('../controllers/notificationController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification Management
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get notifications for the current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/', verifyToken, getNotifications);

/**
 * @swagger
 * /notifications/all:
 *   get:
 *     summary: Get all system notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all notifications
 */
router.get('/all', verifyToken, checkRole(['SuperAdmin']), getAllNotifications);

/**
 * @swagger
 * /notifications/broadcast:
 *   post:
 *     summary: Broadcast a notification to all users
 *     tags: [Notifications]
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
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification broadcasted
 */
router.post('/broadcast', verifyToken, checkRole(['SuperAdmin']), broadcastNotification);

/**
 * @swagger
 * /notifications/parents:
 *   post:
 *     summary: Send notification to parents
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Notification sent
 */
router.post('/parents', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), sendParentNotifications);

/**
 * @swagger
 * /notifications/sms/parents:
 *   post:
 *     summary: Send SMS notification to parents
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: SMS sent
 */
router.post('/sms/parents', verifyToken, checkRole(['Admin', 'SuperAdmin']), sendSmsToParents);

/**
 * @swagger
 * /notifications/students:
 *   post:
 *     summary: Send notification to students
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Notification sent
 */
router.post('/students', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), sendStudentNotifications);

/**
 * @swagger
 * /notifications/both:
 *   post:
 *     summary: Send notification to both parents and students
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Notification sent
 */
router.post('/both', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), sendBothNotifications);

/**
 * @swagger
 * /notifications/teachers-for-student:
 *   get:
 *     summary: Get teachers for a student
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of teachers
 */
router.get('/teachers-for-student', verifyToken, checkRole(['Parent', 'Teacher', 'Admin', 'SuperAdmin']), getTeachersForStudent);

/**
 * @swagger
 * /notifications/to-teachers:
 *   post:
 *     summary: Send notification from parent to teachers
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Notification sent
 */
router.post('/to-teachers', verifyToken, checkRole(['Parent', 'SuperAdmin']), sendParentToTeachers);

/**
 * @swagger
 * /notifications/student-request:
 *   post:
 *     summary: Submit a record request from student
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Request submitted
 */
router.post('/student-request', verifyToken, checkRole(['Student']), submitStudentRecordRequest);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.patch('/:id/read', verifyToken, markAsRead);
router.patch('/read-all', verifyToken, markAllAsRead);

module.exports = router;
