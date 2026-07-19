/**
 * Teacher Assignments Seed
 * Assigns teachers to classes and sections
 */

async function seed(prisma) {
  console.log('  👨‍🏫 Creating teacher assignments...');

  const { branches, users, classes } = global.uatData;
  const { activeYear } = global.uatData.academic;

  const assignments = [];
  
  // Assign teachers to classes based on their subject
  for (const branch of branches) {
    const branchTeachers = users.teachers.filter(t => t.teacherProfile?.branchId === branch.id);
    const branchClasses = classes.classes.filter(c => c.branchId === branch.id);
    
    for (const classData of branchClasses) {
      // Assign subject teachers
      for (const teacher of branchTeachers) {
        if (teacher.teacherProfile) {
          const assignment = await prisma.teacherAssignment.create({
            data: {
              teacherId: teacher.teacherProfile.id,
              classId: classData.id,
              assignmentType: 'SubjectTeacher',
              assignedById: users.superAdmin.id,
              academicYearId: activeYear.id,
            }
          });
          assignments.push(assignment);
        }
      }
      
      // Assign homeroom teacher to first section
      const classSections = classes.sections.filter(s => s.classId === classData.id);
      if (classSections.length > 0) {
        const homeroomTeacher = branchTeachers[0]; // First teacher as homeroom
        if (homeroomTeacher && homeroomTeacher.teacherProfile) {
          await prisma.section.update({
            where: { id: classSections[0].id },
            data: { homeroomTeacherId: homeroomTeacher.teacherProfile.id }
          });
        }
      }
    }
  }

  console.log(`  ✅ Created ${assignments.length} teacher assignments`);
  
  global.uatData.assignments = assignments;
}

module.exports = { name: '07_teachers_assignments', seed };
