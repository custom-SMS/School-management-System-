const prisma = require('../prisma');

const normalizeClassLabel = (value) => {
  const label = String(value ?? '').trim();
  if (!label) return 'Unassigned';
  // Canonicalize: "grade 10" -> "Grade 10", "GRADE 10" -> "Grade 10"
  return label.replace(/^(\w)/u, (c) => c.toUpperCase())
    .replace(/\b(grade|class|lkg|ukg|nursery)\b/gi, (w) =>
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    );
};

const classSortWeight = (value) => {
  const label = normalizeClassLabel(value);
  const match = label.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
};

const compareClassLabels = (left, right) => {
  const leftWeight = classSortWeight(left);
  const rightWeight = classSortWeight(right);

  if (leftWeight !== rightWeight) {
    return leftWeight - rightWeight;
  }

  return normalizeClassLabel(left).localeCompare(normalizeClassLabel(right));
};

// @desc    Get Admin Dashboard Stats
// @route   GET /api/stats/admin
// @access  Private (Admin)
const getAdminStats = async (req, res) => {
  try {
    const bf = req.branchFilter || {};

    // 1. Total Students — scoped to branch
    const totalStudents = await prisma.student.count({ where: { ...bf } });

    // 1.5. Total Subjects — scoped to branch
    const totalSubjects = await prisma.subject.count({ where: { ...bf } });

    const studentsByClassRaw = await prisma.student.groupBy({
      by: ['grade'],
      where: { ...bf },
      _count: { _all: true }
    });

    const studentsByClass = studentsByClassRaw
      .map((entry) => ({
        className: normalizeClassLabel(entry.grade),
        studentCount: entry._count._all,
        // Use a unique key combining className + a hash to avoid duplicate key issues
        classId: `${normalizeClassLabel(entry.grade)}-${Math.random().toString(36).slice(2, 6)}`,
      }))
      .sort((left, right) => compareClassLabels(left.className, right.className));

    // 2. Total Revenue — scoped to the active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });
    const feeYearFilter = activeYear ? { academicYearId: activeYear.id } : {};

    const revenueStats = await prisma.fee.aggregate({
      where: { paid: true, ...feeYearFilter, student: { ...bf } },
      _sum: { amount: true }
    });
    const totalRevenue = revenueStats._sum.amount || 0;

    // 3. Today's Attendance (Let's count how many present today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendancesToday = await prisma.attendance.findMany({
      where: {
        date: { gte: today },
        class: { ...bf }
      },
      include: {
        records: true
      }
    });

    let presentCount = 0;
    let totalCount = 0;
    attendancesToday.forEach(att => {
      (att.records || []).forEach(record => {
        totalCount++;
        if (record.status === 'Present') presentCount++;
      });
    });

    // Group attendance records by class in memory - only last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendancesAll = await prisma.attendance.findMany({
      where: {
        date: { gte: thirtyDaysAgo },
        class: { ...bf }
      },
      include: {
        records: true
      },
      orderBy: { date: 'desc' },
      take: 500 // Limit to recent 500 attendance sessions
    });

    const classAttendanceMap = new Map();
    attendancesAll.forEach(att => {
      const classId = att.classId;
      if (!classAttendanceMap.has(classId)) {
        classAttendanceMap.set(classId, { classId, sessions: 0, records: [] });
      }
      const group = classAttendanceMap.get(classId);
      group.sessions += 1;
      group.records.push(...(att.records || []));
    });

    const classAttendance = Array.from(classAttendanceMap.values());

    const attendanceSummary = classAttendance.map((entry) => {
      const records = entry.records;
      const checked = records.length;
      const present = records.filter((record) => record.status === 'Present').length;
      return {
        classId: entry.classId,
        className: 'Unknown class',
        sessions: entry.sessions,
        checked,
        present,
        attendanceRate: checked > 0 ? Number(((present / checked) * 100).toFixed(2)) : 0,
      };
    });

    const classes = await prisma.class.findMany({
      where: { ...bf },
      select: { id: true, name: true }
    });
    const classNameById = new Map(
      classes.map((classDoc) => [classDoc.id, normalizeClassLabel(classDoc.name)]),
    );

    attendanceSummary.forEach((entry) => {
      const className = classNameById.get(entry.classId) || 'Unknown class';
      entry.className = className;
    });

    attendanceSummary.sort((left, right) => compareClassLabels(left.className, right.className));

    const feeRecords = await prisma.fee.findMany({
      where: { ...feeYearFilter, student: { ...bf } },
      include: {
        student: {
          select: { grade: true }
        }
      }
    });

    const feeSummaryMap = new Map();
    let totalPendingRevenue = 0;

    feeRecords.forEach((fee) => {
      const className = normalizeClassLabel(fee.student?.grade);
      const amount = Number(fee.amount || 0);

      if (!feeSummaryMap.has(className)) {
        feeSummaryMap.set(className, {
          className,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          paidCount: 0,
          pendingCount: 0,
        });
      }

      const bucket = feeSummaryMap.get(className);
      bucket.totalAmount += amount;

      if (fee.paid) {
        bucket.paidAmount += amount;
        bucket.paidCount += 1;
      } else {
        bucket.pendingAmount += amount;
        bucket.pendingCount += 1;
        totalPendingRevenue += amount;
      }
    });

    const feeSummaryByClass = Array.from(feeSummaryMap.values()).sort((left, right) =>
      compareClassLabels(left.className, right.className),
    );

    const avgAttendance = totalCount > 0 ? Number(((presentCount / totalCount) * 100).toFixed(2)) : 0;

    const recentAuditLogs = await prisma.auditLog.findMany({
      where: { ...bf },
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: { user: { select: { name: true, role: true } } }
    });

    res.status(200).json({
      totalStudents,
      totalSubjects,
      totalRevenue,
      totalPendingRevenue,
      avgAttendance,
      activeYear: activeYear ? { id: activeYear.id, year: activeYear.year } : null,
      attendance: {
        presentCount,
        totalChecked: totalCount,
      },
      attendanceSummary,
      studentsByClass,
      feeSummaryByClass,
      recentAuditLogs,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Student Portal Stats
// @route   GET /api/stats/student/me
// @access  Private (Student)
const getStudentPortalStats = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user._id },
      select: {
        id: true,
        studentId: true,
        grade: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student Profile not found' });
    }

    const selectedYear = req.selectedAcademicYear || await prisma.academicYear.findFirst({ where: { isActive: true }, select: { id: true } });
    if (!selectedYear) return res.status(404).json({ message: 'No active academic year found.' });

    const activeSemester = await (async () => {
      if (req.query.semesterId) {
        return prisma.semester.findFirst({ where: { id: req.query.semesterId, academicYearId: selectedYear.id }, select: { id: true } });
      }
      return prisma.semester.findFirst({ where: { isActive: true, academicYearId: selectedYear.id }, select: { id: true } });
    })();

    // Use aggregation for attendance stats (much faster than fetching all records)
    const attendanceAgg = await prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: {
        studentId: student.id,
        attendance: { academicYearId: selectedYear.id }
      },
      _count: true
    });

    const attendanceStats = {
      presentCount: attendanceAgg.find(a => a.status === 'Present')?._count || 0,
      lateCount: attendanceAgg.find(a => a.status === 'Late')?._count || 0,
      absentCount: attendanceAgg.find(a => a.status === 'Absent')?._count || 0,
    };
    const attendanceRecordedCount = Object.values(attendanceStats).reduce((a, b) => a + b, 0);
    const attendanceRate = attendanceRecordedCount > 0
      ? Number(((attendanceStats.presentCount / attendanceRecordedCount) * 100).toFixed(2))
      : 0;

    // Parallelize remaining queries
    const [grades, fees, recentAttendanceRecords] = await Promise.all([
      prisma.grade.findMany({
        where: {
          studentId: student.id,
          academicYearId: selectedYear.id,
          ...(activeSemester ? { semesterId: activeSemester.id } : {})
        },
        select: {
          id: true,
          studentId: true,
          classId: true,
          teacherId: true,
          subject: true,
          subjectId: true,
          quiz: true,
          assignment: true,
          test: true,
          midterm: true,
          final: true,
          total: true,
          percentage: true,
          updatedAt: true,
          createdAt: true,
          class: { select: { id: true, name: true, subject: true, stream: true } },
          subjectRef: { select: { id: true, name: true } }
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
      }),
      prisma.fee.findMany({
        where: { studentId: student.id, academicYearId: selectedYear.id },
        select: {
          id: true,
          studentId: true,
          amount: true,
          description: true,
          month: true,
          dueDate: true,
          paid: true,
          paymentDate: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.attendance.findMany({
        where: {
          academicYearId: selectedYear.id,
          records: {
            some: { studentId: student.id }
          }
        },
        select: {
          id: true,
          date: true,
          records: {
            select: {
              studentId: true,
              status: true
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 30
      })
    ]);

    const recentAttendance = recentAttendanceRecords.map((record) => {
      const myRecord = record.records.find((r) => r.studentId === student.id);
      return {
        date: record.date,
        status: myRecord ? myRecord.status : 'Unknown',
      };
    });

    const pendingFees = fees.reduce((sum, fee) => {
      return fee.paid ? sum : sum + Number(fee.amount || 0);
    }, 0);

    const mappedGrades = grades.map(g => ({
      ...g,
      _id: g.id,
      student: g.studentId,
      class: g.classId,
      teacher: g.teacherId,
      marks: {
        quiz: g.quiz,
        assignment: g.assignment,
        test: g.test,
        midterm: g.midterm,
        final: g.final
      },
      subjectRef: g.subjectRef || null,
      classRef: g.class || null,
    }));

    const mappedFees = fees.map(f => ({
      ...f,
      _id: f.id,
      student: f.studentId
    }));

    const responseStudent = {
      ...student,
      _id: student.id,
      user: student.user ? { ...student.user, _id: student.user.id } : null
    };

    res.status(200).json({
      profile: responseStudent,
      studentId: student.studentId,
      grade: student.grade,
      grades: mappedGrades,
      gradesCount: grades.length,
      fees: mappedFees,
      totalFees: pendingFees,
      attendance: recentAttendance,
      attendanceCount: recentAttendance.length,
      attendanceRate,
      attendanceBreakdown: {
        presentCount: attendanceStats.presentCount,
        lateCount: attendanceStats.lateCount,
        absentCount: attendanceStats.absentCount,
        recordedCount: attendanceRecordedCount,
        totalSessions: attendanceRecordedCount,
      },
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Teacher Dashboard Stats
// @route   GET /api/stats/teacher/me
// @access  Private (Teacher)
const getTeacherPortalStats = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user._id },
      select: {
        id: true,
        teacherId: true,
        subject: true,
        user: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found' });
    }

    const activeSemester = await prisma.semester.findFirst({
      where: { isActive: true },
      select: { id: true }
    });

    // Parallelize initial queries for better performance
    const [assignedClassDocs, assignmentDocs, homeroomAssignments, homeroomSections] = await Promise.all([
      prisma.class.findMany({
        where: { teacherId: teacher.id },
        select: {
          id: true,
          name: true,
          subject: true,
          stream: true,
          sections: {
            select: {
              id: true,
              enrollments: {
                select: {
                  studentId: true
                },
                where: { status: { in: ['Enrolled', 'Promoted', 'Repeated'] } }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.teacherAssignment.findMany({
        where: { teacherId: teacher.id },
        select: {
          id: true,
          classId: true,
          assignmentType: true,
          class: {
            select: {
              id: true,
              name: true,
              subject: true,
              stream: true,
              sections: {
                select: {
                  id: true,
                  enrollments: {
                    select: {
                      studentId: true
                    },
                    where: { status: { in: ['Enrolled', 'Promoted', 'Repeated'] } }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.teacherAssignment.findMany({
        where: { teacherId: teacher.id, assignmentType: 'HomeRoomTeacher' },
        select: { classId: true }
      }),
      prisma.section.findMany({
        where: { homeroomTeacherId: teacher.id },
        select: { classId: true }
      })
    ]);

    const homeroomSectionClassIds = [...new Set(homeroomSections.map((section) => section.classId).filter(Boolean))];
    
    // Only fetch homeroom classes if there are any
    const homeroomSectionClasses = homeroomSectionClassIds.length
      ? await prisma.class.findMany({
        where: { id: { in: homeroomSectionClassIds } },
        select: {
          id: true,
          name: true,
          subject: true,
          stream: true,
          sections: {
            select: {
              id: true,
              enrollments: {
                select: {
                  studentId: true
                },
                where: { status: { in: ['Enrolled', 'Promoted', 'Repeated'] } }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      : [];

    const homeroomClassIds = new Set([
      ...assignedClassDocs.map((klass) => klass.id),
      ...homeroomAssignments.map((assignment) => assignment.classId).filter(Boolean),
      ...homeroomSections.map((section) => section.classId).filter(Boolean)
    ]);

    const classMap = new Map();

    assignedClassDocs.forEach((klass) => {
      classMap.set(klass.id, klass);
    });

    homeroomSectionClasses.forEach((klass) => {
      classMap.set(klass.id, klass);
    });

    assignmentDocs.forEach((assignment) => {
      if (assignment.class?.id) {
        classMap.set(assignment.class.id, assignment.class);
      }
    });

    const classes = Array.from(classMap.values()).sort((left, right) =>
      compareClassLabels(left.name, right.name),
    );

    // Optimize class summaries by reducing queries per class
    const classSummaries = await Promise.all(classes.map(async (klass) => {
      // Get student count from enrollments (lighter than fetching full student objects)
      const studentIds = new Set();
      (klass.sections || []).forEach(section => {
        (section.enrollments || []).forEach(enrollment => {
          studentIds.add(enrollment.studentId);
        });
      });
      const studentCount = studentIds.size;

      // Combine attendance queries into single aggregation
      const [attendanceAgg, gradesAgg, latestAttendance, attendanceCount] = await Promise.all([
        prisma.attendanceRecord.groupBy({
          by: ['status'],
          where: {
            attendance: { classId: klass.id }
          },
          _count: true
        }),
        prisma.grade.aggregate({
          where: {
            classId: klass.id,
            teacherId: req.user._id,
            ...(activeSemester ? { semesterId: activeSemester.id } : {})
          },
          _avg: { percentage: true },
          _count: true
        }),
        prisma.attendance.findFirst({
          where: { classId: klass.id },
          orderBy: { date: 'desc' },
          select: { date: true }
        }),
        prisma.attendance.count({ where: { classId: klass.id } })
      ]);

      const attendanceTotal = attendanceAgg.reduce((sum, item) => sum + item._count, 0);
      const attendancePresent = attendanceAgg.find(item => item.status === 'Present')?._count || 0;

      const averageGrade = gradesAgg._count > 0
        ? Math.round(gradesAgg._avg.percentage || 0)
        : 0;

      return {
        classId: klass.id,
        className: normalizeClassLabel(klass.name),
        subject: normalizeClassLabel(klass.subject),
        stream: klass.stream || '',
        studentCount,
        attendanceSessions: attendanceCount,
        attendanceRate: attendanceTotal > 0 ? Number(((attendancePresent / attendanceTotal) * 100).toFixed(2)) : 0,
        gradesCount: gradesAgg._count,
        averageGrade,
        latestAttendanceDate: latestAttendance?.date || null,
        isHomeroom: homeroomClassIds.has(klass.id)
      };
    }));

    // Calculate unique student count from enrollment data
    const assignedStudentsCount = new Set(
      classes.flatMap((klass) => {
        return (klass.sections || [])
          .flatMap(section => (section.enrollments || []).map(e => e.studentId))
          .filter(Boolean);
      })
    ).size;

    // Parallelize recent data fetches
    const [grades, attendanceDocs] = await Promise.all([
      prisma.grade.findMany({
        where: {
          teacherId: req.user._id,
          ...(activeSemester ? { semesterId: activeSemester.id } : {})
        },
        select: {
          id: true,
          studentId: true,
          classId: true,
          subject: true,
          percentage: true,
          total: true,
          createdAt: true,
          student: {
            select: {
              studentId: true,
              user: { select: { name: true } }
            }
          },
          class: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.attendance.findMany({
        where: {
          classId: { in: classes.map((klass) => klass.id) }
        },
        select: {
          id: true,
          classId: true,
          date: true,
          class: { select: { name: true } },
          records: {
            select: { status: true }
          }
        },
        orderBy: { date: 'desc' },
        take: 5
      })
    ]);

    const recentGrades = grades.map((grade) => ({
      gradeId: grade.id,
      studentName: grade.student?.user?.name || 'Student',
      studentId: grade.student?.studentId || '—',
      className: grade.class?.name || '—',
      subject: grade.subject,
      percentage: Number(grade.percentage || 0),
      total: Number(grade.total || 0),
      createdAt: grade.createdAt,
    }));

    const recentAttendance = attendanceDocs.map((attendance) => {
      const present = (attendance.records || []).filter((record) => record.status === 'Present').length;
      return {
        attendanceId: attendance.id,
        className: attendance.class?.name || '—',
        date: attendance.date,
        present,
        total: (attendance.records || []).length,
      };
    });

    const gradesRecordedCount = grades.length;
    const attendanceSessionsCount = classSummaries.reduce((sum, item) => sum + item.attendanceSessions, 0);
    const averageGrade = grades.length > 0
      ? Math.round(grades.reduce((sum, grade) => sum + Number(grade.percentage || 0), 0) / grades.length)
      : 0;

    res.status(200).json({
      teacher: teacher.user ? { ...teacher.user, _id: teacher.user.id } : null,
      teacherId: teacher.teacherId,
      subject: teacher.subject,
      assignedClassesCount: classes.length,
      assignedStudentsCount,
      gradesRecordedCount,
      attendanceSessionsCount,
      averageGrade,
      classSummaries,
      recentGrades,
      recentAttendance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getParentPortalStats = async (req, res) => {
  try {
    const parent = await prisma.parent.findUnique({
      where: { userId: req.user._id },
      select: {
        id: true,
        parentId: true,
        fullName: true,
        email: true,
        phone: true,
        relationship: true,
        address: true,
        children: {
          select: { id: true }
        }
      }
    });

    if (!parent) {
      return res.status(404).json({ message: 'Parent profile not found' });
    }

    const activeSemester = await prisma.semester.findFirst({
      where: { isActive: true },
      select: { id: true }
    });

    // Parallelize all child queries for better performance
    const childrenData = await Promise.all(
      parent.children.map(async (child) => {
        const childStudent = await prisma.student.findUnique({
          where: { id: child.id },
          select: {
            id: true,
            studentId: true,
            grade: true,
            user: { select: { id: true, name: true, email: true } }
          }
        });
        if (!childStudent) return null;

        // Use aggregation for fees (faster than fetching all)
        const feeAgg = await prisma.fee.aggregate({
          where: { studentId: childStudent.id },
          _sum: { amount: true },
          _count: true
        });

        const [grades, fees, attendanceRecords] = await Promise.all([
          prisma.grade.findMany({
            where: {
              studentId: childStudent.id,
              ...(activeSemester ? { semesterId: activeSemester.id } : {})
            },
            select: {
              id: true,
              studentId: true,
              classId: true,
              teacherId: true,
              subject: true,
              quiz: true,
              assignment: true,
              test: true,
              midterm: true,
              final: true,
              total: true,
              percentage: true,
              class: { select: { id: true, name: true, subject: true, stream: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 20
          }),
          prisma.fee.findMany({
            where: { studentId: childStudent.id },
            select: {
              id: true,
              studentId: true,
              amount: true,
              description: true,
              month: true,
              dueDate: true,
              paid: true,
              paymentDate: true,
              payments: {
                select: {
                  id: true,
                  status: true,
                  transactionReference: true,
                  bankName: true,
                  paymentDate: true
                },
                orderBy: { paymentDate: 'desc' },
                take: 1
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          }),
          prisma.attendance.findMany({
            where: {
              records: {
                some: { studentId: childStudent.id }
              }
            },
            select: {
              id: true,
              date: true,
              records: {
                select: {
                  studentId: true,
                  status: true
                }
              }
            },
            orderBy: { date: 'desc' },
            take: 30
          })
        ]);

        const attendance = attendanceRecords.map((record) => {
          const myRecord = record.records.find((r) => r.studentId === childStudent.id);
          return { date: record.date, status: myRecord ? myRecord.status : 'Unknown' };
        });

        const mappedGrades = grades.map(g => ({
          ...g,
          _id: g.id,
          student: g.studentId,
          class: g.classId,
          teacher: g.teacherId,
          marks: {
            test: g.test,
            midterm: g.midterm,
            final: g.final
          },
          classRef: g.class || null
        }));

        const mappedFees = fees.map(f => ({
          ...f,
          _id: f.id,
          student: f.studentId,
          latestPayment: f.payments?.[0]
            ? {
              id: f.payments[0].id,
              status: f.payments[0].status,
              transactionReference: f.payments[0].transactionReference,
              bankName: f.payments[0].bankName
            }
            : null
        }));

        return {
          profile: {
            ...childStudent,
            _id: childStudent.id,
            user: childStudent.user ? { ...childStudent.user, _id: childStudent.user.id } : null
          },
          grades: mappedGrades,
          fees: mappedFees,
          attendance,
          totalFees: feeAgg._sum.amount || 0,
          pendingFees: fees.reduce((sum, fee) => fee.paid ? sum : sum + Number(fee.amount || 0), 0)
        };
      })
    );

    const children = childrenData.filter(Boolean);

    res.json({
      parent: {
        ...parent,
        _id: parent.id
      },
      children,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
 }
};

const getSuperAdminStats = async (req, res) => {
  try {
    // Use branchFilter from middleware (respects X-Branch-Id header for SuperAdmin)
    // Fall back to query parameter for backward compatibility
    const { branchId } = req.query;
    const branchFilter = req.branchFilter?.branchId 
      ? { branchId: req.branchFilter.branchId } 
      : (branchId ? { branchId } : {});

    const totalStudents = await prisma.student.count({
      where: { user: { isActive: true }, ...branchFilter }
    });
    const totalTeachers = await prisma.teacher.count({
      where: { user: { isActive: true }, ...branchFilter }
    });
    const totalSubjects = await prisma.subject.count({
      where: { ...branchFilter }
    });
    const totalCashiers = await prisma.user.count({
      where: {
        role: 'Cashier',
        isActive: true,
        ...(branchId ? {
          userScope: {
            some: { branchId }
          }
        } : {})
      }
    });


    const activeYearDoc = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });
    const activeYear = activeYearDoc ? activeYearDoc.year : 'None';
    // Scope all fee queries to the active academic year
    const feeYearFilter = activeYearDoc ? { academicYearId: activeYearDoc.id } : {};

    // Year-specific revenue (scoped to active academic year)
    const allTimeRevenueStats = await prisma.fee.aggregate({
      where: { paid: true, ...feeYearFilter, student: branchFilter },
      _sum: { amount: true }
    });
    const allTimeRevenue = allTimeRevenueStats._sum.amount || 0;

    // Active-year revenue
    const activeYearRevenueStats = await prisma.fee.aggregate({
      where: { paid: true, ...feeYearFilter, student: branchFilter },
      _sum: { amount: true }
    });
    const totalRevenue = activeYearRevenueStats._sum.amount || 0;

    // Derive a real system health indicator from active year and DB reachability
    // If we got this far, DB is reachable. Flag as Degraded only if no active year.
    const systemHealth = activeYearDoc ? 'Operational' : 'Degraded';

    const studentsByGrade = await prisma.student.findMany({
      where: { user: { isActive: true }, ...branchFilter },
      select: { grade: true }
    });
    let primaryCount = 0, middleCount = 0, highCount = 0;
    studentsByGrade.forEach(g => {
      const match = String(g.grade).match(/\d+/);
      if (match) {
        const gradeNum = parseInt(match[0], 10);
        if (gradeNum >= 1 && gradeNum <= 6) primaryCount += 1;
        else if (gradeNum >= 7 && gradeNum <= 8) middleCount += 1;
        else if (gradeNum >= 9 && gradeNum <= 12) highCount += 1;
      }
    });
    const studentDistribution = [
      { division: 'Primary', count: primaryCount },
      { division: 'Middle', count: middleCount },
      { division: 'High', count: highCount }
    ];

    const fees = await prisma.fee.findMany({
      where: { paid: true, ...feeYearFilter, student: branchFilter },
      include: { student: { select: { grade: true } } }
    });
    let primaryRev = 0, middleRev = 0, highRev = 0;
    fees.forEach(f => {
      const match = String(f.student?.grade || '').match(/\d+/);
      const amount = Number(f.amount || 0);
      if (match) {
        const gradeNum = parseInt(match[0], 10);
        if (gradeNum >= 1 && gradeNum <= 6) primaryRev += amount;
        else if (gradeNum >= 7 && gradeNum <= 8) middleRev += amount;
        else if (gradeNum >= 9 && gradeNum <= 12) highRev += amount;
      }
    });
    const revenueByDivision = [
      { division: 'Primary School', revenue: primaryRev },
      { division: 'Middle School', revenue: middleRev },
      { division: 'High School', revenue: highRev }
    ];

    const activeSemester = await prisma.semester.findFirst({
      where: { isActive: true }
    });

    const grades = await prisma.grade.findMany({
      where: {
        student: branchFilter,
        ...(activeSemester ? { semesterId: activeSemester.id } : {})
      },
      include: { student: { select: { grade: true } } }
    });
    let pScore = 0, pCount = 0, mScore = 0, mCount = 0, hScore = 0, hCount = 0;
    grades.forEach(g => {
      const match = String(g.student?.grade || '').match(/\d+/);
      const percentage = Number(g.percentage || 0);
      if (match && percentage > 0) {
        const gradeNum = parseInt(match[0], 10);
        if (gradeNum >= 1 && gradeNum <= 6) { pScore += percentage; pCount++; }
        else if (gradeNum >= 7 && gradeNum <= 8) { mScore += percentage; mCount++; }
        else if (gradeNum >= 9 && gradeNum <= 12) { hScore += percentage; hCount++; }
      }
    });
    const divisionPerformance = [
      { division: 'Primary School', score: pCount > 0 ? Math.round(pScore / pCount) : null },
      { division: 'Middle School', score: mCount > 0 ? Math.round(mScore / mCount) : null },
      { division: 'High School', score: hCount > 0 ? Math.round(hScore / hCount) : null }
    ];

    const recentAuditLogs = await prisma.auditLog.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: { user: { select: { name: true } } }
    });

    const studentsByClass = await prisma.student.groupBy({
      by: ['grade'],
      where: { user: { isActive: true }, ...branchFilter },
      _count: { _all: true }
    });

    const normalizeClassLabel = (value) => {
      const label = String(value ?? '').trim();
      if (!label) return 'Unassigned';
      return label.replace(/^(\w)/u, (c) => c.toUpperCase())
        .replace(/\b(grade|class|lkg|ukg|nursery)\b/gi, (w) =>
          w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        );
    };

    const classSortWeight = (value) => {
      const label = normalizeClassLabel(value);
      const match = label.match(/\d+/);
      return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
    };

    const compareClassLabels = (left, right) => {
      const leftWeight = classSortWeight(left);
      const rightWeight = classSortWeight(right);
      if (leftWeight !== rightWeight) {
        return leftWeight - rightWeight;
      }
      return normalizeClassLabel(left).localeCompare(normalizeClassLabel(right));
    };

    const studentsByClassFormatted = studentsByClass
      .map((entry) => ({
        className: normalizeClassLabel(entry.grade),
        studentCount: entry._count._all,
      }))
      .sort((left, right) => compareClassLabels(left.className, right.className));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const unlockRequestsCount = await prisma.attendance.count({
      where: {
        OR: [
          { locked: true },
          {
            date: { lt: sevenDaysAgo },
            unlocked: false
          }
        ]
      }
    });

    res.status(200).json({
      totalStudents,
      totalTeachers,
      totalSubjects,
      totalCashiers,
      totalRevenue,        // active year only
      allTimeRevenue,      // all academic years combined
      activeYear,
      systemHealth,
      divisionPerformance,
      revenueByDivision,
      studentDistribution,
      studentsByClass: studentsByClassFormatted,
      unlockRequestsCount,
      recentAuditLogs
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAdminStats, getSuperAdminStats, getStudentPortalStats, getParentPortalStats, getTeacherPortalStats };
