const prisma = require('./prisma');

async function verifyClone(targetYearId, sourceAcademicYearId) {
  try {
    console.log('Verifying clone operation...\n');

    const targetYear = await prisma.academicYear.findUnique({
      where: { id: targetYearId },
      include: {
        classes: {
          include: {
            sections: true,
            classSubjects: true,
            assignments: true,
          },
        },
        feeStructures: true,
        gradingStructures: true,
      },
    });

    const sourceYear = await prisma.academicYear.findUnique({
      where: { id: sourceAcademicYearId },
      include: {
        classes: {
          include: {
            sections: true,
            classSubjects: true,
            assignments: true,
          },
        },
        feeStructures: true,
        gradingStructures: true,
      },
    });

    console.log(`Target Year: ${targetYear.year}`);
    console.log(`Source Year: ${sourceYear.year}\n`);

    console.log('=== CLONED DATA IN TARGET YEAR ===');
    console.log(`Classes: ${targetYear.classes.length}`);
    console.log(`Sections: ${targetYear.classes.reduce((sum, c) => sum + c.sections.length, 0)}`);
    console.log(`Class Subjects: ${targetYear.classes.reduce((sum, c) => sum + c.classSubjects.length, 0)}`);
    console.log(`Teacher Assignments: ${targetYear.classes.reduce((sum, c) => sum + c.assignments.length, 0)}`);
    console.log(`Fee Structures: ${targetYear.feeStructures.length}`);
    console.log(`Grading Structures: ${targetYear.gradingStructures.length}\n`);

    console.log('=== SOURCE DATA FOR COMPARISON ===');
    console.log(`Classes: ${sourceYear.classes.length}`);
    console.log(`Sections: ${sourceYear.classes.reduce((sum, c) => sum + c.sections.length, 0)}`);
    console.log(`Class Subjects: ${sourceYear.classes.reduce((sum, c) => sum + c.classSubjects.length, 0)}`);
    console.log(`Teacher Assignments: ${sourceYear.classes.reduce((sum, c) => sum + c.assignments.length, 0)}`);
    console.log(`Fee Structures: ${sourceYear.feeStructures.length}`);
    console.log(`Grading Structures: ${sourceYear.gradingStructures.length}\n`);

    if (targetYear.classes.length > 0) {
      console.log('=== SAMPLE CLASSES IN TARGET YEAR ===');
      targetYear.classes.slice(0, 5).forEach(c => {
        console.log(`- ${c.name} (Grade: ${c.grade || 'N/A'})`);
        console.log(`  Sections: ${c.sections.map(s => s.name).join(', ') || 'None'}`);
        console.log(`  Subjects: ${c.classSubjects.length}`);
        console.log(`  Assignments: ${c.assignments.length}`);
      });
    }

    await prisma.$disconnect();
    console.log('\n✓ Verification complete');
  } catch (error) {
    console.error('Error during verification:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Get IDs from command line arguments
const targetYearId = process.argv[2];
const sourceAcademicYearId = process.argv[3];

if (!targetYearId || !sourceAcademicYearId) {
  console.log('Usage: node verify-clone.js <targetYearId> <sourceAcademicYearId>');
  console.log('Example: node verify-clone.js 80134bd4-e645-497d-bfe5-c2530d621a6e <sourceId>');
  process.exit(1);
}

verifyClone(targetYearId, sourceAcademicYearId);
