const prisma = require('../prisma');
const { sendParentMessageEmail } = require('../utils/emailService');
const { sendSms } = require('../utils/smsService');

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
        where: { userId: req.user._id }
      });

      if (!teacher) {
        return res.status(404).json({ message: 'Teacher profile not found.' });
      }

      // Get active academic year
      const activeYear = await prisma.academicYear.findFirst({
        where: { isActive: true }
      });

      const assignments = await prisma.teacherAssignment.findMany({
        where: { 
          teacherId: teacher.id,
          ...(activeYear ? { academicYearId: activeYear.id } : {})
        },
        include: {
          class: {
            include: {
              students: { select: { id: true } },
              sections: {
                where: activeYear ? { academicYearId: activeYear.id } : {},
                include: {
                  enrollments: {
                    where: { status: { in: ['Enrolled', 'Promoted', 'Repeated'] } },
                    select: { studentId: true }
                  }
                }
              }
            }
          }
        }
      });

      const allowedStudentIds = new Set();

      assignments.forEach((assignment) => {
        // Add students from direct class-student relation
        (assignment.class?.students || []).forEach((student) => allowedStudentIds.add(student.id));
        
        // Add students from section enrollments
        (assignment.class?.sections || []).forEach((section) => {
          (section.enrollments || []).forEach((enrollment) => {
            allowedStudentIds.add(enrollment.studentId);
          });
        });
      });

      const unauthorized = students.some((student) => !allowedStudentIds.has(student.id));

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
    const recipientList = Array.from(recipients.values());

    await prisma.notification.createMany({
      data: recipientList.map((recipient) => {
        const studentNamesArr = Array.from(recipient.studentNames);
        const childLabel = studentNamesArr.length > 0 ? `Re: ${studentNamesArr.join(', ')}` : '';
        const notificationMessage = childLabel
          ? `From: ${senderLabel}\n${childLabel}\n${rawMessage}`
          : `From: ${senderLabel}\n${rawMessage}`;
        return {
          userId: recipient.userId,
          title,
          message: notificationMessage,
          type: 'ParentMessage'
        };
      })
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
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user._id } });
      if (!teacher) return res.status(404).json({ message: 'Teacher profile not found.' });

      // Get active academic year
      const activeYear = await prisma.academicYear.findFirst({
        where: { isActive: true }
      });

      const assignments = await prisma.teacherAssignment.findMany({
        where: { 
          teacherId: teacher.id,
          ...(activeYear ? { academicYearId: activeYear.id } : {})
        },
        include: {
          class: {
            include: {
              students: { select: { id: true } },
              sections: {
                where: activeYear ? { academicYearId: activeYear.id } : {},
                include: {
                  enrollments: {
                    where: { status: { in: ['Enrolled', 'Promoted', 'Repeated'] } },
                    select: { studentId: true }
                  }
                }
              }
            }
          }
        }
      });

      const allowed = new Set();
      assignments.forEach((a) => {
        (a.class?.students || []).forEach((s) => allowed.add(s.id));
        (a.class?.sections || []).forEach((section) => {
          (section.enrollments || []).forEach((enrollment) => {
            allowed.add(enrollment.studentId);
          });
        });
      });
      const unauthorized = students.some((s) => !allowed.has(s.id));
      if (unauthorized) return res.status(403).json({ message: 'You can only notify students assigned to you.' });
    }

    const title = rawTitle || 'Message from school';
    const senderLabel = await getSenderLabel(req.user._id, req.user.role);
    const notificationMessage = `From: ${senderLabel}\n${rawMessage}`;

    const studentRecipients = students.filter((s) => s.user?.id);
    await prisma.notification.createMany({
      data: studentRecipients.map((s) => ({
        userId: s.user.id,
        title,
        message: notificationMessage,
        type: 'StudentMessage'
      }))
    });

    res.status(201).json({ message: `Notification sent to ${studentRecipients.length} student account${studentRecipients.length === 1 ? '' : 's'}.`, recipients: studentRecipients.length });
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
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user._id } });
      if (!teacher) return res.status(404).json({ message: 'Teacher profile not found.' });

      // Get active academic year
      const activeYear = await prisma.academicYear.findFirst({
        where: { isActive: true }
      });

      const assignments = await prisma.teacherAssignment.findMany({
        where: { 
          teacherId: teacher.id,
          ...(activeYear ? { academicYearId: activeYear.id } : {})
        },
        include: {
          class: {
            include: {
              students: { select: { id: true } },
              sections: {
                where: activeYear ? { academicYearId: activeYear.id } : {},
                include: {
                  enrollments: {
                    where: { status: { in: ['Enrolled', 'Promoted', 'Repeated'] } },
                    select: { studentId: true }
                  }
                }
              }
            }
          }
        }
      });

      const allowed = new Set();
      assignments.forEach((a) => {
        (a.class?.students || []).forEach((s) => allowed.add(s.id));
        (a.class?.sections || []).forEach((section) => {
          (section.enrollments || []).forEach((enrollment) => {
            allowed.add(enrollment.studentId);
          });
        });
      });
      const unauthorized = students.some((s) => !allowed.has(s.id));
      if (unauthorized) return res.status(403).json({ message: 'You can only notify students assigned to you.' });
    }

    const title = rawTitle || 'Message from school';
    const senderLabel = await getSenderLabel(req.user._id, req.user.role);

    const notificationData = [];
    const processedUsers = new Set();

    students.forEach((student) => {
      const studentName = student.user?.name || 'Student';

      // 1. Notify Student user account
      if (student.user?.id && !processedUsers.has(student.user.id)) {
        processedUsers.add(student.user.id);
        notificationData.push({
          userId: student.user.id,
          title,
          message: `From: ${senderLabel}\n${rawMessage}`,
          type: 'StudentMessage'
        });
      }

      // 2. Notify Parent user account(s)
      (student.guardians || []).forEach((g) => {
        if (g.user?.id && !processedUsers.has(g.user.id)) {
          processedUsers.add(g.user.id);
          notificationData.push({
            userId: g.user.id,
            title,
            message: `From: ${senderLabel}\nRe: ${studentName}\n${rawMessage}`,
            type: 'ParentMessage'
          });
        }
      });
    });

    if (notificationData.length === 0) return res.status(404).json({ message: 'No recipient user accounts found.' });

    await prisma.notification.createMany({ data: notificationData });

    res.status(201).json({ message: `Notification sent to ${notificationData.length} user(s).`, recipients: notificationData.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Parent -> Teacher(s)
const getTeachersForStudent = async (req, res) => {
  try {
    const studentId = String(req.query.studentId || '').trim();
    if (!studentId) return res.status(400).json({ message: 'studentId is required' });

    // Active academic year filter
    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        classes: {
          include: {
            teacher: { include: { user: { select: { id: true, name: true, email: true } } } },
            classSubjects: {
              include: {
                teacher: { include: { user: { select: { id: true, name: true, email: true } } } },
                subject: { select: { name: true } }
              }
            }
          }
        },
        enrollments: {
          where: activeYear ? { academicYearId: activeYear.id } : {},
          include: {
            section: {
              include: {
                homeroomTeacher: { include: { user: { select: { id: true, name: true, email: true } } } },
                class: {
                  include: {
                    teacher: { include: { user: { select: { id: true, name: true, email: true } } } },
                    classSubjects: {
                      include: {
                        teacher: { include: { user: { select: { id: true, name: true, email: true } } } },
                        subject: { select: { name: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const teacherMap = new Map();

    if (student) {
      const classIds = new Set();

      // 1. Direct student classes
      for (const cls of student.classes || []) {
        if (cls.id) classIds.add(cls.id);

        if (cls.teacher && cls.teacher.user) {
          teacherMap.set(cls.teacher.id, {
            id: cls.teacher.id,
            user: cls.teacher.user,
            role: 'Class Teacher'
          });
        }

        for (const cs of cls.classSubjects || []) {
          if (cs.teacher && cs.teacher.user) {
            const existing = teacherMap.get(cs.teacher.id);
            const subjectLabel = cs.subject?.name ? `Subject (${cs.subject.name})` : 'Subject Teacher';
            teacherMap.set(cs.teacher.id, {
              id: cs.teacher.id,
              user: cs.teacher.user,
              role: existing ? (existing.role.includes(subjectLabel) ? existing.role : `${existing.role}, ${subjectLabel}`) : subjectLabel
            });
          }
        }
      }

      // 2. Student enrollments -> section & section.class
      for (const enrollment of student.enrollments || []) {
        if (enrollment.section?.homeroomTeacher) {
          const ht = enrollment.section.homeroomTeacher;
          if (ht.id && ht.user) {
            const existing = teacherMap.get(ht.id);
            teacherMap.set(ht.id, {
              id: ht.id,
              user: ht.user,
              role: existing ? (existing.role.includes('Homeroom Teacher') ? existing.role : `${existing.role}, Homeroom Teacher`) : 'Homeroom Teacher'
            });
          }
        }

        const secClass = enrollment.section?.class;
        if (secClass) {
          if (secClass.id) classIds.add(secClass.id);

          if (secClass.teacher && secClass.teacher.user) {
            const existing = teacherMap.get(secClass.teacher.id);
            teacherMap.set(secClass.teacher.id, {
              id: secClass.teacher.id,
              user: secClass.teacher.user,
              role: existing ? (existing.role.includes('Class Teacher') ? existing.role : `${existing.role}, Class Teacher`) : 'Class Teacher'
            });
          }

          for (const cs of secClass.classSubjects || []) {
            if (cs.teacher && cs.teacher.user) {
              const existing = teacherMap.get(cs.teacher.id);
              const subjectLabel = cs.subject?.name ? `Subject (${cs.subject.name})` : 'Subject Teacher';
              teacherMap.set(cs.teacher.id, {
                id: cs.teacher.id,
                user: cs.teacher.user,
                role: existing ? (existing.role.includes(subjectLabel) ? existing.role : `${existing.role}, ${subjectLabel}`) : subjectLabel
              });
            }
          }
        }
      }

      // 3. Teacher assignments for resolved class IDs
      if (classIds.size > 0) {
        const classAssignments = await prisma.teacherAssignment.findMany({
          where: {
            classId: { in: Array.from(classIds) },
            ...(activeYear ? { academicYearId: activeYear.id } : {})
          },
          include: {
            teacher: { include: { user: { select: { id: true, name: true, email: true } } } },
            subject: { select: { name: true } }
          }
        });

        for (const a of classAssignments) {
          if (a.teacher && a.teacher.user) {
            const existing = teacherMap.get(a.teacher.id);
            const subjectLabel = a.subject?.name ? `Subject (${a.subject.name})` : 'Subject Teacher';
            teacherMap.set(a.teacher.id, {
              id: a.teacher.id,
              user: a.teacher.user,
              role: existing ? (existing.role.includes(subjectLabel) ? existing.role : `${existing.role}, ${subjectLabel}`) : subjectLabel
            });
          }
        }
      }
    }

    // 4. Direct teacher assignments assigned directly to student
    const directAssignments = await prisma.teacherAssignment.findMany({
      where: {
        students: { some: { id: studentId } },
        ...(activeYear ? { academicYearId: activeYear.id } : {})
      },
      include: {
        teacher: { include: { user: { select: { id: true, name: true, email: true } } } },
        subject: { select: { name: true } }
      }
    });

    for (const a of directAssignments) {
      if (a.teacher && a.teacher.user) {
        const existing = teacherMap.get(a.teacher.id);
        const subjectLabel = a.subject?.name ? `Assigned (${a.subject.name})` : 'Assigned Teacher';
        teacherMap.set(a.teacher.id, {
          id: a.teacher.id,
          user: a.teacher.user,
          role: existing ? (existing.role.includes(subjectLabel) ? existing.role : `${existing.role}, ${subjectLabel}`) : subjectLabel
        });
      }
    }

    // 5. Fallback: If no specific teacher assignments exist yet, fetch all active teachers in school/branch so parent is never blocked
    if (teacherMap.size === 0) {
      const fallbackTeachers = await prisma.teacher.findMany({
        where: {
          user: { isActive: true },
          ...(student?.branchId ? { branchId: student.branchId } : {})
        },
        include: {
          user: { select: { id: true, name: true, email: true } }
        },
        take: 30
      });

      for (const t of fallbackTeachers) {
        if (t.id && t.user) {
          teacherMap.set(t.id, {
            id: t.id,
            user: t.user,
            role: 'School Teacher'
          });
        }
      }
    }

    res.status(200).json(Array.from(teacherMap.values()));
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

    // Fetch teacher user ids by matching either teacher.id OR teacher.userId
    const teachers = await prisma.teacher.findMany({
      where: {
        OR: [
          { id: { in: targetTeacherIds } },
          { userId: { in: targetTeacherIds } }
        ]
      },
      include: { user: { select: { id: true } } }
    });
    const recipients = Array.from(new Set(teachers.map(t => t.user?.id).filter(Boolean)));
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
    const rawMessage = String(req.body.message || '').trim();
    const audience = String(req.body.audience || 'all').trim();

    if (!title) return res.status(400).json({ message: 'Title is required.' });
    if (!rawMessage) return res.status(400).json({ message: 'Message is required.' });
    if (!BROADCAST_AUDIENCES.includes(audience)) {
      return res.status(400).json({ message: 'Invalid audience.' });
    }

    const senderLabel = await getSenderLabel(req.user._id, req.user.role);
    const notificationMessage = `From: ${senderLabel}\n${rawMessage}`;

    const adminBranchId = req.user.role === 'Admin' ? (req.user.branchId || req.branchFilter?.branchId) : null;
    const where = {
      isActive: true,
      ...(audience !== 'all' ? { role: audience } : {}),
      ...(adminBranchId ? {
        OR: [
          { studentProfile: { branchId: adminBranchId } },
          { teacherProfile: { branchId: adminBranchId } },
          { parentProfile: { children: { some: { branchId: adminBranchId } } } },
          { userScope: { some: { branchId: adminBranchId } } }
        ]
      } : {})
    };
    const recipients = await prisma.user.findMany({ where, select: { id: true } });

    if (recipients.length === 0) {
      return res.status(404).json({ message: 'No active users match this audience.' });
    }

    await prisma.notification.createMany({
      data: recipients.map((u) => ({
        userId: u.id,
        title,
        message: notificationMessage,
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

// System-wide or Branch notification feed.
const getAllNotifications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 8);
    const skip = (page - 1) * limit;

    const adminBranchId = req.user.role === 'Admin' ? (req.user.branchId || req.branchFilter?.branchId) : null;
    const where = adminBranchId ? {
      user: {
        OR: [
          { studentProfile: { branchId: adminBranchId } },
          { teacherProfile: { branchId: adminBranchId } },
          { parentProfile: { children: { some: { branchId: adminBranchId } } } },
          { userScope: { some: { branchId: adminBranchId } } }
        ]
      }
    } : {};

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      prisma.notification.count({ where }),
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

// Retrieve notifications for current user (auto-marks unread as read, filters out notifications > 12h old)
// Retrieve notifications for current user
const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user._id,
      },
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

// Mark ALL notifications as read for the current user
const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user._id, read: false },
      data: { read: true }
    });
    res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send SMS to parents
const sendSmsToParents = async (req, res) => {
  try {
    const studentIds = parseStudentIds(req.body.studentIds || req.body.studentId);
    const rawMessage = String(req.body.message || '').trim();

    if (!studentIds.length) {
      return res.status(400).json({ message: 'Select at least one student.' });
    }

    if (!rawMessage) {
      return res.status(400).json({ message: 'SMS message is required.' });
    }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: {
        guardians: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!students.length) {
      return res.status(404).json({ message: 'No matching students found.' });
    }

    // Extract unique phone numbers
    const phoneNumbers = new Set();
    students.forEach((student) => {
      (student.guardians || []).forEach((guardian) => {
        if (guardian.phone) {
          phoneNumbers.add(guardian.phone);
        }
      });
    });

    if (phoneNumbers.size === 0) {
      return res.status(404).json({ message: 'No parent phone numbers found for the selected students.' });
    }

    const phonesArray = Array.from(phoneNumbers);
    
    // Send SMS to all phone numbers
    const smsResults = await Promise.allSettled(
      phonesArray.map((phone) => sendSms(phone, rawMessage))
    );

    const sentCount = smsResults.filter((result) => result.status === 'fulfilled' && result.value === true).length;
    const failedCount = phonesArray.length - sentCount;

    res.status(200).json({
      message: `SMS sent successfully to ${sentCount} parents. Failed: ${failedCount}`,
      sent: sentCount,
      failed: failedCount,
      total: phonesArray.length
    });
  } catch (error) {
    console.error('Error in sendSmsToParents:', error);
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
  markAsRead,
  markAllAsRead,
  sendSmsToParents
};
