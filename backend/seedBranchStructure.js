/**
 * seedBranchStructure.js
 * 
 * One-time migration script:
 * 1. Creates the default School and main Branch from existing settings
 * 2. Creates default EducationalLevels
 * 3. Backfills branchId onto all existing Class, Student, Teacher records
 * 4. Converts existing Admin users into UserScope (BranchAdmin)
 * 5. Fixes AcademicYear unique constraint (sets branchId on all existing years)
 * 6. Fixes FeeStructure unique constraint (sets branchId on all existing records)
 *
 * Run once: node seedBranchStructure.js
 */

require('dotenv').config();
const prisma = require('./prisma');

async function main() {
  console.log('🚀 Starting branch structure migration...\n');

  // ── 1. Create School ──────────────────────────────────────────────────────
  let school = await prisma.school.findFirst();
  if (!school) {
    // Try to get school name from system settings
    const brandingSetting = await prisma.systemSetting.findUnique({ where: { key: 'branding' } });
    const branding = brandingSetting?.value || {};
    const schoolName = branding.institutionNameEn || 'Main School';

    school = await prisma.school.create({
      data: {
        name: schoolName,
        code: 'MAIN',
        isActive: true,
      },
    });
    console.log(`✅ Created school: "${school.name}" (${school.id})`);
  } else {
    console.log(`ℹ️  School already exists: "${school.name}" (${school.id})`);
  }

  // ── 2. Create Main Branch ─────────────────────────────────────────────────
  let branch = await prisma.branch.findFirst({ where: { schoolId: school.id } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        schoolId: school.id,
        name: 'Main Campus',
        code: 'MAIN',
        isActive: true,
      },
    });
    console.log(`✅ Created branch: "${branch.name}" (${branch.id})`);
  } else {
    console.log(`ℹ️  Branch already exists: "${branch.name}" (${branch.id})`);
  }

  // ── 3. Create default EducationalLevels ───────────────────────────────────
  const defaultLevels = [
    { name: 'Kindergarten',  order: 1, gradeRange: 'KG' },
    { name: 'Elementary',    order: 2, gradeRange: 'Grade 1–6' },
    { name: 'Middle School', order: 3, gradeRange: 'Grade 7–8' },
    { name: 'High School',   order: 4, gradeRange: 'Grade 9–10' },
    { name: 'Preparatory',   order: 5, gradeRange: 'Grade 11–12' },
  ];

  for (const lvl of defaultLevels) {
    const existing = await prisma.educationalLevel.findUnique({
      where: { branchId_name: { branchId: branch.id, name: lvl.name } },
    });
    if (!existing) {
      await prisma.educationalLevel.create({
        data: { branchId: branch.id, ...lvl },
      });
      console.log(`✅ Created level: "${lvl.name}"`);
    } else {
      console.log(`ℹ️  Level already exists: "${lvl.name}"`);
    }
  }

  const branchId = branch.id;

  // ── 4. Fix AcademicYear unique constraint ─────────────────────────────────
  // Old schema: @@unique([year]) — new: @@unique([year, branchId])
  // Set branchId on all existing years that have no branchId
  const yearsToFix = await prisma.academicYear.findMany({
    where: { branchId: null },
  });
  if (yearsToFix.length > 0) {
    await prisma.academicYear.updateMany({
      where: { branchId: null },
      data: { branchId },
    });
    console.log(`✅ Backfilled branchId on ${yearsToFix.length} academic year(s)`);
  }

  // ── 5. Fix FeeStructure unique constraint ─────────────────────────────────
  const feesToFix = await prisma.feeStructure.findMany({
    where: { branchId: null },
  });
  if (feesToFix.length > 0) {
    await prisma.feeStructure.updateMany({
      where: { branchId: null },
      data: { branchId },
    });
    console.log(`✅ Backfilled branchId on ${feesToFix.length} fee structure(s)`);
  }

  // ── 6. Backfill branchId on Class ─────────────────────────────────────────
  const classResult = await prisma.class.updateMany({
    where: { branchId: null },
    data: { branchId },
  });
  console.log(`✅ Backfilled branchId on ${classResult.count} class(es)`);

  // ── 7. Backfill branchId on Student ───────────────────────────────────────
  const studentResult = await prisma.student.updateMany({
    where: { branchId: null },
    data: { branchId },
  });
  console.log(`✅ Backfilled branchId on ${studentResult.count} student(s)`);

  // ── 8. Backfill branchId on Teacher ───────────────────────────────────────
  const teacherResult = await prisma.teacher.updateMany({
    where: { branchId: null },
    data: { branchId },
  });
  console.log(`✅ Backfilled branchId on ${teacherResult.count} teacher(s)`);

  // ── 9. Convert existing Admin users to UserScope (BranchAdmin) ────────────
  const adminUsers = await prisma.user.findMany({
    where: { role: 'Admin' },
  });

  for (const admin of adminUsers) {
    const existing = await prisma.userScope.findFirst({
      where: { userId: admin.id },
    });
    if (!existing) {
      await prisma.userScope.create({
        data: {
          userId:    admin.id,
          scopeType: 'BranchAdmin',
          schoolId:  school.id,
          branchId:  branch.id,
          levelId:   null,
        },
      });
      console.log(`✅ Created UserScope (BranchAdmin) for Admin: ${admin.name}`);
    } else {
      console.log(`ℹ️  UserScope already exists for: ${admin.name}`);
    }
  }

  // ── 10. Convert existing Cashier users to UserScope (Cashier) ─────────────
  const cashierUsers = await prisma.user.findMany({
    where: { role: 'Cashier' },
  });

  for (const cashier of cashierUsers) {
    const existing = await prisma.userScope.findFirst({
      where: { userId: cashier.id },
    });
    if (!existing) {
      await prisma.userScope.create({
        data: {
          userId:    cashier.id,
          scopeType: 'Cashier',
          schoolId:  school.id,
          branchId:  branch.id,
          levelId:   null,
        },
      });
      console.log(`✅ Created UserScope (Cashier) for: ${cashier.name}`);
    }
  }

  console.log('\n✅ Branch structure migration complete!');
  console.log(`\nSchool ID : ${school.id}`);
  console.log(`Branch ID : ${branchId}`);
  console.log('\nAdd these to your .env for reference:');
  console.log(`DEFAULT_SCHOOL_ID=${school.id}`);
  console.log(`DEFAULT_BRANCH_ID=${branchId}`);
}

main()
  .catch((err) => { console.error('❌ Migration failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
