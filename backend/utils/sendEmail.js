require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email via Resend.
 * @param {string} to      Recipient email address
 * @param {string} subject Email subject
 * @param {string} html    HTML content
 * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
 */
async function sendEmail(to, subject, html) {
  if (!process.env.RESEND_API_KEY) {
    console.error('[sendEmail] RESEND_API_KEY is not set. Email not sent.');
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }

  if (!process.env.EMAIL_FROM) {
    console.error('[sendEmail] EMAIL_FROM is not set. Email not sent.');
    return { success: false, error: 'EMAIL_FROM is not configured' };
  }

  try {
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log('[sendEmail] Resend response:', JSON.stringify({
      to,
      subject,
      data: response.data,
      error: response.error,
    }));

    if (response.error) {
      const msg = response.error.message || JSON.stringify(response.error);
      console.error('[sendEmail] Resend API error:', msg);
      return { success: false, error: msg };
    }

    return { success: true, id: response.data?.id };
  } catch (err) {
    console.error('[sendEmail] Unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail };
