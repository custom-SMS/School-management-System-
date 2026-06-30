const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');

/**
 * @swagger
 * tags:
 *   name: Uploads
 *   description: File Upload Management
 */

// @desc    Upload a single registration/document file
// @route   POST /api/uploads
// @access  Public (used during open student registration)
// Multer errors (bad type, too large) are surfaced as 400 by the handler below.
/**
 * @swagger
 * /uploads:
 *   post:
 *     summary: Upload a single file
 *     tags: [Uploads]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded
 *       400:
 *         description: Bad request
 */
router.post('/', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    res.status(201).json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      url: `/uploads/${req.file.filename}`,
    });
  });
});

module.exports = router;
