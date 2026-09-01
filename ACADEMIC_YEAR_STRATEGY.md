# Academic Year Management Strategy

## Overview
This document provides comprehensive recommendations for handling academic years in the School Management System, addressing data isolation, access control, user experience, and performance considerations.

## Current Schema Analysis

### Tables with academicYearId
Based on the current Prisma schema, the following tables already have `academicYearId`:
- ✅ `Enrollment` - Links students to academic years
- ✅ `Attendance` - Attendance records per year
- ✅ `Grade` - Grades per year
- ✅ `Fee` - Fees per year
- ✅ `Timetable` - Timetables per year
- ✅ `ReportCard` - Report cards per year
- ✅ `Semester` - Linked to academic years

### Tables Missing academicYearId (Recommended to Add)
- ⚠️ `Class` - Classes should be year-specific
- ⚠️ `Section` - Sections should be year-specific
- ⚠️ `TeacherAssignment` - Assignments should be year-specific
- ⚠️ `FeeStructure` - Fee structures may vary by year
- ⚠️ `GradingStructure` - Grading policies may change by year

## 1. User Access After Changing Active Academic Year

### Current Behavior
When Super Admin changes the active academic year, the system needs to handle how this affects other users.

### Recommended Approach

#### Super Admin
- **Access**: Can view and switch between all academic years
- **Default**: Starts with the currently active year
- **UI**: Year switcher prominently displayed in header
- **Editing**: Can edit historical data with confirmation and audit logging

#### Branch Admin
- **Access**: Can view current active year only
- **Historical Access**: Read-only access to previous years for reporting
- **UI**: Current year displayed prominently, historical access via reports section
- **Editing**: Can only edit current active year data
- **Transition**: When year changes, automatically redirected to new active year

#### Teacher
- **Access**: Can view current active year only
- **Historical Access**: Read-only access to their assigned classes' historical data
- **UI**: Current year displayed, historical access via student reports
- **Editing**: Can only edit current year grades and attendance
- **Transition**: When year changes, dashboard shows new year's assignments

#### Cashier
- **Access**: Can view current active year only
- **Historical Access**: Read-only access to payment history
- **UI**: Current year displayed, historical access via payment reports
- **Editing**: Can only process current year payments
- **Transition**: When year changes, fee management switches to new year

#### Student
- **Access**: Can view current active year only
- **Historical Access**: Read-only access to their own historical data
- **UI**: Current year displayed, historical access via academic history section
- **Editing**: No editing capabilities
- **Transition**: When year changes, dashboard shows new year's data

#### Parent
- **Access**: Can view current active year only
- **Historical Access**: Read-only access to children's historical data
- **UI**: Current year displayed, historical access via child's academic history
- **Editing**: No editing capabilities
- **Transition**: When year changes, dashboard shows children's new year data

### Implementation Strategy

```javascript
// Middleware to enforce year-based access control
const enforceYearAccess = (req, res, next) => {
  const { user } = req;
  const requestedYearId = req.headers['x-academic-year-id'];
  const activeYear = req.activeYear;
  
  // Super Admin can access any year
  if (user.role === 'SuperAdmin') {
    return next();
  }
  
  // Other roles can only access active year unless explicitly allowed
  if (requestedYearId && requestedYearId !== activeYear.id) {
    // Check if this is a read-only historical access
    if (req.method === 'GET' && isHistoricalAccessAllowed(user.role, req.path)) {
      req.isHistoricalAccess = true;
      return next();
    }
    
    return res.status(403).json({ 
      message: 'You can only access the current active academic year' 
    });
  }
  
  next();
};

// Helper function to determine historical access permissions
function isHistoricalAccessAllowed(role, path) {
  const allowedPaths = {
    'BranchAdmin': ['/api/reports', '/api/students/:id/history'],
    'Teacher': ['/api/students/:id/history', '/api/report-cards'],
    'Cashier': ['/api/payments/history'],
    'Student': ['/api/students/me/history', '/api/report-cards'],
    'Parent': ['/api/students/:id/history', '/api/report-cards']
  };
  
  return allowedPaths[role]?.some(allowedPath => path.startsWith(allowedPath));
}
```

### Automatic Year Transition Behavior

When Super Admin changes the active year:

1. **Backend Action**
   - Update `AcademicYear.isActive` flag
   - Emit WebSocket event for real-time updates
   - Log the change in audit log

