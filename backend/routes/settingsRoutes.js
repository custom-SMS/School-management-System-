const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, getPublicSettings } = require('../controllers/settingsController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Public route for grading settings (no auth required)
router.get('/public', getPublicSettings);

// Super Admin only.
router.use(verifyToken, checkRole(['SuperAdmin']));

router.route('/')
  .get(getSettings)
  .put(updateSettings);

module.exports = router;
