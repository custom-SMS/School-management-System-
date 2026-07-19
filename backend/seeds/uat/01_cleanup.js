/**
 * Cleanup Script
 * Deletes all existing data in the correct dependency order
 */

async function seed(prisma) {
  console.log('  🧹 Cleaning existing data...');

  // Delete in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.fee.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.reportCardHistory.deleteMany();
  await prisma.reportCard.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.teacherAssignment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.section.deleteMany();
  await prisma.class.deleteMany();
  await prisma.classSubject.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.userScope.deleteMany();
  await prisma.user.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.educationalLevel.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.school.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.counter.deleteMany();

  console.log('  ✅ Cleanup completed');
}

module.exports = { name: '01_cleanup', seed };
