const express = require('express');

const { globalCacheMiddleware } = require('../middleware/globalCacheMiddleware');
const { setCacheResource, invalidateResource } = require('../middleware/cacheMiddleware');

const router = express.Router();
const { getSettings, updateSettings, getPublicSettings } = require('../controllers/settingsController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: System Settings
 */

// Public route for grading settings (no auth required)
/**
 * @swagger
 * /settings/public:
 *   get:
 *     summary: Get public system settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Public settings data
 */
router.get('/public', setCacheResource('settings'), globalCacheMiddleware, getPublicSettings);

// Super Admin only.
router.use(verifyToken, checkRole(['SuperAdmin']));

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get all system settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Settings data
 *   put:
 *     summary: Update system settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               schoolName:
 *                 type: string
 *               gradingScale:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Settings updated
 */
router.route('/')
  .get(getSettings)
  .put(updateSettings);

module.exports = router;
