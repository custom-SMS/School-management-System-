/**
 * Notifications Seed
 * Creates sample notifications for each role
 */

async function seed(prisma) {
  console.log('  🔔 Creating notifications...');

  const { users } = global.uatData;

  const notifications = [];
  const notificationTypes = [
    { type: 'grade', title: 'New Grade Posted', message: 'Your grade for Mathematics has been posted.' },
    { type: 'attendance', title: 'Attendance Warning', message: 'You have been marked absent for 3 consecutive days.' },
    { type: 'fee', title: 'Fee Payment Reminder', message: 'Your monthly fee payment is due soon.' },
    { type: 'report', title: 'Report Card Available', message: 'Your report card for Semester 1 is now available.' },
    { type: 'general', title: 'School Announcement', message: 'School will be closed for holidays next week.' },
  ];

  // Create notifications for students
  for (const student of users.students.slice(0, 20)) {
    for (let i = 0; i < 3; i++) {
      const notifType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      const notification = await prisma.notification.create({
        data: {
          userId: student.id,
          type: notifType.type,
          title: notifType.title,
          message: notifType.message,
          read: Math.random() > 0.5,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        }
      });
      notifications.push(notification);
    }
  }

  // Create notifications for teachers
  for (const teacher of users.teachers) {
    const notification = await prisma.notification.create({
      data: {
        userId: teacher.id,
        type: 'general',
        title: 'Grade Submission Reminder',
        message: 'Please submit your grades by the end of this week.',
        read: false,
        createdAt: new Date(),
      }
    });
    notifications.push(notification);
  }

  // Create notifications for parents
  for (const parent of users.parents.slice(0, 15)) {
    const notification = await prisma.notification.create({
      data: {
        userId: parent.id,
        type: 'report',
        title: 'Child Report Card Available',
        message: 'Your child\'s report card is now available for viewing.',
        read: Math.random() > 0.5,
        createdAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
      }
    });
    notifications.push(notification);
  }

  console.log(`  ✅ Created ${notifications.length} notifications`);
  
  global.uatData.notifications = notifications;
}

module.exports = { name: '13_notifications', seed };
