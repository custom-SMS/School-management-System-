const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendGuardianCredentialsEmail = async (guardianEmail, guardianName, studentName, password) => {
  const fromAddress = process.env.EMAIL_FROM || 'noreply@schoolmanagement.com';
  if (fromAddress.toLowerCase().endsWith('@gmail.com')) {
    console.warn('Resend requires a verified sending domain. Gmail addresses are not supported unless verified in Resend.');
  }

  const response = await resend.emails.send({
    from: fromAddress,
    to: guardianEmail,
    subject: `Account Created - ${studentName} Registration`,
    html: `
      <h2>Welcome to School Management System</h2>
      <p>Dear ${guardianName},</p>
      <p>Your child <strong>${studentName}</strong> has been successfully registered in our School Management System.</p>
      
      <h3>Your Login Credentials:</h3>
      <p>
        <strong>Email:</strong> ${guardianEmail}<br>
        <strong>Password:</strong> ${password}
      </p>
      
      <p>Please keep these credentials safe. You can use them to log in and monitor your child's academic progress, attendance, and fees.</p>
      
      <p><strong>Important:</strong> We recommend changing your password on first login.</p>
      
      <p>If you have any questions, please contact the school administration.</p>
      
      <p>Best regards,<br>School Management System</p>
    `,
    text: `Welcome to School Management System\n\nDear ${guardianName},\n\nYour child ${studentName} has been successfully registered in our School Management System.\n\nYour Login Credentials:\nEmail: ${guardianEmail}\nPassword: ${password}\n\nPlease keep these credentials safe and change your password on first login.\n\nBest regards,\nSchool Management System`,
  });
  console.log("Sending to:", guardianEmail);
  console.log("Resend response:", response);

  
  if (response?.error) {
    console.error('Resend returned an error:', response.error);
    throw new Error(response.error.message || 'Resend email send failed');
  }

  return response;
};

module.exports = {
  sendGuardianCredentialsEmail,
};
