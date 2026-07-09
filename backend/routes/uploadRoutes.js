const express = require('express');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const router = express.Router();
const upload = require('../middleware/upload');

/**
 * @swagger
 * tags:
 *   name: Uploads
 *   description: File Upload Management
 */
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME
  || process.env.CLOUDINARY_URL?.match(/@([^/?]+)/)?.[1];

cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (file) => new Promise((resolve, reject) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const publicIdBase = path
    .basename(file.originalname, ext)
    .replace(/[^a-z0-9_-]+/gi, '_')
    .slice(0, 40);

  const resourceType = ext === '.pdf' ? 'raw' : 'image';

  const stream = cloudinary.uploader.upload_stream(
    {
      folder: 'school-management-system',
      public_id: `${publicIdBase}-${Math.round(Math.random() * 1e9)}`,
      resource_type: resourceType,
    },
    (error, result) => {
      if (error) return reject(error);
      resolve(result);
    }
  );

  stream.end(file.buffer);
});

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
  upload.single('file')(req, res, async (err) => {
    if (err) {
      // Multer errors (file too large, wrong type) are safe user-facing messages
      const isMulterError = err.code && err.code.startsWith('LIMIT_');
      return res.status(400).json({
        message: isMulterError ? err.message : 'File upload failed. Please try again.'
      });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    if (!cloudinaryCloudName || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ message: 'Cloudinary environment variables are missing.' });
    }

    try {
      const result = await uploadToCloudinary(req.file);

      res.status(201).json({
        filename: result.public_id,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        url: result.secure_url,
      });
    } catch (uploadError) {
      res.status(500).json({ message: uploadError.message || 'Cloudinary upload failed.' });
    }
  });
});

module.exports = router;