const prisma = require('../prisma');
const { sendParentMessageEmail } = require('../utils/emailService');

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
            user: { select: { id: true, email: true, name: true } }
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
          const existing = recipients.get(guardian.user.id);
          const nextStudentName = student.user?.name || 'your child';

          if (existing) {
            existing.studentNames.add(nextStudentName);
            if (!existing.parentName && guardian.user?.name) existing.parentName = guardian.user.name;
            if (!existing.email && guardian.user?.email) existing.email = guardian.user.email;
            return;
          }

          recipients.set(guardian.user.id, {
            userId: guardian.user.id,
            parentName: guardian.user?.name || guardian.fullName || 'Parent',
            email: guardian.user?.email || guardian.email || '',
            studentNames: new Set([nextStudentName])
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

    const recipientList = Array.from(recipients.values());

    await prisma.notification.createMany({
      data: recipientList.map((recipient) => ({
        userId: recipient.userId,
        title,
        message: notificationMessage,
        type: 'ParentMessage'
      }))
    });

    const emailResults = await Promise.allSettled(
      recipientList
        .filter((recipient) => recipient.email)
        .map((recipient) =>
          sendParentMessageEmail({
            to: recipient.email,
            parentName: recipient.parentName,
            studentNames: Array.from(recipient.studentNames),
            senderLabel,
            title,
            message: rawMessage
          })
        )
    );

    const emailedCount = emailResults.filter((result) => result.status === 'fulfilled').length;
    const failedResults = emailResults.filter((result) => result.status === 'rejected');
    const emailFailureCount = failedResults.length;

    // Collect the first failure reason to show in the response
    const firstEmailError = failedResults.length > 0
      ? (failedResults[0].reason?.message || 'Email delivery failed')
      : null;

    // Determine the response message based on what actually worked
    let responseMsg = `Notification sent to ${recipientList.length} parent account${recipientList.length === 1 ? '' : 's'}`;
    if (emailedCount > 0) {
      responseMsg += ` and email delivered to ${emailedCount}`;
    }
    if (emailFailureCount > 0) {
      responseMsg += `. ⚠️ ${emailFailureCount} email(s) failed to send`;
      if (firstEmailError) responseMsg += `: ${firstEmailError}`;
    }
    if (recipientList.filter(r => r.email).length === 0) {
      responseMsg += '. No parent email addresses are on file — only in-app notification was sent.';
    }

    res.status(201).json({
      message: responseMsg,
      recipients: recipientList.length,
      emailed: emailedCount,
      emailFailed: emailFailureCount,
      emailError: firstEmailError || undefined,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Teacher -> Students (notify student user accounts)
const sendStudentNotifications = async (req, res) => {
  try {
    const studentIds = parseStudentIds(req.body.studentIds || req.body.studentId);
    const rawMessage = String(req.body.message || '').trim();
    const rawTitle = String(req.body.title || '').trim();

    if (!studentIds.length) return res.status(400).json({ message: 'Select at least one student.' });
    if (!rawMessage) return res.status(400).json({ message: 'Notification message is required.' });

    const students = await prisma.student.findMany({ where: { id: { in: studentIds } }, include: { user: { select: { id: true } } } });
    if (!students.length) return res.status(404).json({ message: 'No matching students found.' });

    // Authorization: if teacher, ensure they are assigned to these students
    if (req.user.role === 'Teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user._id }, include: { assignments: { include: { class: { include: { students: { select: { id: true } } } } } } } });
      if (!teacher) return res.status(404).json({ message: 'Teacher profile not found.' });

      const allowed = new Set();
      teacher.assignments.forEach((a) => (a.class?.students || []).forEach((s) => allowed.add(s.id)));
      const unauthorized = students.some((s) => !allowed.has(s.id));
      if (unauthorized) return res.status(403).json({ message: 'You can only notify students assigned to you.' });
    }

    const title = rawTitle || 'Message from school';
    const senderLabel = await getSenderLabel(req.user._id, req.user.role);
    const studentLabel = students.length > 1 ? `Students: ${students.map((s) => s.user?.id || s.id).join(', ')}` : `Student: ${students[0].user?.id || students[0].id}`;
    const notificationMessage = `From: ${senderLabel}\n${studentLabel}\n${rawMessage}`;

    await prisma.notification.createMany({ data: students.map((s) => ({ userId: s.user?.id || null, title, message: notificationMessage, type: 'StudentMessage' })).filter(d => d.userId) });

    res.status(201).json({ message: `Notification sent to ${students.length} student account${students.length === 1 ? '' : 's'}.`, recipients: students.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Teacher -> Both (students + parents)
const sendBothNotifications = async (req, res) => {
  try {
    const studentIds = parseStudentIds(req.body.studentIds || req.body.studentId);
    const rawMessage = String(req.body.message || '').trim();
    const rawTitle = String(req.body.title || '').trim();

    if (!studentIds.length) return res.status(400).json({ message: 'Select at least one student.' });
    if (!rawMessage) return res.status(400).json({ message: 'Notification message is required.' });

    const students = await prisma.student.findMany({ where: { id: { in: studentIds } }, include: { user: { select: { id: true, name: true } }, guardians: { include: { user: { select: { id: true } } } } } });
    if (!students.length) return res.status(404).json({ message: 'No matching students found.' });

    if (req.user.role === 'Teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user._id }, include: { assignments: { include: { class: { include: { students: { select: { id: true } } } } } } } });
      if (!teacher) return res.status(404).json({ message: 'Teacher profile not found.' });
      const allowed = new Set();
      teacher.assignments.forEach((a) => (a.class?.students || []).forEach((s) => allowed.add(s.id)));
      const unauthorized = students.some((s) => !allowed.has(s.id));
      if (unauthorized) return res.status(403).json({ message: 'You can only notify students assigned to you.' });
    }

    const recipients = new Map();
    students.forEach((student) => {
      // student user
      if (student.user?.id) recipients.set(student.user.id, { userId: student.user.id, type: 'Student' });
      // parents
      (student.guardians || []).forEach((g) => { if (g.user?.id) recipients.set(g.user.id, { userId: g.user.id, type: 'Parent' }); });
    });

    if (recipients.size === 0) return res.status(404).json({ message: 'No recipient user accounts found.' });

    const title = rawTitle || 'Message from school';
    const senderLabel = await getSenderLabel(req.user._id, req.user.role);
    const studentLabel = students.length > 1 ? `Students: ${students.map((s) => s.user?.name || 'Student').join(', ')}` : `Student: ${students[0].user?.name || 'Student'}`;
    const notificationMessage = `From: ${senderLabel}\n${studentLabel}\n${rawMessage}`;

    await prisma.notification.createMany({ data: Array.from(recipients.values()).map((r) => ({ userId: r.userId, title, message: notificationMessage, type: 'Combined' })) });

    res.status(201).json({ message: `Notification sent to ${recipients.size} user(s).`, recipients: recipients.size });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Parent -> Teacher(s)
const getTeachersForStudent = async (req, res) => {
  try {
    const studentId = String(req.query.studentId || '').trim();
    if (!studentId) return res.status(400).json({ message: 'studentId is required' });

    // Find teacher assignments that include this student
    const assignments = await prisma.teacherAssignment.findMany({ include: { teacher: { include: { user: { select: { id: true, name: true, email: true } } } }, class: { include: { students: { select: { id: true } } } } } });
    const teachers = [];
    assignments.forEach((a) => {
      const studentInClass = (a.class?.students || []).some((s) => s.id === studentId);
      if (studentInClass && a.teacher) teachers.push({ id: a.teacher.id, user: a.teacher.user });
    });

    const unique = Array.from(new Map(teachers.map(t => [t.id, t])).values());
    res.status(200).json(unique);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendParentToTeachers = async (req, res) => {
  try {
    const studentId = String(req.body.studentId || '').trim();
    const teacherIds = Array.isArray(req.body.teacherIds) ? req.body.teacherIds : (req.body.teacherId ? [req.body.teacherId] : []);
    const rawMessage = String(req.body.message || '').trim();
    const rawTitle = String(req.body.title || '').trim();

    if (!studentId) return res.status(400).json({ message: 'studentId is required' });
    if (!rawMessage) return res.status(400).json({ message: 'Message is required' });

    // Ensure parent owns the student (unless SuperAdmin)
    if (req.user.role === 'Parent') {
      const parent = await prisma.parent.findUnique({ where: { userId: req.user._id }, include: { children: { select: { id: true } } } });
      if (!parent) return res.status(404).json({ message: 'Parent profile not found.' });
      const owns = (parent.children || []).some((c) => c.id === studentId);
      if (!owns) return res.status(403).json({ message: 'You can only message teachers assigned to your child.' });
    }

    // If teacherIds not supplied, resolve all teachers for that student
    let targetTeacherIds = teacherIds;
    if (!targetTeacherIds.length) {
      const assignments = await prisma.teacherAssignment.findMany({ where: {}, include: { teacher: { select: { id: true } }, class: { include: { students: { select: { id: true } } } } } });
      const set = new Set();
      assignments.forEach((a) => { if ((a.class?.students || []).some(s => s.id === studentId) && a.teacher) set.add(a.teacher.id); });
      targetTeacherIds = Array.from(set);
    }

    if (!targetTeacherIds.length) return res.status(404).json({ message: 'No teachers found for the selected student.' });

    // Fetch teacher user ids
    const teachers = await prisma.teacher.findMany({ where: { id: { in: targetTeacherIds } }, include: { user: { select: { id: true } } } });
    const recipients = teachers.map(t => t.user?.id).filter(Boolean);
    if (!recipients.length) return res.status(404).json({ message: 'No teacher user accounts available.' });

    const title = rawTitle || 'Parent Message';
    const parentLabel = await getSenderLabel(req.user._id, req.user.role);
    const student = await prisma.student.findUnique({ where: { id: studentId }, include: { user: { select: { name: true } } } });
    const notificationMessage = `From: ${parentLabel}\nStudent: ${student?.user?.name || studentId}\n${rawMessage}`;

    await prisma.notification.createMany({ data: recipients.map((uid) => ({ userId: uid, title, message: notificationMessage, type: 'ParentToTeacher' })) });

    res.status(201).json({ message: `Notification sent to ${recipients.length} teacher(s).`, recipients: recipients.length });
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

const BROADCAST_AUDIENCES = ['all', 'Admin', 'Cashier', 'Teacher', 'Student', 'Parent', 'SuperAdmin'];

// Broadcast a notification to every user in an audience (a single role, or "all").
const broadcastNotification = async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const message = String(req.body.message || '').trim();
    const audience = String(req.body.audience || 'all').trim();

    if (!title) return res.status(400).json({ message: 'Title is required.' });
    if (!message) return res.status(400).json({ message: 'Message is required.' });
    if (!BROADCAST_AUDIENCES.includes(audience)) {
      return res.status(400).json({ message: 'Invalid audience.' });
    }

    const where = audience === 'all' ? { isActive: true } : { role: audience, isActive: true };
    const recipients = await prisma.user.findMany({ where, select: { id: true } });

    if (recipients.length === 0) {
      return res.status(404).json({ message: 'No active users match this audience.' });
    }

    await prisma.notification.createMany({
      data: recipients.map((u) => ({
        userId: u.id,
        title,
        message,
        type: 'Broadcast',
      })),
    });

    const { logActivity } = require('../middleware/auditLogger');
    await logActivity(
      req.user._id,
      'Broadcast Notification',
      null,
      `Sent "${title}" to ${audience === 'all' ? 'all users' : audience + 's'} (${recipients.length} recipients)`
    );

    res.status(201).json({
      message: `Notification sent to ${recipients.length} user${recipients.length === 1 ? '' : 's'}.`,
      recipients: recipients.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// System-wide notification feed for SuperAdmin oversight.
const getAllNotifications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 30);
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      prisma.notification.count(),
    ]);

    res.status(200).json({
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
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
  sendStudentNotifications,
  sendBothNotifications,
  getTeachersForStudent,
  sendParentToTeachers,
  submitStudentRecordRequest,
  broadcastNotification,
  getAllNotifications,
  getNotifications,
  markAsRead
};
