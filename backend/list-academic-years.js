const prisma = require('./prisma');

async function listAcademicYears() {
  try {
    const years = await prisma.academicYear.findMany({
      orderBy: { year: 'desc' },
      include: {
        classes: true,
        feeStructures: true,
        gradingStructures: true,
      },
    });

    console.log('=== ACADEMIC YEARS ===\n');
    years.forEach(y => {
      console.log(`ID: ${y.id}`);
      console.log(`Year: ${y.year}`);
      console.log(`Active: ${y.isActive}`);
      console.log(`Classes: ${y.classes.length}`);
      console.log(`Fee Structures: ${y.feeStructures.length}`);
      console.log(`Grading Structures: ${y.gradingStructures.length}`);
      console.log('---');
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

listAcademicYears();
