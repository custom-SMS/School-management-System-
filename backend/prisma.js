const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

prisma.$use(async (params, next) => {
  const result = await next(params);

  if (params.model === 'Notification' && (params.action === 'create' || params.action === 'createMany')) {
    try {
      const { sendEmail } = require('./utils/sendEmail');
      
      const notifyUser = async (userId, title, message) => {
        if (!userId) return;
        const user = await prisma.user.findUnique({
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
      };

      if (params.action === 'create') {
        const data = params.args.data;
        notifyUser(data.userId, data.title, data.message).catch(err => console.error('[NotificationMiddleware] Error:', err));
      } else if (params.action === 'createMany') {
        const dataList = Array.isArray(params.args.data) ? params.args.data : [params.args.data];
        dataList.forEach(data => {
          notifyUser(data.userId, data.title, data.message).catch(err => console.error('[NotificationMiddleware] Error:', err));
        });
      }
    } catch (err) {
      console.error('[NotificationMiddleware] Failed to send notification email:', err);
    }
  }

  return result;
});

module.exports = prisma;
