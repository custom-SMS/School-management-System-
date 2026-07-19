/**
 * Report Cards Seed
 * Creates report card data for previous semester
 */

async function seed(prisma) {
  console.log('  📄 Creating report cards...');

  const { branches, users, classes } = global.uatData;
  const { academicYears, semesters, activeSemester } = global.uatData.academic;
  const { grades } = global.uatData;

  const reportCards = [];
  
  // Get previous semester
  const previousSemester = semesters.find(s => s.id !== activeSemester.id && s.academicYearId === activeSemester.academicYearId);
  
  if (previousSemester) {
    // Create report cards for each student
    for (const student of users.students) {
      if (student.studentProfile) {
        const studentGrades = grades.filter(g => g.studentId === student.studentProfile.id && g.semesterId === previousSemester.id);
        
        if (studentGrades.length > 0) {
          const averagePercentage = studentGrades.reduce((sum, g) => sum + g.percentage, 0) / studentGrades.length;
          
          const reportCard = await prisma.reportCard.create({
            data: {
              studentId: student.studentProfile.id,
              academicYearId: previousSemester.academicYearId,
              semesterId: previousSemester.id,
              grade: student.studentProfile.grade,
              overallPercentage: Math.round(averagePercentage),
              overallGrade: averagePercentage >= 90 ? 'A' : averagePercentage >= 80 ? 'B' : averagePercentage >= 70 ? 'C' : averagePercentage >= 60 ? 'D' : 'F',
              status: 'Published',
              publishedDate: new Date(),
              remarks: 'Good performance overall. Keep up the good work!',
            }
          });
          reportCards.push(reportCard);
        }
      }
    }
  }

  console.log(`  ✅ Created ${reportCards.length} report cards`);
  
  global.uatData.reportCards = reportCards;
}

module.exports = { name: '12_report_cards', seed };
