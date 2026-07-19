/**
 * UAT Database Seed Script
 * 
 * This script seeds the UAT database with realistic test data for user acceptance testing.
 * Run with: node seeds/uat/index.js
 */

const prisma = require('../../prisma');
const bcrypt = require('bcryptjs');

// Seed scripts in order
const seedScripts = [
  require('./01_cleanup'),
  require('./02_school_structure'),
  require('./03_users'),
  require('./04_academic_setup'),
  require('./05_classes_sections'),
  require('./06_enrollments'),
  require('./07_teachers_assignments'),
  require('./08_grading_setup'),
  require('./09_attendance_data'),
  require('./10_grades_data'),
  require('./11_fees_payments'),
  require('./12_report_cards'),
  require('./13_notifications'),
  require('./14_timetable'),
];

async function main() {
  console.log('🌱 Starting UAT database seeding...\n');

  try {
    for (const seedScript of seedScripts) {
      console.log(`\n📝 Running: ${seedScript.name}`);
      await seedScript.seed(prisma, bcrypt);
      console.log(`✅ Completed: ${seedScript.name}`);
    }

    console.log('\n✨ UAT database seeding completed successfully!');
    console.log('\n📊 Test Accounts:');
    console.log('  Super Admin: superadmin@school.test / Test@1234');
    console.log('  Branch Admins: admin.branch1@school.test, admin.branch2@school.test, admin.branch3@school.test / Test@1234');
    console.log('  Teachers: teacher.math@school.test, teacher.science@school.test, etc. / Test@1234');
    console.log('  Cashiers: cashier.branch1@school.test, cashier.branch2@school.test, cashier.branch3@school.test / Test@1234');
    console.log('  Students: student.grade1.01@school.test, student.grade1.02@school.test, etc. / Test@1234');
    console.log('  Parents: parent.01@school.test, parent.02@school.test, etc. / Test@1234');

  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
