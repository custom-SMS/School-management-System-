const prisma = require('./prisma');
const { saveGrades, getGrades, recordAttendance, getSectionStudents } = require('./controllers/classroomController');

async function runTest() {
  console.log('--- Starting Branch Isolation Tests ---');

  let school, branchAlpha, branchBeta, yearAlpha, yearBeta, semAlpha, semBeta, userTeacherAlpha, teacherAlpha, userTeacherBeta, teacherBeta, classAlpha, classBeta, sectionAlpha, sectionBeta, userStudentAlpha, studentAlpha, userStudentBeta, studentBeta, enrollmentAlpha, enrollmentBeta, weightsAlpha, weightsBeta;
  let savedAlphaGrade, savedBetaGrade;

  try {
    // 1. Create clean test entities
    school = await prisma.school.create({
      data: { name: 'Test School', code: 'TESTSCH' }
    });

    branchAlpha = await prisma.branch.create({
      data: { schoolId: school.id, name: 'Branch Alpha', code: 'BALPHA' }
    });

    branchBeta = await prisma.branch.create({
      data: { schoolId: school.id, name: 'Branch Beta', code: 'BBETA' }
    });

    // Create academic years for each branch, both active!
    yearAlpha = await prisma.academicYear.create({
      data: { year: '2025/2026-ALPHA', branchId: branchAlpha.id, isActive: true }
    });

    yearBeta = await prisma.academicYear.create({
      data: { year: '2026/2027-BETA', branchId: branchBeta.id, isActive: true }
    });

    // Create semesters for each academic year, both active!
    semAlpha = await prisma.semester.create({
      data: { name: 'Semester 1 Alpha', order: 1, academicYearId: yearAlpha.id, isActive: true }
    });

    semBeta = await prisma.semester.create({
      data: { name: 'Semester 1 Beta', order: 1, academicYearId: yearBeta.id, isActive: true }
    });

    // Create teachers
    userTeacherAlpha = await prisma.user.create({
      data: { name: 'Teacher Alpha', email: 'teacher.alpha@test.com', password: 'password', role: 'Teacher' }
    });
    teacherAlpha = await prisma.teacher.create({
      data: { userId: userTeacherAlpha.id, teacherId: 'T-ALPHA', branchId: branchAlpha.id, subject: 'General' }
    });

    userTeacherBeta = await prisma.user.create({
      data: { name: 'Teacher Beta', email: 'teacher.beta@test.com', password: 'password', role: 'Teacher' }
    });
    teacherBeta = await prisma.teacher.create({
      data: { userId: userTeacherBeta.id, teacherId: 'T-BETA', branchId: branchBeta.id, subject: 'General' }
    });

    // Create classes
    classAlpha = await prisma.class.create({
      data: { name: 'Class Alpha', branchId: branchAlpha.id, teacherId: teacherAlpha.id }
    });

    classBeta = await prisma.class.create({
      data: { name: 'Class Beta', branchId: branchBeta.id, teacherId: teacherBeta.id }
    });

    // Create sections
    sectionAlpha = await prisma.section.create({
      data: { name: 'Sec-Alpha', classId: classAlpha.id, homeroomTeacherId: teacherAlpha.id }
    });

    sectionBeta = await prisma.section.create({
      data: { name: 'Sec-Beta', classId: classBeta.id, homeroomTeacherId: teacherBeta.id }
    });

    // Create students
    userStudentAlpha = await prisma.user.create({
      data: { name: 'Student Alpha', email: 'student.alpha@test.com', password: 'password', role: 'Student' }
    });
    studentAlpha = await prisma.student.create({
      data: { userId: userStudentAlpha.id, studentId: 'S-ALPHA', branchId: branchAlpha.id, grade: 'Class Alpha' }
    });

    userStudentBeta = await prisma.user.create({
      data: { name: 'Student Beta', email: 'student.beta@test.com', password: 'password', role: 'Student' }
    });
    studentBeta = await prisma.student.create({
      data: { userId: userStudentBeta.id, studentId: 'S-BETA', branchId: branchBeta.id, grade: 'Class Beta' }
    });

    // Create enrollments
    enrollmentAlpha = await prisma.enrollment.create({
      data: { studentId: studentAlpha.id, academicYearId: yearAlpha.id, grade: 'Class Alpha', sectionId: sectionAlpha.id }
    });

    enrollmentBeta = await prisma.enrollment.create({
      data: { studentId: studentBeta.id, academicYearId: yearBeta.id, grade: 'Class Beta', sectionId: sectionBeta.id }
    });

    // Create weights for both branches
    weightsAlpha = await prisma.gradingStructure.create({
      data: { branchId: branchAlpha.id, isActive: true, quizWeight: 10, assignmentWeight: 20, midtermWeight: 30, finalWeight: 40 }
    });

    weightsBeta = await prisma.gradingStructure.create({
      data: { branchId: branchBeta.id, isActive: true, quizWeight: 20, assignmentWeight: 20, midtermWeight: 20, finalWeight: 40 }
    });

    console.log('✅ Test setup successfully created.');

    // Mock res object
    const mockRes = () => {
      const res = {};
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.jsonData = data;
        return res;
      };
      return res;
    };

    // ─── TEST 1: saveGrades for Class Alpha (Branch Alpha) ───
    console.log('Running Test 1: saveGrades for Class Alpha...');
    const req1 = {
      user: { _id: userTeacherAlpha.id, role: 'Teacher', branchId: branchAlpha.id },
      body: {
        classId: classAlpha.id,
        subject: 'General',
        teacherId: teacherAlpha.id,
        submitToHomeroom: true,
        gradesData: [
          {
            student: studentAlpha.id,
            marks: { quiz: 80, assignment: 90, midterm: 85, final: 95 }
          }
        ]
      }
    };
    const res1 = mockRes();
    await saveGrades(req1, res1);

    if (res1.statusCode !== 200) {
      throw new Error(`saveGrades (Alpha) failed: ${JSON.stringify(res1.jsonData)}`);
    }

    savedAlphaGrade = await prisma.grade.findFirst({
      where: { studentId: studentAlpha.id, classId: classAlpha.id }
    });

    if (!savedAlphaGrade) {
      throw new Error('Grade not saved for Alpha student.');
    }

    // Verify academicYearId and semesterId are mapped to Alpha year and semester
    if (savedAlphaGrade.academicYearId !== yearAlpha.id) {
      throw new Error(`Grade mapped to wrong AcademicYear. Expected ${yearAlpha.id}, got ${savedAlphaGrade.academicYearId}`);
    }
    if (savedAlphaGrade.semesterId !== semAlpha.id) {
      throw new Error(`Grade mapped to wrong Semester. Expected ${semAlpha.id}, got ${savedAlphaGrade.semesterId}`);
    }
    // Verify homeroom resolution
    const rawGradeAlpha = await prisma.$queryRawUnsafe(
      `SELECT "submittedToId" FROM "Grade" WHERE id = $1`,
      savedAlphaGrade.id
    );
    if (rawGradeAlpha[0]?.submittedToId !== teacherAlpha.id) {
      throw new Error(`Homeroom teacher resolution failed. Expected ${teacherAlpha.id}, got ${rawGradeAlpha[0]?.submittedToId}`);
    }

    console.log('✅ Test 1 Passed: saveGrades resolved correct Branch Alpha calendar & homeroom.');

    // ─── TEST 2: saveGrades for Class Beta (Branch Beta) ───
    console.log('Running Test 2: saveGrades for Class Beta...');
    const req2 = {
      user: { _id: userTeacherBeta.id, role: 'Teacher', branchId: branchBeta.id },
      body: {
        classId: classBeta.id,
        subject: 'General',
        teacherId: teacherBeta.id,
        submitToHomeroom: true,
        gradesData: [
          {
            student: studentBeta.id,
            marks: { quiz: 70, assignment: 80, midterm: 75, final: 85 }
          }
        ]
      }
    };
    const res2 = mockRes();
    await saveGrades(req2, res2);

    if (res2.statusCode !== 200) {
      throw new Error(`saveGrades (Beta) failed: ${JSON.stringify(res2.jsonData)}`);
    }

    savedBetaGrade = await prisma.grade.findFirst({
      where: { studentId: studentBeta.id, classId: classBeta.id }
    });

    if (!savedBetaGrade) {
      throw new Error('Grade not saved for Beta student.');
    }

    if (savedBetaGrade.academicYearId !== yearBeta.id) {
      throw new Error(`Grade mapped to wrong AcademicYear. Expected ${yearBeta.id}, got ${savedBetaGrade.academicYearId}`);
    }
    if (savedBetaGrade.semesterId !== semBeta.id) {
      throw new Error(`Grade mapped to wrong Semester. Expected ${semBeta.id}, got ${savedBetaGrade.semesterId}`);
    }

    // Verify homeroom resolution
    const rawGradeBeta = await prisma.$queryRawUnsafe(
      `SELECT "submittedToId" FROM "Grade" WHERE id = $1`,
      savedBetaGrade.id
    );
    if (rawGradeBeta[0]?.submittedToId !== teacherBeta.id) {
      throw new Error(`Homeroom teacher resolution failed. Expected ${teacherBeta.id}, got ${rawGradeBeta[0]?.submittedToId}`);
    }

    console.log('✅ Test 2 Passed: saveGrades resolved correct Branch Beta calendar & homeroom.');

    // ─── TEST 3: getGrades (Branch Isolation) ───
    console.log('Running Test 3: getGrades (Branch-specific Semester Resolution)...');
    const req3 = {
      user: { _id: userTeacherAlpha.id, role: 'Teacher', branchId: branchAlpha.id },
      params: { classId: classAlpha.id, subject: 'General' },
      query: {}
    };
    const res3 = mockRes();
    await getGrades(req3, res3);

    console.log('getGrades status:', res3.statusCode);
    console.log('getGrades data:', JSON.stringify(res3.jsonData, null, 2));

    if (res3.statusCode !== 200) {
      throw new Error(`getGrades failed: ${JSON.stringify(res3.jsonData)}`);
    }

    // Verify it returned the grade for Alpha student with the resolved active semester
    if (res3.jsonData.length !== 1 || res3.jsonData[0]._id !== savedAlphaGrade.id) {
      throw new Error(`getGrades returned incorrect or empty results. Length: ${res3.jsonData?.length}, expected 1`);
    }
    console.log('✅ Test 3 Passed: getGrades filtered and resolved semester correctly.');

    // ─── TEST 4: recordAttendance (Branch Isolation) ───
    console.log('Running Test 4: recordAttendance...');
    const req4 = {
      user: { _id: userTeacherAlpha.id, role: 'Teacher', branchId: branchAlpha.id },
      body: {
        classId: classAlpha.id,
        date: new Date().toISOString(),
        teacherId: teacherAlpha.id,
        records: [{ student: studentAlpha.id, status: 'Present' }]
      }
    };
    const res4 = mockRes();
    await recordAttendance(req4, res4);

    if (res4.statusCode !== 200) {
      throw new Error(`recordAttendance failed: ${JSON.stringify(res4.jsonData)}`);
    }

    const savedAttendance = await prisma.attendance.findFirst({
      where: { classId: classAlpha.id }
    });
    if (!savedAttendance || savedAttendance.academicYearId !== yearAlpha.id) {
      throw new Error(`Attendance resolved wrong AcademicYear. Expected ${yearAlpha.id}, got ${savedAttendance?.academicYearId}`);
    }
    console.log('✅ Test 4 Passed: recordAttendance resolved correct branch academic year.');

    // ─── TEST 5: getSectionStudents (Branch Isolation) ───
    console.log('Running Test 5: getSectionStudents...');
    const req5 = {
      user: { _id: userTeacherAlpha.id, role: 'Teacher', branchId: branchAlpha.id },
      params: { sectionId: sectionAlpha.id }
    };
    const res5 = mockRes();
    await getSectionStudents(req5, res5);

    if (res5.statusCode !== 200) {
      throw new Error(`getSectionStudents failed: ${JSON.stringify(res5.jsonData)}`);
    }

    // Expect section students to contain Student Alpha
    if (!res5.jsonData.section || res5.jsonData.section.id !== sectionAlpha.id) {
      throw new Error(`getSectionStudents returned wrong section context.`);
    }
    console.log('✅ Test 5 Passed: getSectionStudents resolved correct section and branch.');

  } finally {
    // 2. Clean up test records
    console.log('Cleaning up test records...');
    if (savedAlphaGrade?.id || savedBetaGrade?.id) {
      await prisma.$executeRawUnsafe(`DELETE FROM "Grade" WHERE id IN ('${savedAlphaGrade?.id || ''}', '${savedBetaGrade?.id || ''}')`);
    }
    if (studentAlpha?.id || studentBeta?.id) {
      await prisma.attendanceRecord.deleteMany({ where: { studentId: { in: [studentAlpha?.id, studentBeta?.id].filter(Boolean) } } });
      await prisma.enrollment.deleteMany({ where: { studentId: { in: [studentAlpha?.id, studentBeta?.id].filter(Boolean) } } });
    }
    if (classAlpha?.id || classBeta?.id) {
      await prisma.attendance.deleteMany({ where: { classId: { in: [classAlpha?.id, classBeta?.id].filter(Boolean) } } });
    }
    if (branchAlpha?.id || branchBeta?.id) {
      await prisma.gradingStructure.deleteMany({ where: { branchId: { in: [branchAlpha?.id, branchBeta?.id].filter(Boolean) } } });
    }
    if (sectionAlpha?.id || sectionBeta?.id) {
      await prisma.section.deleteMany({ where: { id: { in: [sectionAlpha?.id, sectionBeta?.id].filter(Boolean) } } });
    }
    if (studentAlpha?.id || studentBeta?.id) {
      await prisma.student.deleteMany({ where: { id: { in: [studentAlpha?.id, studentBeta?.id].filter(Boolean) } } });
    }
    if (userStudentAlpha?.id || userStudentBeta?.id) {
      await prisma.user.deleteMany({ where: { id: { in: [userStudentAlpha?.id, userStudentBeta?.id].filter(Boolean) } } });
    }
    if (classAlpha?.id || classBeta?.id) {
      await prisma.class.deleteMany({ where: { id: { in: [classAlpha?.id, classBeta?.id].filter(Boolean) } } });
    }
    if (teacherAlpha?.id || teacherBeta?.id) {
      await prisma.teacher.deleteMany({ where: { id: { in: [teacherAlpha?.id, teacherBeta?.id].filter(Boolean) } } });
    }
    if (userTeacherAlpha?.id || userTeacherBeta?.id) {
      await prisma.user.deleteMany({ where: { id: { in: [userTeacherAlpha?.id, userTeacherBeta?.id].filter(Boolean) } } });
    }
    if (semAlpha?.id || semBeta?.id) {
      await prisma.semester.deleteMany({ where: { id: { in: [semAlpha?.id, semBeta?.id].filter(Boolean) } } });
    }
    if (yearAlpha?.id || yearBeta?.id) {
      await prisma.academicYear.deleteMany({ where: { id: { in: [yearAlpha?.id, yearBeta?.id].filter(Boolean) } } });
    }
    if (branchAlpha?.id || branchBeta?.id) {
      await prisma.branch.deleteMany({ where: { id: { in: [branchAlpha?.id, branchBeta?.id].filter(Boolean) } } });
    }
    if (school?.id) {
      await prisma.school.deleteMany({ where: { id: school.id } });
    }
    console.log('✅ Database clean up completed.');
  }
}

runTest()
  .then(() => {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  });
