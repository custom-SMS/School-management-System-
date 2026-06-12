const prisma = require('../prisma');

const logActivity = async (userId, action, affectedRecord = null, details = null) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        affectedRecord,
        details: details ? String(details) : null
      }
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
};

module.exports = { logActivity };
