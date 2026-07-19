/**
 * Migration Script: Backfill academicYearId for existing records
 * 
 * This script backfills the new academicYearId field for existing records
 * before applying the schema migration that makes these fields required.
 * 
 * Run this before running: npx prisma db push
 */

const prisma = require('../prisma');

async function main() {
  console.log('🔄 Starting academic year backfill migration...\n');

  try {
    // Step 1: Find or create current active academic year
    console.log('📅 Finding or creating current academic year...');
    const currentYear = new Date().getFullYear();
    const yearString = `${currentYear}-${currentYear + 1}`;
    
    let activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });

    if (!activeYear) {
      console.log('  ⚠️  No active year found, creating one...');
      activeYear = await prisma.academicYear.create({
        data: {
          year: yearString,
          isActive: true,
          registrationOpen: true,
        }
      });
      console.log(`  ✅ Created academic year: ${yearString}`);
    } else {
      console.log(`  ✅ Found active academic year: ${activeYear.year}`);
    }

    const yearId = activeYear.id;

    // Step 2: Backfill Class records
    console.log('\n📚 Backfilling Class records...');
    const classesWithoutYear = await prisma.class.findMany({
      where: { academicYearId: null }
    });

    if (classesWithoutYear.length > 0) {
      console.log(`  Found ${classesWithoutYear.length} classes without academic year`);
      
      for (const classData of classesWithoutYear) {
        await prisma.class.update({
          where: { id: classData.id },
          data: { academicYearId: yearId }
        });
      }
      console.log(`  ✅ Updated ${classesWithoutYear.length} class records`);
    } else {
      console.log('  ✅ All classes already have academic year');
    }

    // Step 3: Backfill Section records
    console.log('\n📝 Backfilling Section records...');
    const sectionsWithoutYear = await prisma.section.findMany({
      where: { academicYearId: null }
    });

    if (sectionsWithoutYear.length > 0) {
      console.log(`  Found ${sectionsWithoutYear.length} sections without academic year`);
      
      for (const section of sectionsWithoutYear) {
        // Get academic year from the class
        const classData = await prisma.class.findUnique({
          where: { id: section.classId },
          select: { academicYearId: true }
        });
        
        await prisma.section.update({
          where: { id: section.id },
          data: { academicYearId: classData?.academicYearId || yearId }
        });
      }
      console.log(`  ✅ Updated ${sectionsWithoutYear.length} section records`);
    } else {
      console.log('  ✅ All sections already have academic year');
    }

    // Step 4: Backfill TeacherAssignment records
    console.log('\n👨‍🏫 Backfilling TeacherAssignment records...');
    const assignmentsWithoutYear = await prisma.teacherAssignment.findMany({
      where: { academicYearId: null }
    });

    if (assignmentsWithoutYear.length > 0) {
      console.log(`  Found ${assignmentsWithoutYear.length} assignments without academic year`);
      
      for (const assignment of assignmentsWithoutYear) {
        // Get academic year from the class if available
        let yearIdToUse = yearId;
        if (assignment.classId) {
          const classData = await prisma.class.findUnique({
            where: { id: assignment.classId },
            select: { academicYearId: true }
          });
          yearIdToUse = classData?.academicYearId || yearId;
        }
        
        await prisma.teacherAssignment.update({
          where: { id: assignment.id },
          data: { academicYearId: yearIdToUse }
        });
      }
      console.log(`  ✅ Updated ${assignmentsWithoutYear.length} teacher assignment records`);
    } else {
      console.log('  ✅ All teacher assignments already have academic year');
    }

    // Step 5: Backfill FeeStructure records
    console.log('\n💰 Backfilling FeeStructure records...');
    const feeStructuresWithoutYear = await prisma.feeStructure.findMany({
      where: { academicYearId: null }
    });

    if (feeStructuresWithoutYear.length > 0) {
      console.log(`  Found ${feeStructuresWithoutYear.length} fee structures without academic year`);
      
      for (const feeStructure of feeStructuresWithoutYear) {
        await prisma.feeStructure.update({
          where: { id: feeStructure.id },
          data: { 
            academicYearId: yearId,
            name: feeStructure.name || `Fee Structure ${feeStructure.grade || 'General'}`
          }
        });
      }
      console.log(`  ✅ Updated ${feeStructuresWithoutYear.length} fee structure records`);
    } else {
      console.log('  ✅ All fee structures already have academic year');
    }

    // Step 6: Backfill GradingStructure records
    console.log('\n📊 Backfilling GradingStructure records...');
    const gradingStructuresWithoutYear = await prisma.gradingStructure.findMany({
      where: { academicYearId: null }
    });

    if (gradingStructuresWithoutYear.length > 0) {
      console.log(`  Found ${gradingStructuresWithoutYear.length} grading structures without academic year`);
      
      for (const gradingStructure of gradingStructuresWithoutYear) {
        await prisma.gradingStructure.update({
          where: { id: gradingStructure.id },
          data: { 
            academicYearId: yearId,
            name: gradingStructure.name || `Grading Structure ${gradingStructure.levelId || 'General'}`
          }
        });
      }
      console.log(`  ✅ Updated ${gradingStructuresWithoutYear.length} grading structure records`);
    } else {
      console.log('  ✅ All grading structures already have academic year');
    }

    // Step 7: Backfill Fee records (make academicYearId required)
    console.log('\n💵 Backfilling Fee records...');
    const feesWithoutYear = await prisma.fee.findMany({
      where: { academicYearId: null }
    });

    if (feesWithoutYear.length > 0) {
      console.log(`  Found ${feesWithoutYear.length} fees without academic year`);
      
      for (const fee of feesWithoutYear) {
        await prisma.fee.update({
          where: { id: fee.id },
          data: { academicYearId: yearId }
        });
      }
      console.log(`  ✅ Updated ${feesWithoutYear.length} fee records`);
    } else {
      console.log('  ✅ All fees already have academic year');
    }

    console.log('\n✨ Academic year backfill migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Run: npx prisma db push');
    console.log('  2. Run: npx prisma generate');
    console.log('  3. Restart the server');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
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
