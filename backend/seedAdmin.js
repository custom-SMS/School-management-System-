const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@school.com';
  const superadminEmail = 'superadmin@school.com';
  const cashierEmail = 'cashier@school.com';

  const adminHashed = await bcrypt.hash('admin', 10);
  const superadminHashed = await bcrypt.hash('superadmin', 10);
  const cashierHashed = await bcrypt.hash('cashier', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: adminHashed },
    create: {
      name: 'System Administrator',
      email: adminEmail,
      password: adminHashed,
      role: 'Admin'
    }
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: superadminEmail },
    update: { password: superadminHashed },
    create: {
      name: 'Super Admin User',
      email: superadminEmail,
      password: superadminHashed,
      role: 'SuperAdmin'
    }
  });

  const cashier = await prisma.user.upsert({
    where: { email: cashierEmail },
    update: { password: cashierHashed },
    create: {
      name: 'School Cashier',
      email: cashierEmail,
      password: cashierHashed,
      role: 'Cashier'
    }
  });

  // Seed a known Teacher account (User + Teacher profile) so the Teacher Portal is testable.
  const teacherEmail = 'teacher@school.com';
  const teacherId = 'TCH-0001';
  const teacherHashed = await bcrypt.hash('teacher', 10);

  const teacherUser = await prisma.user.upsert({
    where: { email: teacherEmail },
    update: { password: teacherHashed, role: 'Teacher' },
    create: {
      name: 'Abebe Kebede',
      email: teacherEmail,
      password: teacherHashed,
      role: 'Teacher'
    }
  });

  const teacher = await prisma.teacher.upsert({
    where: { teacherId },
    update: { userId: teacherUser.id, subject: 'Mathematics' },
    create: {
      userId: teacherUser.id,
      teacherId,
      subject: 'Mathematics'
    }
  });

  // Seed a known Student account (User + Student profile) for testing the Student Portal.
  const studentEmail = 'student@school.com';
  const studentId = 'STU-0001';
  const studentHashed = await bcrypt.hash('student', 10);

  const studentUser = await prisma.user.upsert({
    where: { email: studentEmail },
    update: { password: studentHashed, role: 'Student' },
    create: {
      name: 'Abebe Balcha',
      email: studentEmail,
      password: studentHashed,
      role: 'Student'
    }
  });

  const student = await prisma.student.upsert({
    where: { studentId },
    update: { userId: studentUser.id, grade: 'Grade 10' },
    create: {
      userId: studentUser.id,
      studentId,
      grade: 'Grade 10'
    }
  });

  // Seed a known Parent account (User + Parent profile). Children are linked in seedSampleData.js.
  const parentEmail = 'parent@school.com';
  const parentId = 'PAR-0001';
  const parentHashed = await bcrypt.hash('parent', 10);

  const parentUser = await prisma.user.upsert({
    where: { email: parentEmail },
    update: { password: parentHashed, role: 'Parent' },
    create: {
      name: 'Balcha Demissie',
      email: parentEmail,
      password: parentHashed,
      role: 'Parent'
    }
  });

  const parent = await prisma.parent.upsert({
    where: { parentId },
    update: { userId: parentUser.id, fullName: 'Balcha Demissie' },
    create: {
      userId: parentUser.id,
      parentId,
      fullName: 'Balcha Demissie',
      email: parentEmail,
      phone: '+251 911 223 344',
      relationship: 'Father'
    }
  });

  // Seed default permissions for all roles
  const defaultPermissions = {
    Admin: ['manage_academic_year', 'generate_reports', 'manage_users'],
    Cashier: ['manage_fees', 'verify_payments'],
    Teacher: ['student_registration', 'manage_grades', 'manage_attendance'],
    Student: [],
    Parent: [],
  };

  for (const [role, perms] of Object.entries(defaultPermissions)) {
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: { role_permission: { role, permission: perm } },
        update: {},
        create: { role, permission: perm }
      });
    }
  }

  console.log('\n✅ Seed data is ready!\n');
  console.log('--- Login Details ---');
  console.log(`Admin Email:        ${admin.email} (Password: admin)`);
  console.log(`SuperAdmin Email:   ${superAdmin.email} (Password: superadmin)`);
  console.log(`Cashier Email:      ${cashier.email} (Password: cashier)`);
  console.log(`Teacher Login:      ${teacher.teacherId} or ${teacherUser.email} (Password: teacher)`);
  console.log(`Student Login:      ${student.studentId} or ${studentUser.email} (Password: student)`);
  console.log(`Parent Login:       ${parent.parentId} or ${parentUser.email} (Password: parent)`);
  console.log('---------------------\n');
}

main()
  .catch((e) => {
    console.error('Error creating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
