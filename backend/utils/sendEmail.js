require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email via Resend.
 * @param {string} to Recipient email address
 * @param {string} subject Email subject
 * @param {string} html HTML content
 * @returns {Promise<boolean>} true if sent, false otherwise
 */
async function sendEmail(to, subject, html) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    if (error) {
      console.error('Resend error:', error);
      return false;
    }
    console.log('Email sent:', data);
    return true;
  } catch (err) {
    console.error('Unexpected error:', err);
    return false;
  }
}

module.exports = { sendEmail };
