const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, sendParentNotifications, submitStudentRecordRequest, broadcastNotification, getAllNotifications } = require('../controllers/notificationController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getNotifications);
router.get('/all', verifyToken, checkRole(['SuperAdmin']), getAllNotifications);
router.post('/broadcast', verifyToken, checkRole(['SuperAdmin']), broadcastNotification);
router.post('/parents', verifyToken, checkRole(['Teacher', 'Admin', 'SuperAdmin']), sendParentNotifications);
router.post('/student-request', verifyToken, checkRole(['Student']), submitStudentRecordRequest);
router.patch('/:id/read', verifyToken, markAsRead);

module.exports = router;