2. **Frontend Action**
   - Listen for year change event
   - Show notification: "Academic year has been changed to [Year]"
   - Refresh current data with new year context
   - Update year display in UI

3. **User Session Handling**
   - Clear year-specific cache
   - Reload dashboard data
   - Update context providers

## 2. Data Isolation Between Academic Years

### Database Schema Recommendations

#### Add academicYearId to Missing Tables

```prisma
model Class {
  id             String   @id @default(uuid())
  name           String
  grade          String
  stream         String?
  branchId       String
  branch         Branch   @relation(fields: [branchId], references: [id])
  academicYearId String
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])
  teacherId      String?
  teacher        Teacher? @relation(fields: [teacherId], references: [id])
  
  // ... existing fields
  
  @@unique([branchId, name, academicYearId])
  @@index([academicYearId])
  @@index([branchId, academicYearId])
}

model Section {
  id             String   @id @default(uuid())
  name           String
  classId        String
  class          Class    @relation(fields: [classId], references: [id])
  academicYearId String
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])
  
  // ... existing fields
  
  @@unique([classId, name, academicYearId])
  @@index([academicYearId])
}

model TeacherAssignment {
  id             String   @id @default(uuid())
  teacherId      String
  teacher        Teacher  @relation(fields: [teacherId], references: [id])
  classId        String?
  class          Class?   @relation(fields: [classId], references: [id])
  academicYearId String
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])
  
  // ... existing fields
  
  @@index([teacherId, academicYearId])
  @@index([classId, academicYearId])
}

model FeeStructure {
  id             String   @id @default(uuid())
  name           String
  branchId       String?
  branch         Branch?  @relation(fields: [branchId], references: [id])
  academicYearId String
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])
  
  // ... existing fields
  
  @@unique([branchId, name, academicYearId])
  @@index([academicYearId])
}

model GradingStructure {
  id             String   @id @default(uuid())
  name           String
  branchId       String?
  branch         Branch?  @relation(fields: [branchId], references: [id])
  levelId        String?
  level          EducationalLevel? @relation(fields: [levelId], references: [id])
  academicYearId String
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])
  
  // ... existing fields
  
  @@unique([branchId, levelId, name, academicYearId])
  @@index([academicYearId])
}
```

### Query Isolation Strategy

All queries must include academic year filtering:

```javascript
// Middleware to inject academic year filter
const injectAcademicYearFilter = (req, res, next) => {
  const { user, activeYear } = req;
  
  // Super Admin can specify year via header
  const requestedYearId = req.headers['x-academic-year-id'];
  
  if (user.role === 'SuperAdmin' && requestedYearId) {
    req.academicYearFilter = { academicYearId: requestedYearId };
  } else {
    req.academicYearFilter = { academicYearId: activeYear.id };
  }
  
  next();
};

// Usage in controllers
const getClasses = async (req, res) => {
  const classes = await prisma.class.findMany({
    where: {
      ...req.branchFilter,
      ...req.academicYearFilter, // Always includes academic year
    }
  });
  res.json(classes);
};
```

### Database Indexes for Performance

```prisma
// Add composite indexes for common queries
@@index([branchId, academicYearId])  // For branch-specific queries
@@index([studentId, academicYearId]) // For student-specific queries
@@index([teacherId, academicYearId]) // For teacher-specific queries
@@index([classId, academicYearId])   // For class-specific queries
```

## 3. Student Movement Between Years

### Recommended Approach: Create New Enrollment Records

**Why New Enrollments?**
- Maintains historical data integrity
- Allows tracking student progression over time
- Preserves grade/attendance history
- Enables academic year comparisons
- Supports retention analysis

### Student Progression Workflow

#### End of Year Process

1. **Promote Students**
```javascript
const promoteStudents = async (fromYearId, toYearId) => {
  const students = await prisma.enrollment.findMany({
    where: { academicYearId: fromYearId, status: 'Enrolled' },
    include: { student: true, section: { include: { class: true } } }
  });
  
  for (const enrollment of students) {
    const currentGrade = enrollment.section.class.grade;
    const nextGrade = getNextGrade(currentGrade);
    
    // Create new enrollment for next year
    await prisma.enrollment.create({
      data: {
        studentId: enrollment.studentId,
        sectionId: await findNextYearSection(nextGrade, toYearId),
        academicYearId: toYearId,
        status: 'Enrolled',
        enrollmentDate: new Date(),
      }
    });
    
    // Update student's current grade
    await prisma.student.update({
      where: { id: enrollment.studentId },
      data: { grade: nextGrade }
    });
  }
};
```

