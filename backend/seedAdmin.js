const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@school.com';
  const plainPassword = 'admin'; // Easy password for testing
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword, // Reset password if user already exists
    },
    create: {
      name: 'System Administrator',
      email: email,
      password: hashedPassword,
      role: 'Admin'
    }
  });

  console.log('\n✅ Admin user is ready!\n');
  console.log('--- Login Details ---');
  console.log(`Email:    ${admin.email}`);
  console.log(`Password: ${plainPassword}`);
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
