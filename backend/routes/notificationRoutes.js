const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, sendParentNotifications, submitStudentRecordRequest, broadcastNotification, getAllNotifications, sendStudentNotifications, sendBothNotifications, getTeachersForStudent, sendParentToTeachers } = require('../controllers/notificationController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getNotifications);
router.get('/all', verifyToken, checkRole(['SuperAdmin']), getAllNotifications);
router.post('/broadcast', verifyToken, checkRole(['SuperAdmin']), broadcastNotification);
router.post('/parents', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), sendParentNotifications);
router.post('/students', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), sendStudentNotifications);
router.post('/both', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), sendBothNotifications);
router.get('/teachers-for-student', verifyToken, checkRole(['Parent', 'Teacher', 'Admin', 'SuperAdmin']), getTeachersForStudent);
router.post('/to-teachers', verifyToken, checkRole(['Parent', 'SuperAdmin']), sendParentToTeachers);
router.post('/student-request', verifyToken, checkRole(['Student']), submitStudentRecordRequest);
router.patch('/:id/read', verifyToken, markAsRead);

module.exports = router;
