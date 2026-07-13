/**
 * seedSemesters.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time migration helper:
 *  1. Creates Semester 1 + Semester 2 for every existing AcademicYear that
 *     doesn't already have semesters.
 *  2. Sets exactly ONE semester globally active: Semester 1 of the currently
 *     active AcademicYear (or the most recent year if none is active).
 *  3. Backfills semesterId = Semester 1 id on all existing Grade, ReportCard,
 *     and Timetable rows that have no semesterId yet.
 *
 * Run once:  node migrations/seedSemesters.js
 */

const prisma = require('../prisma');

async function main() {
  console.log('🌱 Seeding semesters for all academic years…');

  const allYears = await prisma.academicYear.findMany({
    include: { semesters: true },
    orderBy: { year: 'asc' },
  });

  if (allYears.length === 0) {
    console.log('  No academic years found — nothing to seed.');
    return;
  }

  // ── 1. Ensure every year has exactly 2 semesters ──────────────────────────
  for (const year of allYears) {
    const existingNames = new Set(year.semesters.map((s) => s.name));

    if (!existingNames.has('Semester 1')) {
      await prisma.semester.create({
        data: {
          academicYearId: year.id,
          name: 'Semester 1',
          order: 1,
          isActive: false,
        },
      });
      console.log(`  Created Semester 1 for ${year.year}`);
    }

    if (!existingNames.has('Semester 2')) {
      await prisma.semester.create({
        data: {
          academicYearId: year.id,
          name: 'Semester 2',
          order: 2,
          isActive: false,
        },
      });
      console.log(`  Created Semester 2 for ${year.year}`);
    }
  }

  // ── 2. Set exactly one global active semester ─────────────────────────────
  // Prefer Semester 1 of the active academic year; fall back to the latest year.
  const activeYear =
    allYears.find((y) => y.isActive) || allYears[allYears.length - 1];

  // Reload semesters for the chosen year (they may have just been created)
  const activeSemesters = await prisma.semester.findMany({
    where: { academicYearId: activeYear.id },
    orderBy: { order: 'asc' },
  });

  const sem1 = activeSemesters.find((s) => s.order === 1);
  if (!sem1) {
    console.error('  Could not find Semester 1 for the active year — aborting activation step.');
  } else {
    // Deactivate ALL semesters first
    await prisma.semester.updateMany({ data: { isActive: false } });
    // Activate Semester 1 of the active year
    await prisma.semester.update({ where: { id: sem1.id }, data: { isActive: true } });
    console.log(`  ✅ Globally active semester set to "${sem1.name}" (${activeYear.year})`);
  }

  // ── 3. Backfill existing records → Semester 1 of their academic year ──────
  // For Grade rows
  const gradesWithoutSemester = await prisma.grade.findMany({
    where: { semesterId: null, academicYearId: { not: null } },
    select: { id: true, academicYearId: true },
  });

  if (gradesWithoutSemester.length > 0) {
    // Build a map: academicYearId -> Semester 1 id
    const yearToSem1 = new Map();
    const distinctYearIds = [...new Set(gradesWithoutSemester.map((g) => g.academicYearId))];
    for (const yid of distinctYearIds) {
      const s1 = await prisma.semester.findFirst({ where: { academicYearId: yid, order: 1 } });
      if (s1) yearToSem1.set(yid, s1.id);
    }

    let gradeBackfilled = 0;
    for (const grade of gradesWithoutSemester) {
      const semId = yearToSem1.get(grade.academicYearId);
      if (semId) {
        await prisma.grade.update({ where: { id: grade.id }, data: { semesterId: semId } });
        gradeBackfilled++;
      }
    }
    console.log(`  ✅ Backfilled semesterId on ${gradeBackfilled} grade record(s)`);
  } else {
    console.log('  No grade records need backfilling.');
  }

  // For ReportCard rows
  const reportCardsWithout = await prisma.reportCard.findMany({
    where: { semesterId: null },
    select: { id: true, academicYearId: true },
  });

  if (reportCardsWithout.length > 0) {
    const yearToSem1Rc = new Map();
    const distinctYearIdsRc = [...new Set(reportCardsWithout.map((r) => r.academicYearId))];
    for (const yid of distinctYearIdsRc) {
      const s1 = await prisma.semester.findFirst({ where: { academicYearId: yid, order: 1 } });
      if (s1) yearToSem1Rc.set(yid, s1.id);
    }

    let rcBackfilled = 0;
    for (const rc of reportCardsWithout) {
      const semId = yearToSem1Rc.get(rc.academicYearId);
      if (semId) {
        await prisma.reportCard.update({ where: { id: rc.id }, data: { semesterId: semId } });
        rcBackfilled++;
      }
    }
    console.log(`  ✅ Backfilled semesterId on ${rcBackfilled} report card(s)`);
  } else {
    console.log('  No report cards need backfilling.');
  }

  // For Timetable rows
  const timetablesWithout = await prisma.timetable.findMany({
    where: { semesterId: null },
    select: { id: true, academicYearId: true },
  });

  if (timetablesWithout.length > 0) {
    const yearToSem1Tt = new Map();
    const distinctYearIdsTt = [...new Set(timetablesWithout.map((t) => t.academicYearId))];
    for (const yid of distinctYearIdsTt) {
      const s1 = await prisma.semester.findFirst({ where: { academicYearId: yid, order: 1 } });
      if (s1) yearToSem1Tt.set(yid, s1.id);
    }

    let ttBackfilled = 0;
    for (const tt of timetablesWithout) {
      const semId = yearToSem1Tt.get(tt.academicYearId);
      if (semId) {
        await prisma.timetable.update({ where: { id: tt.id }, data: { semesterId: semId } });
        ttBackfilled++;
      }
    }
    console.log(`  ✅ Backfilled semesterId on ${ttBackfilled} timetable entry(ies)`);
  } else {
    console.log('  No timetable entries need backfilling.');
  }

  console.log('\n🎉 Semester seeding complete.');
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
