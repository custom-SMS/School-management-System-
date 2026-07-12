const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const branchAdminScope = await prisma.userScope.findFirst({
    where: { scopeType: 'BranchAdmin' }
  });
  
  const branchId = branchAdminScope.branchId;
  
  const where = {
    NOT: {
      OR: [
        { studentProfile: { branchId } },
        { teacherProfile: { branchId } },
        { parentProfile: { children: { some: { branchId } } } },
        { userScope: { some: { branchId } } }
      ]
    }
  };
  
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      role: true,
      studentProfile: { select: { branchId: true } },
      teacherProfile: { select: { branchId: true } },
      userScope: { select: { branchId: true } }
    }
  });
  
  console.log("Excluded users:", users.length);
  for (const u of users) {
    let branch = u.studentProfile?.branchId || u.teacherProfile?.branchId || u.userScope?.[0]?.branchId || 'Unknown';
    console.log(`- ${u.name} (${u.role}) [Branch: ${branch}]`);
  }
}

test().catch(console.error).finally(() => prisma.$disconnect());
