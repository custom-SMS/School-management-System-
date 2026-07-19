/**
 * Grading Setup Seed
 * Creates grading structures for each branch/level
 */

async function seed(prisma) {
  console.log('  📊 Creating grading structures...');

  const { branches, levels } = global.uatData;
  const { activeYear } = global.uatData.academic;

  const gradingStructures = [];
  
  // Create grading structure for each level in each branch
  for (const branch of branches) {
    for (const level of levels) {
      if (level.branchId !== branch.id) continue;
      
      const structure = await prisma.gradingStructure.create({
        data: {
          name: `${level.name} Grading Structure`,
          branchId: branch.id,
          levelId: level.id,
          academicYearId: activeYear.id,
          passMark: 50,
          components: [
            { name: 'Quiz', weight: 10, maxMarks: 20 },
            { name: 'Assignment', weight: 20, maxMarks: 30 },
            { name: 'Midterm', weight: 30, maxMarks: 50 },
            { name: 'Final', weight: 40, maxMarks: 100 }
          ]
        }
      });
      gradingStructures.push(structure);
    }
  }

  console.log(`  ✅ Created ${gradingStructures.length} grading structures`);
  
  global.uatData.grading = gradingStructures;
}

module.exports = { name: '08_grading_setup', seed };