2. **Handle Special Cases**
- **Graduating Students**: Mark as graduated, don't create new enrollment
- **Repeating Students**: Keep same grade, create new enrollment
- **Transferring Students**: Handle transfer logic
- **Withdrawing Students**: Mark as withdrawn

#### Grade Progression Logic

```javascript
function getNextGrade(currentGrade) {
  const gradeOrder = [
    'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
    'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
    'Grade 10', 'Grade 11', 'Grade 12'
  ];
  
  const currentIndex = gradeOrder.indexOf(currentGrade);
  if (currentIndex === -1) return currentGrade; // Unknown grade
  if (currentIndex === gradeOrder.length - 1) return null; // Graduated
  
  return gradeOrder[currentIndex + 1];
}
```

### Student History Tracking

```javascript
// Get student's academic history
const getStudentHistory = async (studentId) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: {
      section: {
        include: { class: { include: { academicYear: true } } }
      },
      grades: true,
      attendance: true,
      reportCards: true
    },
    orderBy: { academicYear: { year: 'desc' } }
  });
  
  return enrollments.map(enrollment => ({
    year: enrollment.section.class.academicYear.year,
    grade: enrollment.section.class.grade,
    section: enrollment.section.name,
    status: enrollment.status,
    averageGrade: calculateAverage(enrollment.grades),
    attendanceRate: calculateAttendanceRate(enrollment.attendance),
    reportCard: enrollment.reportCards[0]
  }));
};
```

## 4. Class and Teacher Assignment Per Year

### Year-Specific Class Structure

**Current Issue**: Classes are not year-specific, causing confusion when years change.

**Solution**: Create new class structures for each academic year.

### Class Creation Workflow

```javascript
const createClassesForNewYear = async (fromYearId, toYearId) => {
  const previousClasses = await prisma.class.findMany({
    where: { academicYearId: fromYearId },
    include: { sections: true }
  });
  
  for (const prevClass of previousClasses) {
    // Create new class for next year
    const newClass = await prisma.class.create({
      data: {
        name: prevClass.name,
        grade: getNextGrade(prevClass.grade),
        stream: prevClass.stream,
        branchId: prevClass.branchId,
        academicYearId: toYearId,
        // Teacher will be assigned separately
      }
    });
    
    // Create sections for new class
    for (const prevSection of prevClass.sections) {
      await prisma.section.create({
        data: {
          name: prevSection.name,
          classId: newClass.id,
          capacity: prevSection.capacity,
          academicYearId: toYearId,
        }
      });
    }
  }
};
```

### Teacher Assignment Workflow

```javascript
const assignTeachersForNewYear = async (toYearId) => {
  const classes = await prisma.class.findMany({
    where: { academicYearId: toYearId },
    include: { sections: true }
  });
  
  const teachers = await prisma.teacher.findMany({
    where: { status: 'Active' }
  });
  
  // Auto-assign teachers based on previous year assignments
  for (const classData of classes) {
    const prevYearClass = await prisma.class.findFirst({
      where: {
        branchId: classData.branchId,
        grade: getPreviousGrade(classData.grade),
        academicYearId: getPreviousYearId(toYearId)
      },
      include: { teacherAssignments: true }
    });
    
    if (prevYearClass) {
      // Re-assign same teachers to new class
      for (const assignment of prevYearClass.teacherAssignments) {
        await prisma.teacherAssignment.create({
          data: {
            teacherId: assignment.teacherId,
            classId: classData.id,
            academicYearId: toYearId,
            assignmentType: assignment.assignmentType,
            assignedById: assignment.assignedById,
          }
        });
      }
    }
  }
};
```

### Manual Assignment Interface

For Branch Admins to adjust assignments:

```javascript
// API endpoint for manual teacher assignment
router.post('/classes/:classId/assign-teacher', 
  verifyToken, 
  checkRole(['SuperAdmin', 'Admin']), 
  async (req, res) => {
    const { classId } = req.params;
    const { teacherId, assignmentType } = req.body;
    const { academicYearFilter } = req;
    
    // Remove existing assignment for this teacher/class/year
    await prisma.teacherAssignment.deleteMany({
      where: {
        teacherId,
        classId,
        ...academicYearFilter
      }
    });
    
    // Create new assignment
    const assignment = await prisma.teacherAssignment.create({
      data: {
        teacherId,
        classId,
        academicYearId: academicYearFilter.academicYearId,
        assignmentType,
        assignedById: req.user._id,
      }
    });
    
    res.json(assignment);
  }
);
```

