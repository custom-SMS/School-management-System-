const prisma = require('../prisma');

// Helper to dispatch notification
const sendNotification = async (userId, title, message, type = 'System') => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type
      }
    });
  } catch (error) {
    console.error('Failed to send notification:', error.message);
  }
};

// Retrieve notifications for current user
const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user._id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendNotification,
  getNotifications,
  markAsRead
};
