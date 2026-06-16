const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditLogController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Only SuperAdmin and Admin can view the audit trail
router.get('/', verifyToken, checkRole(['SuperAdmin', 'Admin']), getAuditLogs);

module.exports = router;
