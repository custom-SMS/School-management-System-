const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const res = await prisma.teacherAssignment.findFirst({
      select: { id: true, assignmentType: true }
    });
    console.log('SUCCESS, assignmentType available', res);
  } catch(e) {
    console.error('FAILED:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
