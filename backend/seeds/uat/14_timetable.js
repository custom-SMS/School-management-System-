/**
 * Timetable Seed
 * Creates weekly timetables for each class
 */

async function seed(prisma) {
  console.log('  📅 Creating timetables...');

  const { classes, sections, subjects } = global.uatData.classes;
  const { activeYear, activeSemester } = global.uatData.academic;

  const timetables = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = ['08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00'];

  // Create timetable for each class
  for (const classData of classes) {
    // Find sections for this class
    const classSections = sections.filter(s => s.classId === classData.id);
    const section = classSections[0]; // Link to first section if available
    
    // Find subjects for this branch
    const branchSubjects = subjects.filter(s => s.branchId === classData.branchId);
    
    if (branchSubjects.length === 0) continue;

    for (const day of days) {
      for (const timeSlot of timeSlots) {
        // Skip lunch break
        if (timeSlot === '12:00-13:00') continue;
        
        const subject = branchSubjects[Math.floor(Math.random() * branchSubjects.length)];
        const [startTime, endTime] = timeSlot.split('-');
        
        const timetable = await prisma.timetable.create({
          data: {
            classId: classData.id,
            sectionId: section ? section.id : null,
            subjectId: subject.id,
            dayOfWeek: day,
            startTime,
            endTime,
            academicYearId: activeYear.id,
            semesterId: activeSemester.id,
            room: `Room ${Math.floor(Math.random() * 20) + 1}`,
          }
        });
        timetables.push(timetable);
      }
    }
  }

  console.log(`  ✅ Created ${timetables.length} timetable entries`);
  
  global.uatData.timetables = timetables;
}

module.exports = { name: '14_timetable', seed };
