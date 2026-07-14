require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/"/g, '') : '',
  },
});

/**
 * Send an email via Nodemailer SMTP.
 * @param {string} to      Recipient email address
 * @param {string} subject Email subject
 * @param {string} html    HTML content
 * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
 */
async function sendEmail(to, subject, html) {
  if (!process.env.EMAIL_USER) {
    console.error('[sendEmail] EMAIL_USER is not set. Email not sent.');
    return { success: false, error: 'EMAIL_USER is not configured' };
  }

  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  try {
    const info = await transporter.sendMail({
      from: `School Management System <${fromAddress}>`,
      to,
      subject,
      html,
    });

    console.log('[sendEmail] Nodemailer info:', JSON.stringify({
      to,
      subject,
      messageId: info.messageId,
    }));

    return { success: true, id: info.messageId };
  } catch (err) {
    console.error('[sendEmail] Unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail };
