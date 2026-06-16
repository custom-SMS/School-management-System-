const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');

// @desc    Upload a single registration/document file
// @route   POST /api/uploads
// @access  Public (used during open student registration)
// Multer errors (bad type, too large) are surfaced as 400 by the handler below.
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
