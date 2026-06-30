const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditLogController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Audit Logs
 *   description: System Audit Trail
 */

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Get system audit logs
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter logs by action string
 *     responses:
 *       200:
 *         description: A paginated list of audit logs
 */
router.get('/', verifyToken, checkRole(['SuperAdmin', 'Admin']), getAuditLogs);

module.exports = router;