## 5. Editing Historical Data

### Protection Mechanisms

#### Multi-Layer Protection

1. **Role-Based Access Control**
   - Only Super Admin can edit historical data
   - Other roles: Read-only access

2. **Explicit Confirmation**
   - Require double confirmation
   - Show warning about data integrity
   - Require reason for edit

3. **Audit Logging**
   - Log all historical edits
   - Track who, what, when, why
   - Maintain change history

4. **Time-Limited Editing**
   - Allow editing within grace period (e.g., 30 days)
   - After grace period, require special approval

### Implementation

```javascript
// Middleware for historical edit protection
const protectHistoricalEdits = (req, res, next) => {
  const { user, activeYear, academicYearFilter } = req;
  
  // Only Super Admin can edit non-active years
  if (user.role !== 'SuperAdmin' && 
      academicYearFilter.academicYearId !== activeYear.id) {
    return res.status(403).json({
      message: 'Only Super Admin can edit historical data'
    });
  }
  
  // Super Admin editing historical data
  if (user.role === 'SuperAdmin' && 
      academicYearFilter.academicYearId !== activeYear.id) {
    req.isHistoricalEdit = true;
  }
  
  next();
};

// Historical edit confirmation endpoint
router.post('/confirm-historical-edit', verifyToken, async (req, res) => {
  const { reason, targetData } = req.body;
  
  // Log the confirmation
  await prisma.auditLog.create({
    data: {
      userId: req.user._id,
      action: 'HISTORICAL_EDIT_CONFIRMED',
      details: {
        reason,
        targetData,
        timestamp: new Date()
      }
    }
  });
  
  // Generate temporary edit token
  const editToken = generateEditToken({
    userId: req.user._id,
    reason,
    expiry: Date.now() + 15 * 60 * 1000 // 15 minutes
  });
  
  res.json({ editToken });
});

// Apply edit with token
router.put('/data/:id/historical', 
  verifyToken, 
  validateEditToken,
  async (req, res) => {
    const { id } = req.params;
    const { editToken, reason } = req;
    
    // Perform the edit
    const result = await prisma[req.model].update({
      where: { id },
      data: req.body
    });
    
    // Log the edit
    await prisma.auditLog.create({
      data: {
        userId: req.user._id,
        action: 'HISTORICAL_EDIT',
        details: {
          model: req.model,
          recordId: id,
          changes: req.body,
          reason,
          timestamp: new Date()
        }
      }
    });
    
    res.json(result);
  }
);
```

### Audit Log Schema Enhancement

```prisma
model AuditLog {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  action    String
  details   Json
  ipAddress String?
  userAgent String?
  timestamp DateTime @default(now())
  
  @@index([userId])
  @@index([action])
  @@index([timestamp])
}
```

### UI for Historical Edits

