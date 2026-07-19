/**
 * Classes and Sections Seed
 * Creates classes, sections, and subjects
 */

async function seed(prisma) {
  console.log('  📚 Creating classes, sections, and subjects...');

  const { branches, levels, users } = global.uatData;
  const { activeYear, activeSemester } = global.uatData.academic;

  // Create Subjects for each branch (unique by name per branch)
  const subjectNames = [
    'Mathematics', 'English', 'Science', 'Social Studies', 'Art', 'Physical Education', 'Music', 'Computer Basics',
    'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Computer Science', 'Advanced Math', 'English Literature',
    'World History', 'Economics'
  ];

  const allSubjects = [];
  for (const branch of branches) {
    for (const subjectName of subjectNames) {
      const subject = await prisma.subject.create({
        data: {
          name: subjectName,
          branchId: branch.id,
        }
      });
      allSubjects.push(subject);
    }
  }

  // Create Classes and Sections
  const classes = [];
  const sections = [];
  const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
  
  for (const branch of branches) {
    for (const grade of gradeLevels) {
      // Determine level based on grade
      let levelName = 'Primary School';
      if (['Grade 7', 'Grade 8'].includes(grade)) levelName = 'Middle School';
      if (['Grade 9', 'Grade 10'].includes(grade)) levelName = 'High School';
      
      const level = levels.find(l => l.name === levelName && l.branchId === branch.id);
      const levelId = level ? level.id : undefined;
      
      // Find math teacher for this branch
      const mathTeacher = users.teachers.find(
        t => t.teacherProfile?.subject === 'Math' && t.teacherProfile?.branchId === branch.id
      );
      
      // Create 1 class per grade
      const classData = await prisma.class.create({
        data: {
          name: `${grade} - ${branch.name}`,
          grade,
          stream: 'A',
          branchId: branch.id,
          levelId,
          academicYearId: activeYear.id,
          teacherId: mathTeacher?.teacherProfile?.id,
        }
      });
      classes.push(classData);

      // Create 2 sections per class
      for (let sectionNum = 1; sectionNum <= 2; sectionNum++) {
        const section = await prisma.section.create({
          data: {
            name: `${grade} - Section ${['A', 'B'][sectionNum - 1]}`,
            classId: classData.id,
            capacity: 30,
            academicYearId: activeYear.id,
          }
        });
        sections.push(section);
      }
    }
  }

  console.log(`  ✅ Created ${allSubjects.length} subjects, ${classes.length} classes, ${sections.length} sections`);
  
  global.uatData.classes = {
    subjects: allSubjects,
    classes,
    sections,
  };
}

module.exports = { name: '05_classes_sections', seed };
