/**
 * Academic Setup Seed
 * Creates academic years and semesters
 */

async function seed(prisma) {
  console.log('  📅 Creating academic years and semesters...');

  const { branches } = global.uatData;

  // Create Academic Years
  const currentYear = new Date().getFullYear();
  const academicYears = await Promise.all([
    prisma.academicYear.create({
      data: {
        year: `${currentYear - 1}-${currentYear}`,
        isActive: false,
      }
    }),
    prisma.academicYear.create({
      data: {
        year: `${currentYear}-${currentYear + 1}`,
        isActive: true,
      }
    })
  ]);

  // Create Semesters for each academic year
  const semesters = [];
  for (const year of academicYears) {
    const semester1 = await prisma.semester.create({
      data: {
        name: 'Semester 1',
        order: 1,
        academicYearId: year.id,
        startDate: new Date(parseInt(year.year.split('-')[0]), 8, 1),
        endDate: new Date(parseInt(year.year.split('-')[0]), 11, 31),
        isActive: year.isActive,
      }
    });
    
    const semester2 = await prisma.semester.create({
      data: {
        name: 'Semester 2',
        order: 2,
        academicYearId: year.id,
        startDate: new Date(parseInt(year.year.split('-')[0]) + 1, 0, 1),
        endDate: new Date(parseInt(year.year.split('-')[1]), 5, 30),
        isActive: false,
      }
    });
    
    semesters.push(semester1, semester2);
  }

  console.log(`  ✅ Created ${academicYears.length} academic years, ${semesters.length} semesters`);
  
  global.uatData.academic = {
    academicYears,
    semesters,
    activeYear: academicYears[1],
    activeSemester: semesters[2], // First semester of current year
  };
}

module.exports = { name: '04_academic_setup', seed };
