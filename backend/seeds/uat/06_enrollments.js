/**
 * Enrollments Seed
 * Enrolls students in classes and sections
 */

async function seed(prisma) {
  console.log('  📝 Creating student enrollments...');

  const { branches, users, classes } = global.uatData;
  const { activeYear } = global.uatData.academic;

  const enrollments = [];
  const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
  
  // Enroll students in appropriate classes based on their grade
  for (let branchIdx = 0; branchIdx < branches.length; branchIdx++) {
    const branchStudents = users.students.filter(s => s.studentProfile.branchId === branches[branchIdx].id);
    const branchClasses = classes.classes.filter(c => c.branchId === branches[branchIdx].id);
    
    for (const student of branchStudents) {
      const studentGrade = student.studentProfile.grade;
      const matchingClass = branchClasses.find(c => c.grade === studentGrade);
      
      if (matchingClass) {
        // Find sections for this class
        const classSections = classes.sections.filter(s => s.classId === matchingClass.id);
        const section = classSections[Math.floor(Math.random() * classSections.length)];
        
        if (section) {
          const enrollment = await prisma.enrollment.create({
            data: {
              studentId: student.studentProfile.id,
              sectionId: section.id,
              academicYearId: activeYear.id,
              grade: studentGrade,
              status: 'Enrolled',
            }
          });
          enrollments.push(enrollment);
        }
      }
    }
  }

  console.log(`  ✅ Created ${enrollments.length} enrollments`);
  
  global.uatData.enrollments = enrollments;
}

module.exports = { name: '06_enrollments', seed };
