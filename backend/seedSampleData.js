/**
 * Seeds rich, connected sample data so every portal (Student, Teacher, Cashier, Admin)
 * looks populated. Idempotent: clears the transactional/structural sample tables and
 * recreates them. Users (admin/cashier/teacher/student) come from seedAdmin.js — run that first.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const pct = (m) => m.quiz * 0.1 + m.assignment * 0.2 + m.midterm * 0.3 + m.final * 0.4;

async function main() {
  // --- Anchor accounts (created by seedAdmin.js) ---
  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@school.com' } });
  const cashierUser = await prisma.user.findFirst({ where: { email: 'cashier@school.com' } });
  const teacher = await prisma.teacher.findUnique({ where: { teacherId: 'TCH-0001' }, include: { user: true } });
  const mainStudent = await prisma.student.findUnique({ where: { studentId: 'STU-0001' } });

  if (!adminUser || !teacher || !mainStudent) {
    console.error('Run `node seedAdmin.js` first — admin/teacher/student accounts are missing.');
    process.exit(1);
  }

  // --- Clean sample data (respect FK order) ---
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.fee.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.teacherAssignment.deleteMany();
  await prisma.section.deleteMany();
  await prisma.class.deleteMany();
  await prisma.notification.deleteMany();

  // --- Active academic year ---
  const year = await prisma.academicYear.upsert({
    where: { year: '2024/25' },
    update: { isActive: true, registrationOpen: true },
    create: { year: '2024/25', isActive: true, registrationOpen: true },
  });
  // Ensure only this year is active.
  await prisma.academicYear.updateMany({ where: { NOT: { id: year.id } }, data: { isActive: false } });

  // --- Grading structure ---
  const gs = await prisma.gradingStructure.findFirst();
  if (!gs) await prisma.gradingStructure.create({ data: { isActive: true } });

  // --- Subjects ---
  const subjectNames = ['Mathematics', 'Physics', 'Biology', 'Amharic', 'English', 'Chemistry', 'History', 'ICT'];
  const subjects = {};
  for (const name of subjectNames) {
    subjects[name] = await prisma.subject.upsert({ where: { name }, update: {}, create: { name, department: 'General' } });
  }

  // --- Grade fees + fee structures ---
  const gradeAmounts = { 'Grade 9': 11000, 'Grade 10': 12000, 'Grade 11': 13500, 'Grade 12': 14500 };
  for (const [grade, amount] of Object.entries(gradeAmounts)) {
    await prisma.gradeFee.upsert({ where: { grade }, update: { amount }, create: { grade, amount } });
    await prisma.feeStructure.upsert({ where: { grade }, update: { amount, description: 'Annual Tuition' }, create: { grade, amount, description: 'Annual Tuition' } });
  }

  // --- Classrooms ---
  const roomDefs = [['Room 204', '204'], ['Lab 02', 'L02'], ['Room 105', '105']];
  for (const [name, number] of roomDefs) {
    await prisma.classroom.upsert({ where: { number }, update: {}, create: { name, number, capacity: 40, building: 'Main' } });
  }

  // --- Extra students for roster realism (STU-0002..STU-0007) ---
  const extraStudentDefs = [
    ['Lemlem Tadesse', 'Grade 10'], ['Yonas Fikru', 'Grade 10'], ['Saba Negash', 'Grade 10'],
    ['Hana Solomon', 'Grade 10'], ['Dawit Mulugeta', 'Grade 10'], ['Marta Girma', 'Grade 10'],
  ];
  const studentRecords = [mainStudent];
  for (let i = 0; i < extraStudentDefs.length; i++) {
    const [name, grade] = extraStudentDefs[i];
    const sid = `STU-${String(i + 2).padStart(4, '0')}`;
    const email = `${sid.toLowerCase()}@school.com`;
    const hashed = await bcrypt.hash('student', 10);
    const u = await prisma.user.upsert({
      where: { email },
      update: { name, role: 'Student' },
      create: { name, email, password: hashed, role: 'Student' },
    });
    const s = await prisma.student.upsert({
      where: { studentId: sid },
      update: { userId: u.id, grade },
      create: { userId: u.id, studentId: sid, grade },
    });
    studentRecords.push(s);
  }
  const allStudentIds = studentRecords.map((s) => s.id);

  // --- Classes (taught by the seeded teacher) ---
  const classDefs = [
    { name: 'Grade 10B', subject: 'Mathematics' },
    { name: 'Grade 11A', subject: 'Physics' },
    { name: 'Grade 9C', subject: 'Biology' },
  ];
  const classes = [];
  for (const def of classDefs) {
    const c = await prisma.class.create({
      data: {
        name: def.name,
        subject: def.subject,
        teacherId: teacher.id,
        students: { connect: allStudentIds.map((id) => ({ id })) },
      },
    });
    classes.push(c);
  }
  const mainClass = classes[0];

  // --- Section + enrollments (needed for the student timetable) ---
  const section = await prisma.section.create({ data: { name: 'B', classId: mainClass.id } });
  for (const s of studentRecords) {
    await prisma.enrollment.create({
      data: { studentId: s.id, academicYearId: year.id, grade: s.grade, sectionId: section.id, status: 'Enrolled' },
    });
  }

  // --- Teacher assignments (one per class) ---
  for (const c of classes) {
    await prisma.teacherAssignment.create({
      data: {
        teacherId: teacher.id,
        classId: c.id,
        subjectId: subjects[c.subject]?.id || null,
        assignedById: adminUser.id,
        students: { connect: allStudentIds.map((id) => ({ id })) },
      },
    });
  }

  // --- Timetable (active year, tied to section so the student sees it too) ---
  const ttDefs = [
    ['Monday', '08:00', '09:00', 'Mathematics', mainClass.id, 'Room 204'],
    ['Monday', '09:00', '10:00', 'Physics', classes[1].id, 'Lab 02'],
    ['Tuesday', '08:00', '09:00', 'Biology', classes[2].id, 'Room 105'],
    ['Tuesday', '09:00', '10:00', 'Mathematics', mainClass.id, 'Room 204'],
    ['Wednesday', '08:00', '09:00', 'English', mainClass.id, 'Room 204'],
    ['Wednesday', '10:00', '11:00', 'Mathematics', mainClass.id, 'Room 204'],
    ['Thursday', '08:00', '09:00', 'Physics', classes[1].id, 'Lab 02'],
    ['Thursday', '11:00', '12:00', 'Chemistry', mainClass.id, 'Room 204'],
    ['Friday', '08:00', '09:00', 'Mathematics', mainClass.id, 'Room 204'],
    ['Friday', '09:00', '10:00', 'Amharic', mainClass.id, 'Room 204'],
  ];
  for (const [day, start, end, subj, classId, room] of ttDefs) {
    await prisma.timetable.create({
      data: {
        academicYearId: year.id, classId, sectionId: section.id,
        subjectId: subjects[subj]?.id || subjects.Mathematics.id,
        dayOfWeek: day, startTime: start, endTime: end, room,
      },
    });
  }

  // --- Grades for the main student (recorded by the teacher) ---
  const gradeDefs = [
    ['Mathematics', { quiz: 90, assignment: 88, midterm: 92, final: 94 }],
    ['Physics', { quiz: 80, assignment: 82, midterm: 78, final: 86 }],
    ['Biology', { quiz: 88, assignment: 90, midterm: 85, final: 89 }],
    ['Amharic', { quiz: 95, assignment: 96, midterm: 94, final: 95 }],
    ['English', { quiz: 84, assignment: 80, midterm: 86, final: 88 }],
  ];
  for (const [subj, marks] of gradeDefs) {
    const p = pct(marks);
    await prisma.grade.create({
      data: {
        studentId: mainStudent.id, classId: mainClass.id, subject: subj,
        subjectId: subjects[subj]?.id || null, teacherId: teacher.user.id,
        academicYearId: year.id, ...marks, total: p, percentage: p,
      },
    });
  }
  // A few grades for other students so the teacher's recent activity is non-empty.
  for (let i = 1; i < Math.min(4, studentRecords.length); i++) {
    const marks = { quiz: 70 + i * 4, assignment: 72 + i * 3, midterm: 68 + i * 5, final: 75 + i * 2 };
    const p = pct(marks);
    await prisma.grade.create({
      data: {
        studentId: studentRecords[i].id, classId: mainClass.id, subject: 'Mathematics',
        subjectId: subjects.Mathematics.id, teacherId: teacher.user.id,
        academicYearId: year.id, ...marks, total: p, percentage: p,
      },
    });
  }

  // --- Attendance sessions (last ~3 weeks of weekdays) ---
  const sessionDates = [];
  const cursor = new Date();
  cursor.setHours(9, 0, 0, 0);
  while (sessionDates.length < 14) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) sessionDates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  // Main student: mostly present, with a couple of late/absent entries for realism.
  for (let i = 0; i < sessionDates.length; i++) {
    const date = sessionDates[i];
    const att = await prisma.attendance.create({
      data: { classId: mainClass.id, date, recordedById: teacher.user.id, academicYearId: year.id },
    });
    for (let s = 0; s < studentRecords.length; s++) {
      let status = 'Present';
      if (s === 0) {
        if (i === 2) status = 'Absent';
        else if (i === 5) status = 'Late';
      } else if ((s + i) % 9 === 0) status = 'Absent';
      else if ((s + i) % 7 === 0) status = 'Late';
      await prisma.attendanceRecord.create({ data: { attendanceId: att.id, studentId: studentRecords[s].id, status } });
    }
  }

  // --- Fees (per student; main student gets a clear paid/pending/overdue mix) ---
  const now = new Date();
  const past = (days) => new Date(now.getTime() - days * 86400000);
  const future = (days) => new Date(now.getTime() + days * 86400000);

  const feePlan = [
    { month: 'Meskerem', amount: 10000, paid: true, due: past(40), desc: 'Tuition Fees' },
    { month: 'Tikimt', amount: 2450, paid: true, due: past(15), desc: 'Uniform Package' },
    { month: 'Hidar', amount: 10000, paid: false, due: future(10), desc: 'Tuition Fees' },
    { month: 'Tahsas', amount: 2450, paid: false, due: past(5), desc: 'Meal Plan' },
  ];
  const mainFees = [];
  for (const f of feePlan) {
    const fee = await prisma.fee.create({
      data: {
        studentId: mainStudent.id, academicYearId: year.id, amount: f.amount,
        description: f.desc, month: f.month, dueDate: f.due, paid: f.paid,
        paymentDate: f.paid ? f.due : null,
      },
    });
    mainFees.push(fee);
  }
  // Other students: leave some unpaid (defaulters) and some paid (revenue).
  const otherUnpaidFees = [];
  for (let i = 1; i < studentRecords.length; i++) {
    const paid = i % 2 === 0;
    const fee = await prisma.fee.create({
      data: {
        studentId: studentRecords[i].id, academicYearId: year.id, amount: 12000,
        description: 'Tuition Fees', month: 'Hidar', dueDate: paid ? past(20) : past(8),
        paid, paymentDate: paid ? past(20) : null,
      },
    });
    if (!paid) otherUnpaidFees.push(fee);
  }

  // --- Payments: pending (verification queue) + verified (with receipts) ---
  let txn = 90021000;
  const banks = ['CBE', 'Awash Bank', 'Dashen Bank', 'Bank of Abyssinia'];
  // Pending verifications for some unpaid fees.
  const pendingTargets = [mainFees[2], ...otherUnpaidFees].slice(0, 4);
  for (let i = 0; i < pendingTargets.length; i++) {
    const fee = pendingTargets[i];
    if (!fee) continue;
    await prisma.payment.create({
      data: {
        feeId: fee.id, amount: fee.amount, transactionReference: `TXN-${txn++}`,
        bankName: banks[i % banks.length], status: 'Pending',
      },
    });
  }
  // Verified payments (with receipts) on the paid fees — feeds recent transactions.
  let receiptNo = 20240890;
  for (const fee of mainFees.filter((f) => f.paid)) {
    const pay = await prisma.payment.create({
      data: {
        feeId: fee.id, amount: fee.amount, transactionReference: `TXN-${txn++}`,
        bankName: 'CBE', status: 'Verified', verifiedById: cashierUser?.id || adminUser.id,
        verificationDate: fee.dueDate,
      },
    });
    await prisma.receipt.create({
      data: { receiptNumber: `R-${receiptNo++}`, paymentId: pay.id, issuedById: cashierUser?.id || adminUser.id },
    });
  }

  // --- Link the seeded parent to the first three children ---
  const parent = await prisma.parent.findUnique({ where: { parentId: 'PAR-0001' } });
  if (parent) {
    await prisma.parent.update({
      where: { id: parent.id },
      data: { children: { set: studentRecords.slice(0, 3).map((s) => ({ id: s.id })) } },
    });
  }

  // --- Notifications for the main student ---
  await prisma.notification.createMany({
    data: [
      { userId: mainStudent.userId, title: 'Tuition Fee Overdue', message: 'Your Tahsas installment (ETB 2,450) is overdue. Please settle to avoid penalties.', type: 'OverdueFee' },
      { userId: mainStudent.userId, title: 'Mid-Term Grades Published', message: 'Mid-term results for Mathematics and Physics are now available.', type: 'ReportCard' },
      { userId: mainStudent.userId, title: 'Attendance Notice', message: 'You have 1 unexcused absence this month.', type: 'LowAttendance', read: true },
    ],
  });

  console.log('\n✅ Sample data seeded!');
  console.log(`   Students: ${studentRecords.length} (STU-0001 .. STU-${String(studentRecords.length).padStart(4, '0')})`);
  console.log(`   Classes: ${classes.length} · Timetable slots: ${ttDefs.length} · Attendance sessions: ${sessionDates.length}`);
  console.log(`   Fees for STU-0001: ${mainFees.length} (paid + pending + overdue)`);
  console.log('   Pending verifications + verified receipts created for the Finance Suite.\n');
}

main()
  .catch((e) => { console.error('Sample seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
