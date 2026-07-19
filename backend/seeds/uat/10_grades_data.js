/**
 * Grades Data Seed
 * Creates grade entries for students
 */

async function seed(prisma) {
  console.log('  📝 Creating grade entries...');

  const { classes, sections } = global.uatData.classes;
  const { enrollments } = global.uatData;
  const { activeSemester, activeYear } = global.uatData.academic;
  const { teachers } = global.uatData.users;

  const subjects = ['Mathematics', 'English', 'Science', 'History'];
  const gradesData = [];
  
  // Create grades for each student in each subject
  for (const classData of classes) {
    const classSections = sections.filter(s => s.classId === classData.id);
    const classTeacher = teachers.find(t => t.teacherProfile?.branchId === classData.branchId);
    const teacherId = classTeacher?.id;

    if (!teacherId) {
      console.warn(`  ⚠️ No teacher found for branch: ${classData.branchId}, skipping grades for class ${classData.name}`);
      continue;
    }
    
    for (const section of classSections) {
      const sectionEnrollments = enrollments.filter(e => e.sectionId === section.id);
      
      for (const enrollment of sectionEnrollments) {
        for (const subject of subjects) {
          // Generate random scores
          const quiz = Math.floor(Math.random() * 20) + 5;
          const assignment = Math.floor(Math.random() * 30) + 10;
          const midterm = Math.floor(Math.random() * 50) + 15;
          const final = Math.floor(Math.random() * 100) + 30;
          const total = quiz + assignment + midterm + final;
          const percentage = Math.round((total / 200) * 100);
          
          gradesData.push({
            studentId: enrollment.studentId,
            classId: classData.id,
            teacherId: teacherId,
            subject,
            semesterId: activeSemester.id,
            academicYearId: activeYear.id,
            quiz,
            assignment,
            midterm,
            final,
            total,
            percentage,
            submissionStatus: percentage >= 50 ? 'Approved' : 'Submitted',
          });
        }
      }
    }
  }

  if (gradesData.length > 0) {
    await prisma.grade.createMany({
      data: gradesData
    });
  }

  console.log(`  ✅ Created ${gradesData.length} grade entries`);
  
  // Fetch grades to store in global.uatData for subsequent steps (like report cards)
  const grades = await prisma.grade.findMany({
    where: { academicYearId: activeYear.id }
  });
  global.uatData.grades = grades;
}

module.exports = { name: '10_grades_data', seed };
