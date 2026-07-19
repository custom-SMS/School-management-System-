/**
 * School Structure Seed
 * Creates schools, branches, and educational levels
 */

async function seed(prisma) {
  console.log('  🏫 Creating school structure...');

  // Create School
  const school = await prisma.school.create({
    data: {
      name: 'Test International School',
      code: 'TIS',
      address: '123 Test Street, Test City',
      phone: '+1234567890',
      email: 'info@testschool.test',
    }
  });


  const branches = await Promise.all([
    prisma.branch.create({
      data: {
        name: 'Main Campus',
        code: 'MC',
        address: '123 Main Street, Downtown',
        phone: '+1234567891',
        schoolId: school.id,
      }
    }),
    prisma.branch.create({
      data: {
        name: 'North Campus',
        code: 'NC',
        address: '456 North Avenue, North District',
        phone: '+1234567892',
        schoolId: school.id,
      }
    }),
    prisma.branch.create({
      data: {
        name: 'South Campus',
        code: 'SC',
        address: '789 South Road, South District',
        phone: '+1234567893',
        schoolId: school.id,
      }
    })
  ]);

  // Create Educational Levels for each branch
  const levels = [];
  const levelNames = ['Primary School', 'Middle School', 'High School'];
  
  for (const branch of branches) {
    for (const levelName of levelNames) {
      const level = await prisma.educationalLevel.create({
        data: {
          name: levelName,
          branchId: branch.id,
        }
      });
      levels.push(level);
    }
  }

  console.log(`  ✅ Created 1 school, ${branches.length} branches, ${levels.length} levels`);
  
  // Store IDs for next scripts
  global.uatData = {
    school,
    branches,
    levels,
  };
}

module.exports = { name: '02_school_structure', seed };
