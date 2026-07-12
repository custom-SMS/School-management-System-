const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateData() {
  try {
    const gradesToUpdate = ['Grade 11', '11', 'Grade 12', '12', 'Class 11', 'Class 12'];

    console.log('Updating students...');
    const updatedStudents = await prisma.student.updateMany({
      where: {
        grade: { in: gradesToUpdate },
        stream: null
      },
      data: {
        stream: 'Natural Science'
      }
    });
    console.log(`Updated ${updatedStudents.count} students.`);

    console.log('Updating enrollments...');
    const updatedEnrollments = await prisma.enrollment.updateMany({
      where: {
        grade: { in: gradesToUpdate },
        stream: null
      },
      data: {
        stream: 'Natural Science'
      }
    });
    console.log(`Updated ${updatedEnrollments.count} enrollments.`);

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateData();
