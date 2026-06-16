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

  // Seed default permissions for Admin role
  const defaultAdminPermissions = ['student_registration', 'manage_academic_year'];
  for (const perm of defaultAdminPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permission: {
          role: 'Admin',
          permission: perm
        }
      },
      update: {},
      create: {
        role: 'Admin',
        permission: perm
      }
    });
  }

  console.log('\n✅ Seed data is ready!\n');
  console.log('--- Login Details ---');
  console.log(`Admin Email:        ${admin.email} (Password: admin)`);
  console.log(`SuperAdmin Email:   ${superAdmin.email} (Password: superadmin)`);
  console.log(`Cashier Email:      ${cashier.email} (Password: cashier)`);
  console.log(`Teacher Login:      ${teacher.teacherId} or ${teacherUser.email} (Password: teacher)`);
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
