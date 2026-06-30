const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { email: 'admin@school.com' },
    data: { role: 'Admin' }
  });
  console.log('User role updated successfully:', user);
}

main().finally(() => prisma.$disconnect());
