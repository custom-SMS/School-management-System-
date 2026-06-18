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

const parseStudentIds = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
};

const getSenderLabel = async (userId, role) => {
  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, role: true }
  });

  if (!sender) return role || 'School';
  return `${sender.name} (${sender.role})`;
};

const sendParentNotifications = async (req, res) => {
  try {
    const studentIds = parseStudentIds(req.body.studentIds || req.body.studentId);
    const rawMessage = String(req.body.message || '').trim();
    const rawTitle = String(req.body.title || '').trim();

    if (!studentIds.length) {
      return res.status(400).json({ message: 'Select at least one student.' });
    }

    if (!rawMessage) {
      return res.status(400).json({ message: 'Notification message is required.' });
    }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: {
        user: { select: { name: true } },
        guardians: {
          include: {
            user: { select: { id: true } }
          }
        }
      }
    });

    if (!students.length) {
      return res.status(404).json({ message: 'No matching students found.' });
    }

    if (req.user.role === 'Teacher') {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user._id },
        include: {
          assignments: {
            include: {
              class: {
                include: {
                  students: { select: { id: true } }
                }
              }
            }
          }
        }
      });

      if (!teacher) {
        return res.status(404).json({ message: 'Teacher profile not found.' });
      }

      const allowedStudentIds = new Set();
      const allowedClassNumbers = new Set();

      teacher.assignments.forEach((assignment) => {
        const classNumber = String(assignment.class?.name || '').match(/(\d+)/)?.[1];
        if (classNumber) allowedClassNumbers.add(classNumber);
        (assignment.class?.students || []).forEach((student) => allowedStudentIds.add(student.id));
      });

      const unauthorized = students.some((student) => {
        if (allowedStudentIds.has(student.id)) return false;
        const gradeNumber = String(student.grade || '').match(/(\d+)/)?.[1];
        return !gradeNumber || !allowedClassNumbers.has(gradeNumber);
      });

      if (unauthorized) {
        return res.status(403).json({ message: 'You can only notify parents for students assigned to you.' });
      }
    }

    const recipients = new Map();
    students.forEach((student) => {
      (student.guardians || []).forEach((guardian) => {
        if (guardian.user?.id) {
          recipients.set(guardian.user.id, {
            userId: guardian.user.id,
            studentName: student.user?.name || 'your child'
          });
        }
      });
    });

    if (recipients.size === 0) {
      return res.status(404).json({ message: 'No parent portal accounts are linked to the selected student(s).' });
    }

    const title = rawTitle || 'Message from school';
    const senderLabel = await getSenderLabel(req.user._id, req.user.role);
    const studentLabel = students.length > 1
      ? `Students: ${students.map((student) => student.user?.name || 'Student').join(', ')}`
      : `Student: ${students[0].user?.name || 'Student'}`;
    const notificationMessage = `From: ${senderLabel}\n${studentLabel}\n${rawMessage}`;

    await prisma.notification.createMany({
      data: Array.from(recipients.values()).map((recipient) => ({
        userId: recipient.userId,
        title,
        message: notificationMessage,
        type: 'ParentMessage'
      }))
    });

    res.status(201).json({
      message: `Notification sent to ${recipients.size} parent account${recipients.size === 1 ? '' : 's'}.`,
      recipients: recipients.size
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitStudentRecordRequest = async (req, res) => {
  try {
    if (req.user.role !== 'Student') {
      return res.status(403).json({ message: 'Only students can submit record review requests.' });
    }

    const reason = String(req.body.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ message: 'Request reason is required.' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user._id },
      include: { user: { select: { name: true, email: true } } }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const admins = await prisma.user.findMany({
      where: { role: { in: ['Admin', 'SuperAdmin'] } },
      select: { id: true }
    });

    if (!admins.length) {
      return res.status(404).json({ message: 'No admin accounts are available to receive this request.' });
    }

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: 'Student Record Review Request',
        message: `From: ${student.user?.name || 'Student'} (${student.studentId})\nGrade: ${student.grade || '-'}\n${reason}`,
        type: 'RecordRequest'
      }))
    });

    res.status(201).json({ message: 'Request submitted to the registrar/admin team.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    const existing = await prisma.notification.findUnique({ where: { id } });

    if (!existing || existing.userId !== req.user._id) {
      return res.status(404).json({ message: 'Notification not found' });
    }

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
  sendParentNotifications,
  submitStudentRecordRequest,
  getNotifications,
  markAsRead
};
