const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/sendEmail');

/**
 * @swagger
 * tags:
 *   name: Email
 *   description: Email Sending Utilities
 */

/**
 * @swagger
 * /email/send:
 *   post:
 *     summary: Send an email
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *               subject:
 *                 type: string
 *               html:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Missing to, subject, or html
 *       500:
 *         description: Failed to send email
 */
router.post('/send', async (req, res) => {
  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing to, subject, or html' });
  }
  const ok = await sendEmail(to, subject, html);
  if (ok) {
    res.json({ success: true, message: 'Email sent' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

module.exports = router;
