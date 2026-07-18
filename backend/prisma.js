const { PrismaClient } = require('@prisma/client');

const baseClient = new PrismaClient();

// Helper: send notification email after a Notification record is created
async function sendNotificationEmail(baseClient, userId, title, message) {
  if (!userId) return;
  try {
    const { sendEmail } = require('./utils/sendEmail');
    const user = await baseClient.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });
    if (user && user.email) {
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a; margin-bottom: 16px;">${title}</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">Dear ${user.name || 'User'},</p>
          <div style="color: #334155; font-size: 15px; line-height: 1.6; background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; white-space: pre-wrap;">${message}</div>
          <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Best regards,<br><strong>School Management System</strong></p>
        </div>
      `;
      await sendEmail(user.email, title, emailBody);
    }
  } catch (err) {
    console.error('[NotificationMiddleware] Error:', err);
  }
}

// Prisma 5: use $extends instead of the removed $use middleware
const prisma = baseClient.$extends({
  query: {
    notification: {
      async create({ args, query }) {
        const result = await query(args);
        const data = args.data;
        sendNotificationEmail(baseClient, data.userId, data.title, data.message)
          .catch(err => console.error('[NotificationMiddleware] Error:', err));
        return result;
      },
      async createMany({ args, query }) {
        const result = await query(args);
        const dataList = Array.isArray(args.data) ? args.data : [args.data];
        dataList.forEach(data => {
          sendNotificationEmail(baseClient, data.userId, data.title, data.message)
            .catch(err => console.error('[NotificationMiddleware] Error:', err));
        });
        return result;
      },
    },
  },
});

module.exports = prisma;
