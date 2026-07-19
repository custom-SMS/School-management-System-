/**
 * Attendance Data Seed
 * Creates attendance records for the last 30 days
 */

async function seed(prisma) {
  console.log('  📋 Creating attendance records...');

  const { classes, sections } = global.uatData.classes;
  const { enrollments, users } = global.uatData;
  const { activeYear } = global.uatData.academic;

  const attendanceRecords = [];
  const statuses = ['Present', 'Present', 'Present', 'Present', 'Present', 'Late', 'Absent']; // Weighted towards present
  
  // Create attendance for last 5 days
  const today = new Date();
  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const attendanceDate = new Date(today);
    attendanceDate.setDate(today.getDate() - dayOffset);
    
    // Skip weekends
    if (attendanceDate.getDay() === 0 || attendanceDate.getDay() === 6) continue;
    
    for (const classData of classes) {
      const classSections = sections.filter(s => s.classId === classData.id);
      
      for (const section of classSections) {
        // Create attendance record for the section
        const attendance = await prisma.attendance.create({
          data: {
            classId: classData.id,
            date: attendanceDate,
            locked: dayOffset > 7, // Lock older records
            academicYearId: activeYear.id,
            recordedById: users.superAdmin.id,
          }
        });
        
        // Create attendance records for each student in the section
        const sectionEnrollments = enrollments.filter(e => e.sectionId === section.id);
        for (const enrollment of sectionEnrollments) {
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          await prisma.attendanceRecord.create({
            data: {
              attendanceId: attendance.id,
              studentId: enrollment.studentId,
              status,
            }
          });
          attendanceRecords.push({ attendanceId: attendance.id, studentId: enrollment.studentId, status });
        }
      }
    }
  }

  console.log(`  ✅ Created attendance records for 5 days`);
  
  global.uatData.attendance = attendanceRecords;
}

module.exports = { name: '09_attendance_data', seed };