```javascript
// Historical edit confirmation dialog
const HistoricalEditDialog = ({ isOpen, onClose, onConfirm, data }) => {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  
  const handleConfirm = async () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    
    if (!reason.trim()) {
      toast.error('Please provide a reason for this edit');
      return;
    }
    
    await onConfirm({ reason, data });
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>
        ⚠️ Historical Data Edit Warning
      </DialogTitle>
      <DialogContent>
        {!confirmed ? (
          <Alert severity="warning">
            <AlertTitle>Data Integrity Warning</AlertTitle>
            You are about to edit historical data from a previous academic year.
            This action will be logged and cannot be undone.
            <br /><br />
            <strong>Are you sure you want to proceed?</strong>
          </Alert>
        ) : (
          <>
            <TextField
              fullWidth
              label="Reason for Edit"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              rows={4}
              required
            />
            <Typography variant="caption" color="textSecondary">
              This edit will be permanently logged in the audit trail.
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleConfirm}
          color={confirmed ? "primary" : "error"}
          variant="contained"
        >
          {confirmed ? 'Confirm Edit' : 'I Understand, Continue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

## 6. Reports and Documents Across Years

### Report Card Strategy

#### Current Year Report Cards
- Real-time updates
- Draft and published states
- Teacher editing capabilities

#### Historical Report Cards
- Read-only access
- PDF generation
- Archival signature
- Cannot be modified

### Implementation

```javascript
// Get report cards with year filtering
const getStudentReportCards = async (req, res) => {
  const { studentId } = req.params;
  const { user, academicYearFilter, isHistoricalAccess } = req;
  
  // Check access permissions
  if (user.role === 'Student' && studentId !== user.studentProfile.id) {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  if (user.role === 'Parent') {
    const childIds = user.parentProfile.children.map(c => c.id);
    if (!childIds.includes(studentId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
  }
  
  const reportCards = await prisma.reportCard.findMany({
    where: {
      studentId,
      ...academicYearFilter
    },
    include: {
      academicYear: true,
      semester: true,
      grades: {
        include: {
          class: { include: { subject: true } },
          teacher: { include: { user: true } }
        }
      }
    },
    orderBy: { academicYear: { year: 'desc' } }
  });
  
  // Mark historical cards as read-only
  const enrichedReportCards = reportCards.map(card => ({
    ...card,
    isReadOnly: isHistoricalAccess || card.academicYearId !== academicYearFilter.academicYearId,
    isArchived: card.status === 'Archived'
  }));
  
  res.json(enrichedReportCards);
};

// Archive report card at year end
const archiveReportCards = async (academicYearId) => {
  await prisma.reportCard.updateMany({
    where: { academicYearId },
    data: {
      status: 'Archived',
      archivedAt: new Date()
    }
  });
};
```

### Transcript Generation

```javascript
const generateTranscript = async (studentId) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: {
      section: {
        include: {
          class: {
            include: { academicYear: true }
          }
        }
      },
      reportCards: {
        include: {
          grades: true
        }
      }
    },
    orderBy: { academicYear: { year: 'asc' } }
  });
  
  const transcript = {
    student: await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true }
    }),
    academicHistory: enrollments.map(enrollment => ({
      year: enrollment.section.class.academicYear.year,
      grade: enrollment.section.class.grade,
      gpa: calculateGPA(enrollment.reportCards),
      credits: calculateCredits(enrollment.reportCards),
      status: enrollment.status
    })),
    overallGPA: calculateOverallGPA(enrollments),
    totalCredits: calculateTotalCredits(enrollments),
    generatedAt: new Date()
  };
  
  return transcript;
};
```

### Payment History

```javascript
const getPaymentHistory = async (req, res) => {
  const { studentId } = req.params;
  const { user } = req;
  
  // Access control
  if (user.role === 'Student' && studentId !== user.studentProfile.id) {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  const payments = await prisma.payment.findMany({
    where: {
      fee: { studentId }
    },
    include: {
      fee: {
        include: {
          academicYear: true,
          student: { include: { user: true } }
        }
      },
      processedBy: { select: { name: true } }
    },
    orderBy: { paymentDate: 'desc' }
  });
  
  // Group by academic year
  const groupedByYear = payments.reduce((acc, payment) => {
    const year = payment.fee.academicYear.year;
    if (!acc[year]) acc[year] = [];
    acc[year].push(payment);
    return acc;
  }, {});
  
  res.json(groupedByYear);
};
```

### Attendance Reports

```javascript
const getAttendanceHistory = async (req, res) => {
  const { studentId } = req.params;
  const { user } = req;
  
  // Access control
  if (user.role === 'Student' && studentId !== user.studentProfile.id) {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: { studentId },
    include: {
      attendance: {
        include: {
          academicYear: true,
          class: true
        }
      }
    },
    orderBy: { attendance: { date: 'desc' } }
  });
  
  // Calculate statistics by year
  const yearlyStats = attendanceRecords.reduce((acc, record) => {
    const year = record.attendance.academicYear.year;
    if (!acc[year]) {
      acc[year] = {
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
        rate: 0
      };
    }
    acc[year][record.status.toLowerCase()]++;
    acc[year].total++;
    acc[year].rate = (acc[year].present / acc[year].total) * 100;
    return acc;
  }, {});
  
  res.json(yearlyStats);
};
```

## 7. Performance Considerations

### Database Optimization

#### Indexing Strategy

```prisma
// Composite indexes for common queries
@@index([academicYearId, branchId])      // Branch-specific year queries
@@index([academicYearId, studentId])     // Student-specific year queries
@@index([academicYearId, teacherId])      // Teacher-specific year queries
@@index([academicYearId, classId])       // Class-specific year queries
@@index([academicYearId, status])         // Status-based year queries
@@index([academicYearId, date])           // Date-based year queries
```

#### Query Optimization

```javascript
// Use select to limit fields
const getStudentGrades = async (studentId, academicYearId) => {
  return await prisma.grade.findMany({
    where: {
      studentId,
      academicYearId
    },
    select: {
      id: true,
      subject: true,
      percentage: true,
      status: true,
      class: {
        select: {
          name: true,
          subject: true
        }
      }
    }
  });
};

