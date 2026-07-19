require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, isActive: true, password: true }
  });
  console.log("Users in DB:", users.length);
  const sa = users.find(u => u.email === 'superadmin@school.com');
  console.log("Superadmin:", sa);
}

main().catch(console.error).finally(() => prisma.$disconnect());
