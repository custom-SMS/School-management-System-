const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Super Admin only.
router.use(verifyToken, checkRole(['SuperAdmin']));

router.route('/')
  .get(getSettings)
  .put(updateSettings);

module.exports = router;
