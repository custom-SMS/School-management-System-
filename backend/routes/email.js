const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/sendEmail');

/**
 * POST /api/email/send
 * Body: { to, subject, html }
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
