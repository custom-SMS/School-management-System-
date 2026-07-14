const axios = require('axios');

/**
 * Formats a phone number to the required 2519xxxxxxxx format
 * @param {string} phone 
 * @returns {string|null} formatted phone number or null if invalid
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check for various valid lengths and prefixes
  if (digits.startsWith('251') && digits.length === 12) {
    return digits;
  }
  if ((digits.startsWith('09') || digits.startsWith('07')) && digits.length === 10) {
    return '251' + digits.substring(1);
  }
  if ((digits.startsWith('9') || digits.startsWith('7')) && digits.length === 9) {
    return '251' + digits;
  }
  
  return null; // Could not format to a valid Ethiopian number
};

/**
 * Send an SMS using the SMS Ethiopia API
 * @param {string} phone 
 * @param {string} text 
 * @returns {Promise<boolean>} true if successful, false otherwise
 */
const sendSms = async (phone, text) => {
  const msisdn = formatPhoneNumber(phone);
  if (!msisdn) {
    console.warn(`[SMS Service] Invalid phone number format: ${phone}`);
    return false;
  }

  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) {
    console.error('[SMS Service] SMS_API_KEY is not defined in environment variables.');
    return false;
  }

  try {
    const response = await axios.post(
      'https://smsethiopia.com/api/sms/send',
      {
        msisdn,
        text
      },
      {
        headers: {
          'KEY': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.status === 'success') {
      return true;
    } else {
      console.error('[SMS Service] Failed to send SMS:', response.data);
      return false;
    }
  } catch (error) {
    console.error('[SMS Service] Error sending SMS:', error.response?.data || error.message);
    return false;
  }
};

module.exports = {
  formatPhoneNumber,
  sendSms
};
