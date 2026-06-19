const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditLogController');
const { verifyToken, checkSuperAdminOnly } = require('../middleware/authMiddleware');

// Governance audit trail is restricted to SuperAdmin
router.get('/', verifyToken, checkSuperAdminOnly, getAuditLogs);

module.exports = router;
