// Seed a test enrollment for the inactive year 2025-2026
// so you can verify the year switcher shows different counts.
const p = require('./prisma');

async function main() {
  const year2025 = await p.academicYear.findFirst({ where: { year: '2025-2026' } });
  if (!year2025) return console.log('Year 2025-2026 not found');

  // Pick the first existing student to create a test enrollment
  const student = await p.student.findFirst({ orderBy: { enrollmentDate: 'asc' } });
  if (!student) return console.log('No students found');

  // Check if enrollment already exists
  const existing = await p.enrollment.findFirst({
    where: { studentId: student.id, academicYearId: year2025.id }
  });
  if (existing) return console.log('Test enrollment already exists:', existing.id);

  const enrollment = await p.enrollment.create({
    data: {
      studentId: student.id,
      academicYearId: year2025.id,
      grade: 'Grade 1',   // what they were in 2025-2026
      status: 'Enrolled',
    }
  });

  console.log('Created test enrollment:', enrollment.id);
  console.log('Student:', student.studentId, '→ Grade 1 in 2025-2026');
  console.log('\nNow switch to 2025-2026 in the navbar — you should see exactly 1 student.');
  console.log('Switch back to 2026-2027 — you should see 193 students.');
}

main().catch(console.error).finally(() => p.$disconnect());
