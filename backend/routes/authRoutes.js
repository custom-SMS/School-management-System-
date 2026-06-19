const express = require('express');
const router = express.Router();
const { 
  login, 
  logout, 
  registerInitialAdmin,
  getRolePermissions,
  updateRolePermissions,
  getCurrentUserPermissions
} = require('../controllers/authController');
const { verifyToken, checkRole, checkSuperAdminOnly } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/logout', logout);

// A simple utility endpoint to help you initialize an Admin for the first time.
// Usually you'd remove this or secure it with an environment key.
router.post('/register-admin', registerInitialAdmin);

// Permissions management
router.get('/permissions', verifyToken, checkSuperAdminOnly, getRolePermissions);
router.post('/permissions', verifyToken, checkSuperAdminOnly, updateRolePermissions);
router.get('/permissions/me', verifyToken, getCurrentUserPermissions);

module.exports = router;