/**
 * Historical Edit Protection Middleware
 * 
 * This middleware provides protection for editing historical data.
 * It requires confirmation and logs all historical edits.
 */

const crypto = require('crypto');

/**
 * Generate edit token for historical edits
 */
function generateEditToken(data) {
  const tokenData = {
    ...data,
    timestamp: Date.now(),
    signature: crypto.randomBytes(32).toString('hex')
  };
  return Buffer.from(JSON.stringify(tokenData)).toString('base64');
}

/**
 * Validate edit token
 */
function validateEditToken(token) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const now = Date.now();
    const expiry = 15 * 60 * 1000; // 15 minutes
    
    if (now - decoded.timestamp > expiry) {
      return { valid: false, error: 'Token expired' };
    }
    
    return { valid: true, data: decoded };
  } catch (error) {
    return { valid: false, error: 'Invalid token' };
  }
}

/**
 * Middleware to validate edit token
 */
const validateEditTokenMiddleware = (req, res, next) => {
  const { authorization } = req.headers;
  
  if (!authorization) {
    return res.status(401).json({ message: 'Edit token required' });
  }
  
  const validation = validateEditToken(authorization);
  
  if (!validation.valid) {
    return res.status(401).json({ message: validation.error });
  }
  
  req.editToken = validation.data;
  next();
};

/**
 * Log historical edit to audit log
 */
async function logHistoricalEdit(userId, action, details) {
  const prisma = require('../prisma');
  
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
        ipAddress: details.ipAddress || null,
        userAgent: details.userAgent || null,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error logging historical edit:', error);
  }
}

/**
 * Middleware to log historical edits
 */
const logHistoricalEditMiddleware = async (req, res, next) => {
  const originalJson = res.json;
  
  res.json = async function(data) {
    // Only log successful edits
    if (res.statusCode >= 200 && res.statusCode < 300 && req.isHistoricalEdit) {
      await logHistoricalEdit(req.user._id, 'HISTORICAL_EDIT', {
        model: req.model,
        recordId: req.params.id || req.body.id,
        changes: req.body,
        reason: req.editToken?.reason,
        path: req.path,
        method: req.method,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }
    
    originalJson.call(this, data);
  };
  
  next();
};

/**
 * Require confirmation for historical edits
 */
const requireHistoricalEditConfirmation = (req, res, next) => {
  if (!req.isHistoricalEdit) {
    return next();
  }
  
  const { confirmed, reason } = req.body;
  
  if (!confirmed) {
    return res.status(400).json({
      message: 'Historical edit requires confirmation',
      requiresConfirmation: true
    });
  }
  
  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({
      message: 'Historical edit requires a reason',
      requiresReason: true
    });
  }
  
  next();
};

module.exports = {
  generateEditToken,
  validateEditToken,
  validateEditTokenMiddleware,
  logHistoricalEdit,
  logHistoricalEditMiddleware,
  requireHistoricalEditConfirmation
};
