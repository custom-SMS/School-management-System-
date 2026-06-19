const express = require('express');
const router = express.Router();
const {
  getUsers,
  updateUserStatus,
  updateUserRole,
  resetUserPassword
} = require('../controllers/userController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Super Admin only routes
router.use(verifyToken, checkRole(['SuperAdmin']));

router.route('/')
  .get(getUsers);

router.route('/:id/status')
  .patch(updateUserStatus);

router.route('/:id/role')
  .patch(updateUserRole);

router.route('/:id/reset-password')
  .post(resetUserPassword);

module.exports = router;
