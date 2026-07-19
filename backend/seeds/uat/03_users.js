/**
 * Users Seed
 * Creates test accounts for all roles
 */

async function seed(prisma, bcrypt) {
  console.log('  👥 Creating test users...');

  const { branches } = global.uatData;
  const hashedPassword = await bcrypt.hash('Test@1234', 10);

  // Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'superadmin@school.test',
      password: hashedPassword,
      role: 'SuperAdmin',
      isActive: true,
    }
  });

  // Branch Admins (1 per branch)
  const branchAdmins = await Promise.all(branches.map((branch, index) => 
    prisma.user.create({
      data: {
        name: `Branch Admin ${branch.name}`,
        email: `admin.branch${index + 1}@school.test`,
        password: hashedPassword,
        role: 'Admin',
        isActive: true,
        userScope: {
          create: {
            scopeType: 'BranchAdmin',
            branchId: branch.id,
          }
        }
      }
    })
  ));

  // Teachers (4 per branch, different subjects)
  const subjects = ['Math', 'Science', 'English', 'History'];
  const teachers = [];
  
  for (let branchIdx = 0; branchIdx < branches.length; branchIdx++) {
    for (let subjectIdx = 0; subjectIdx < subjects.length; subjectIdx++) {
      const teacher = await prisma.user.create({
        data: {
          name: `Teacher ${subjects[subjectIdx]} ${branches[branchIdx].name}`,
          email: `teacher.${subjects[subjectIdx].toLowerCase()}${branchIdx + 1}@school.test`,
          password: hashedPassword,
          role: 'Teacher',
          isActive: true,
          userScope: {
            create: {
              scopeType: 'BranchAdmin',
              branchId: branches[branchIdx].id,
            }
          },
          teacherProfile: {
            create: {
              teacherId: `TCH${branchIdx + 1}${subjectIdx + 1}`,
              subject: subjects[subjectIdx],
              branchId: branches[branchIdx].id,
            }
          }
        },
        include: {
          teacherProfile: true
        }
      });
      teachers.push(teacher);
    }
  }

  // Cashiers (1 per branch)
  const cashiers = await Promise.all(branches.map((branch, index) =>
    prisma.user.create({
      data: {
        name: `Cashier ${branch.name}`,
        email: `cashier.branch${index + 1}@school.test`,
        password: hashedPassword,
        role: 'Cashier',
        isActive: true,
        userScope: {
          create: {
            scopeType: 'Cashier',
            branchId: branch.id,
          }
        }
      }
    })
  ));

  // Students (20 per branch, mixed grades)
  const students = [];
  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
  
  for (let branchIdx = 0; branchIdx < branches.length; branchIdx++) {
    for (let studentNum = 1; studentNum <= 20; studentNum++) {
      const grade = grades[(studentNum - 1) % grades.length];
      const student = await prisma.user.create({
        data: {
          name: `Student ${studentNum} ${branches[branchIdx].name}`,
          email: `student.b${branchIdx + 1}.${grade.toLowerCase().replace(' ', '')}.${String(studentNum).padStart(2, '0')}@school.test`,
          password: hashedPassword,
          role: 'Student',
          isActive: true,
          studentProfile: {
            create: {
              studentId: `STD${branchIdx + 1}${String(studentNum).padStart(3, '0')}`,
              grade,
              branchId: branches[branchIdx].id,
            }
          }
        },
        include: {
          studentProfile: true
        }
      });
      students.push(student);
    }
  }

  // Parents (30 accounts, each linked to 2 students)
  const parents = [];
  for (let parentNum = 1; parentNum <= 30; parentNum++) {
    const parent = await prisma.user.create({
      data: {
        name: `Parent ${parentNum}`,
        email: `parent.${String(parentNum).padStart(2, '0')}@school.test`,
        password: hashedPassword,
        role: 'Parent',
        isActive: true,
        parentProfile: {
          create: {
            parentId: `PAR${String(parentNum).padStart(3, '0')}`,
            fullName: `Parent ${parentNum}`,
            email: `parent.${String(parentNum).padStart(2, '0')}@school.test`,
            children: {
              connect: [
                { id: students[(parentNum - 1) * 2].studentProfile.id },
                { id: students[(parentNum - 1) * 2 + 1].studentProfile.id }
              ]
            }
          }
        }
      }
    });
    parents.push(parent);
  }

  console.log(`  ✅ Created ${1 + branchAdmins.length + teachers.length + cashiers.length + students.length + parents.length} users`);
  
  global.uatData.users = {
    superAdmin,
    branchAdmins,
    teachers,
    cashiers,
    students,
    parents,
  };
}

module.exports = { name: '03_users', seed };
