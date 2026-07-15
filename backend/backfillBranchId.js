/**
 * Migration script to backfill branchId on existing data
 * Run: node backfillBranchId.js
 */

const prisma = require('./prisma');

async function main() {
  console.log('Starting branchId backfill...');

  // Get the default branch (first branch or create one)
  let defaultBranch = await prisma.branch.findFirst();
  
  if (!defaultBranch) {
    console.log('No branch found. Creating default branch...');
    const defaultSchool = await prisma.school.findFirst();
    if (!defaultSchool) {
      throw new Error('No school found. Please create a school first.');
    }
    
    defaultBranch = await prisma.branch.create({
      data: {
        name: 'Default Branch',
        schoolId: defaultSchool.id,
        location: 'Default Location'
      }
    });
    console.log(`Created default branch: ${defaultBranch.id}`);
  }

  console.log(`Using branch: ${defaultBranch.id} (${defaultBranch.name})`);

  // Backfill Subject
  const subjectResult = await prisma.subject.updateMany({
    where: { branchId: null },
    data: { branchId: defaultBranch.id }
  });
  console.log(`✅ Backfilled branchId on ${subjectResult.count} subject(s)`);

  // Backfill Class
  const classResult = await prisma.class.updateMany({
    where: { branchId: null },
    data: { branchId: defaultBranch.id }
  });
  console.log(`✅ Backfilled branchId on ${classResult.count} class(es)`);

  // Backfill Student
  const studentResult = await prisma.student.updateMany({
    where: { branchId: null },
    data: { branchId: defaultBranch.id }
  });
  console.log(`✅ Backfilled branchId on ${studentResult.count} student(s)`);

  // Backfill Teacher
  const teacherResult = await prisma.teacher.updateMany({
    where: { branchId: null },
    data: { branchId: defaultBranch.id }
  });
  console.log(`✅ Backfilled branchId on ${teacherResult.count} teacher(s)`);

  // Backfill AcademicYear
  const yearResult = await prisma.academicYear.updateMany({
    where: { branchId: null },
    data: { branchId: defaultBranch.id }
  });
  console.log(`✅ Backfilled branchId on ${yearResult.count} academic year(s)`);

  // Backfill FeeStructure
  const feeResult = await prisma.feeStructure.updateMany({
    where: { branchId: null },
    data: { branchId: defaultBranch.id }
  });
  console.log(`✅ Backfilled branchId on ${feeResult.count} fee structure(s)`);

  console.log('\n✅ BranchId backfill complete!');
  console.log(`\nDefault Branch ID: ${defaultBranch.id}`);
  console.log('Add this to your .env file:');
  console.log(`DEFAULT_BRANCH_ID=${defaultBranch.id}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
