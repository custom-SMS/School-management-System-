const prisma = require('./prisma');

async function findMissingGrading(targetYearId, sourceAcademicYearId) {
  try {
    const sourceGrading = await prisma.gradingStructure.findMany({
      where: { academicYearId: sourceAcademicYearId },
      select: { id: true, name: true, branchId: true, levelId: true },
    });

    const targetGrading = await prisma.gradingStructure.findMany({
      where: { academicYearId: targetYearId },
      select: { id: true, name: true, branchId: true, levelId: true },
    });

    console.log('=== SOURCE GRADING STRUCTURES ===');
    sourceGrading.forEach(g => {
      console.log(`- ${g.name} (Branch: ${g.branchId || 'N/A'}, Level: ${g.levelId || 'N/A'})`);
    });

    console.log('\n=== TARGET GRADING STRUCTURES ===');
    targetGrading.forEach(g => {
      console.log(`- ${g.name} (Branch: ${g.branchId || 'N/A'}, Level: ${g.levelId || 'N/A'})`);
    });

    const missing = sourceGrading.filter(sg => 
      !targetGrading.some(tg => 
        tg.name === sg.name && 
        tg.branchId === sg.branchId && 
        tg.levelId === sg.levelId
      )
    );

    if (missing.length > 0) {
      console.log('\n=== MISSING GRADING STRUCTURES ===');
      missing.forEach(g => {
        console.log(`- ${g.name} (Branch: ${g.branchId || 'N/A'}, Level: ${g.levelId || 'N/A'})`);
      });
    } else {
      console.log('\n✓ All grading structures cloned successfully');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

findMissingGrading('80134bd4-e645-497d-bfe5-c2530d621a6e', process.argv[2]);
