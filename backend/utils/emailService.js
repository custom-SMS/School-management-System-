const { sendEmail } = require('./sendEmail');

const EMAIL_FROM = process.env.EMAIL_FROM;

if (!process.env.EMAIL_USER) {
  console.error('[emailService] ⚠️  EMAIL_USER is not set. SMTP Emails will NOT be sent.');
}

const _send = async (payload) => {
  try {
    const response = await sendEmail(payload.to, payload.subject, payload.html);
    return response;
  } catch (err) {
    console.error('[emailService] Unexpected exception while sending email:', err.message);
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

const sendGuardianCredentialsEmail = async (guardianEmail, guardianName, studentName, password) => {
  const fromAddress = EMAIL_FROM || 'onboarding@resend.dev';

  console.log(`[emailService] Sending guardian credentials to: ${guardianEmail}`);

  const result = await _send({
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

  if (!result.success) {
    throw new Error(result.error || 'Failed to send guardian credentials email');
  }

  return result;
};

const sendTeacherCredentialsEmail = async (teacherEmail, teacherName, teacherId, password) => {
  const fromAddress = EMAIL_FROM || 'onboarding@resend.dev';

  console.log(`[emailService] Sending teacher credentials to: ${teacherEmail}`);

  const result = await _send({
    from: fromAddress,
    to: teacherEmail,
    subject: `Your Teacher Account - ${teacherId}`,
    html: `
      <h2>Welcome to School Management System</h2>
      <p>Dear ${teacherName},</p>
      <p>Your teacher account has been created.</p>
      <h3>Your Login Credentials:</h3>
      <p>
        <strong>Email:</strong> ${teacherEmail}<br>
        <strong>Password:</strong> ${password}
      </p>
      <p>Please log in and change your password on first use.</p>
      <p>Best regards,<br/>School Administration</p>
    `,
    text: `Welcome ${teacherName}\n\nYour Login Credentials:\nEmail: ${teacherEmail}\nPassword: ${password}\n\nPlease change your password on first login.`,
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to send teacher credentials email');
  }

  return result;
};

const sendParentMessageEmail = async ({ to, parentName, studentNames, senderLabel, title, message }) => {
  const fromAddress = EMAIL_FROM || 'onboarding@resend.dev';

  const normalizedStudentNames = Array.isArray(studentNames)
    ? studentNames.filter(Boolean)
    : [studentNames].filter(Boolean);

  const studentLabel = normalizedStudentNames.length > 1
    ? normalizedStudentNames.join(', ')
    : (normalizedStudentNames[0] || 'your child');

  const safeParentName = parentName || 'Parent';
  const safeTitle      = title    || 'Message from school';
  const safeMessage    = message  || '';

  console.log(`[emailService] Sending parent message email to: ${to} | from: ${fromAddress}`);

  const result = await _send({
    from: fromAddress,
    to,
    subject: safeTitle,
    html: `
      <h2>${safeTitle}</h2>
      <p>Dear ${safeParentName},</p>
      <p>You have received a new message regarding <strong>${studentLabel}</strong>.</p>
      <p><strong>From:</strong> ${senderLabel}</p>
      <p><strong>Student${normalizedStudentNames.length > 1 ? 's' : ''}:</strong> ${studentLabel}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-line;">${safeMessage}</p>
      <p>Best regards,<br/>School Management System</p>
    `,
    text: `${safeTitle}\n\nDear ${safeParentName},\n\nYou have received a new message regarding ${studentLabel}.\nFrom: ${senderLabel}\nStudent${normalizedStudentNames.length > 1 ? 's' : ''}: ${studentLabel}\n\nMessage:\n${safeMessage}\n\nBest regards,\nSchool Management System`,
  });

  if (!result.success) {
    // Throw so Promise.allSettled() in the controller can track it as 'rejected'
    throw new Error(result.error || 'Failed to send parent message email');
  }

  return result;
};

module.exports = {
  sendGuardianCredentialsEmail,
  sendTeacherCredentialsEmail,
  sendParentMessageEmail,
};
