const prisma = require('./prisma');
async function test() {
  try {
    const fees = await prisma.fee.findMany({
      where: { studentId: 'test' },
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log('Success:', fees);
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
