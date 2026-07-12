const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  // Find a BranchAdmin
  const branchAdminScope = await prisma.userScope.findFirst({
    where: { scopeType: 'BranchAdmin' }
  });
  
  if (!branchAdminScope) {
    console.log("No BranchAdmin found");
    return;
  }
  
  const branchId = branchAdminScope.branchId;
  console.log("Testing with branchId:", branchId);
  
  const where = {
    OR: [
      { studentProfile: { branchId } },
      { teacherProfile: { branchId } },
      { parentProfile: { children: { some: { branchId } } } },
      { userScope: { some: { branchId } } }
    ]
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
  
  console.log("Users returned:", users.length);
  for (const u of users) {
    let branch = u.studentProfile?.branchId || u.teacherProfile?.branchId || u.userScope?.[0]?.branchId || 'Unknown (Parent?)';
    console.log(`- ${u.name} (${u.role}) [Branch: ${branch}]`);
  }
  
  // Now let's see how many users are in the DB total
  const total = await prisma.user.count();
  console.log("Total users in DB:", total);
  
}

test().catch(console.error).finally(() => prisma.$disconnect());
