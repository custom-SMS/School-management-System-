const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_sms_key_2026';

/**
 * Helper to generate JWT test cookies for Supertest requests
 */
function createAuthCookie(userPayload = {}) {
  const payload = {
    _id: 'test-user-id-123',
    role: 'Student',
    scopeType: null,
    schoolId: 'test-school-id-123',
    branchId: 'test-branch-id-123',
    ...userPayload,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  return `token=${token}`;
}

module.exports = { createAuthCookie, JWT_SECRET };