// Use cursor-based pagination for large datasets
const getStudentsPaginated = async (academicYearId, cursor, limit = 50) => {
  return await prisma.student.findMany({
    where: {
      enrollments: {
        some: {
          academicYearId
        }
      }
    },
    take: limit,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { id: 'asc' }
  });
};
```

### Caching Strategy

#### Redis Cache Keys

```javascript
// Cache key structure
const cacheKeys = {
  studentGrades: (studentId, yearId) => 
    `grades:${studentId}:${yearId}`,
  
  classStudents: (classId, yearId) => 
    `class:${classId}:${yearId}:students`,
  
  teacherClasses: (teacherId, yearId) => 
    `teacher:${teacherId}:${yearId}:classes`,
  
  attendanceStats: (classId, yearId, month) => 
    `attendance:${classId}:${yearId}:${month}`
};

// Cache invalidation on year change
const invalidateYearCache = async (yearId) => {
  const redis = getRedis();
  const pattern = `*:${yearId}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};
```

### Active Year Storage Strategy

#### Recommended: Database with Caching

**Why not JWT?**
- JWTs are immutable once issued
- Year changes would require re-issuing all tokens
- Cache invalidation becomes complex

**Why not Session?**
- Sessions are server-specific
- Doesn't scale well across multiple servers
- Adds complexity to load balancing

**Recommended Approach:**
1. Store active year in database (single source of truth)
2. Cache in Redis for fast access
3. Include in API responses
4. Frontend stores in context/state

```javascript
// Get active year with caching
const getActiveYear = async () => {
  const redis = getRedis();
  
  // Try cache first
  const cached = await redis.get('active:academic:year');
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const activeYear = await prisma.academicYear.findFirst({
    where: { isActive: true }
  });
  
  // Cache for 5 minutes
  await redis.set('active:academic:year', JSON.stringify(activeYear), 'EX', 300);
  
  return activeYear;
};

// Middleware to inject active year
const injectActiveYear = async (req, res, next) => {
  req.activeYear = await getActiveYear();
  next();
};
```

### Data Archival Strategy

For systems with thousands of students and multiple years:

```javascript
// Archive old data to separate tables or database
const archiveOldData = async (yearsToKeep = 3) => {
  const cutoffYear = new Date().getFullYear() - yearsToKeep;
  
  // Archive attendance records
  const oldAttendance = await prisma.attendance.findMany({
    where: {
      academicYear: { year: { lt: cutoffYear.toString() } }
    }
  });
  
  // Move to archive table
  await prisma.attendanceArchive.createMany({
    data: oldAttendance
  });
  
  // Delete from main table
  await prisma.attendance.deleteMany({
    where: {
      academicYear: { year: { lt: cutoffYear.toString() } }
    }
  });
};
```

## 8. User Experience Design

### Year Selection UI

#### Super Admin Interface

```javascript
const YearSwitcher = () => {
  const { years, activeYear, switchYear } = useAcademicYears();
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <DropdownTrigger>
        <Button variant="outlined">
          <CalendarIcon />
          {activeYear?.year || 'Select Year'}
          <ArrowDownIcon />
        </Button>
      </DropdownTrigger>
      
      <DropdownMenu>
        {years.map(year => (
          <MenuItem
            key={year.id}
            selected={year.id === activeYear?.id}
            onClick={() => {
              switchYear(year.id);
              setIsOpen(false);
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography>{year.year}</Typography>
              {year.isActive && (
                <Chip size="small" label="Active" color="primary" />
              )}
            </Box>
          </MenuItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};
```

#### Other Roles Interface

```javascript
const YearDisplay = () => {
  const { activeYear } = useAcademicYears();
  
  return (
    <Box display="flex" alignItems="center" gap={1}>
      <CalendarIcon color="action" />
      <Typography variant="body2" color="textSecondary">
        Academic Year: {activeYear?.year || 'Loading...'}
      </Typography>
    </Box>
  );
};
```

### Historical Data Access

#### Branch Admin Historical Access

```javascript
const HistoricalReports = () => {
  const [selectedYear, setSelectedYear] = useState(null);
  const { years } = useAcademicYears();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historical Reports</CardTitle>
      </CardHeader>
      
      <CardContent>
        <FormControl fullWidth>
          <InputLabel>Select Academic Year</InputLabel>
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {years.map(year => (
              <MenuItem key={year.id} value={year.id}>
                {year.year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {selectedYear && (
          <HistoricalReportViewer yearId={selectedYear} />
        )}
      </CardContent>
    </Card>
  );
};
```

### Year Change Notification

```javascript
const YearChangeNotification = () => {
  const { activeYear } = useAcademicYears();
  const [previousYear, setPreviousYear] = useState(null);
  
  useEffect(() => {
    if (previousYear && previousYear.id !== activeYear.id) {
      toast.info(
        `Academic year changed from ${previousYear.year} to ${activeYear.year}`,
        {
          autoClose: 5000,
          action: () => (
            <Button onClick={() => window.location.reload()}>
              Refresh
            </Button>
          )
        }
      );
    }
    setPreviousYear(activeYear);
  }, [activeYear]);
  
  return null;
};
```

### Dashboard Year Context

```javascript
const AcademicYearContext = createContext();

export const AcademicYearProvider = ({ children }) => {
  const [activeYear, setActiveYear] = useState(null);
  const [years, setYears] = useState([]);
  const { user } = useAuth();
  
  const fetchYears = async () => {
    const response = await axios.get('/academic-years');
    setYears(response.data);
    setActiveYear(response.data.find(y => y.isActive));
  };
  
  const switchYear = async (yearId) => {
    if (user.role !== 'SuperAdmin') return;
    
    await axios.patch(`/academic-years/${yearId}/active`);
    await fetchYears();
  };
  
  return (
    <AcademicYearContext.Provider value={{
      activeYear,
      years,
      switchYear,
      canSwitchYear: user.role === 'SuperAdmin',
      refreshYears: fetchYears
    }}>
      {children}
    </AcademicYearContext.Provider>
  );
};
```

## Implementation Roadmap

### Phase 1: Schema Updates (1-2 weeks)
1. Add `academicYearId` to Class, Section, TeacherAssignment, FeeStructure, GradingStructure
2. Create database migration
3. Update existing data to include current academic year
4. Add database indexes

### Phase 2: Backend Updates (2-3 weeks)
1. Implement academic year filtering middleware
2. Update all queries to include year filtering
3. Implement historical edit protection
4. Add audit logging for historical edits
4. Create year transition endpoints

### Phase 3: Frontend Updates (2-3 weeks)
1. Implement academic year context
2. Add year switcher for Super Admin
3. Add year display for other roles
4. Implement historical data access UI
5. Add year change notifications

### Phase 4: Testing (1-2 weeks)
1. Test year transition scenarios
2. Test historical data access
3. Test historical edit protections
4. Performance testing with large datasets
5. User acceptance testing

### Phase 5: Deployment (1 week)
1. Database migration in staging
2. Backend deployment
3. Frontend deployment
4. Monitor for issues
5. Rollback plan if needed

## Summary of Recommendations

### Data Isolation
- Add `academicYearId` to Class, Section, TeacherAssignment, FeeStructure, GradingStructure
- All queries must include academic year filtering
- Use composite indexes for performance

### Access Control
- Super Admin: Full access to all years with edit capabilities
- Other roles: Current year access + read-only historical access
- Implement confirmation and audit logging for historical edits

### Student Progression
- Create new enrollment records each year
- Maintain historical data integrity
- Support promotion, repetition, graduation scenarios

### Class/Teacher Assignments
- Create new class structures each year
- Re-assign teachers based on previous year
- Allow manual adjustments via UI

### Reports/Documents
- Current year: Real-time, editable
- Historical years: Read-only, archived
- Support cross-year reporting and transcripts

### Performance
- Database indexes on academic year fields
- Redis caching with year-based keys
- Consider data archival for very old data
- Active year stored in database with Redis caching

### User Experience
- Super Admin: Year switcher in header
- Other roles: Year display, historical access via reports
- Year change notifications
- Clear visual distinction between current and historical data

This strategy provides a comprehensive solution for managing academic years while maintaining data integrity, security, and performance.
