const prisma = require('./prisma');
async function test() {
  try {
    const payment = await prisma.payment.findFirst();
    console.log('Success:', payment);
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
