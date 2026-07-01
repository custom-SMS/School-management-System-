# School Management System — API Reference (By Role)

**Base URL:** `http://localhost:8000/api`
**Auth:** Cookie-based (httpOnly JWT). On `POST /auth/login` the server responds with a cookie. This cookie is used for subsequent requests automatically.

**Seeded logins** (run `node seedAdmin.js` once):
| Role | identifier | password |
|---|---|---|
| Admin | `admin@school.com` | `admin` |
| SuperAdmin | `superadmin@school.com` | `superadmin` |
| Cashier | `cashier@school.com` | `cashier` |
*(Students log in with their `STU-xxxx` id, teachers with `TCH-xxxx`, parents with their email or `PAR-xxxx`)*

---

## 1. Public (No Authentication Required)

These endpoints can be accessed without a login cookie.

- **POST `/auth/login`**
  - Body: `{ "identifier": "superadmin@school.com", "password": "superadmin" }`
  - Notes: `identifier` accepts email, studentId, teacherId, or parentId. Sets the `token` httpOnly cookie.
- **POST `/auth/logout`**
  - Notes: Clears the authentication cookie.
- **POST `/auth/register-admin`**
  - Body: `{ "name": "Owner", "email": "owner@school.com", "password": "secret", "role": "SuperAdmin" }`
  - Notes: Bootstrap helper. `role` is optional (defaults to `Admin`).
- **POST `/students`**
  - Notes: Public self-registration for students. Requires an active academic year with registration open.
- **GET `/students/grade-fee`**
  - Notes: List configured grade fees.

---

## 2. All Authenticated Users

Any logged-in user (SuperAdmin, Admin, Cashier, Teacher, Student, Parent) can access these endpoints.

- **GET `/auth/permissions/me`** — Returns current user's permissions.
- **GET `/academic-years`** — Lists all academic years.
- **GET `/classroom/grading-structure`** — Views current grading weights.
- **GET `/fees/receipts/:paymentId`** — View a generated receipt.
- **GET `/fees/structures`** — List all fee structures.
- **GET `/subjects`** — List all subjects.
- **GET `/timetables/class/:classId/:academicYearId`** — Get a class's timetable.
- **GET `/report-cards/:studentId/:academicYearId`** — View a published report card.
- **GET `/notifications`** — View last 50 notifications for the logged-in user.
- **PATCH `/notifications/:id/read`** — Mark a notification as read.

---

## 3. SuperAdmin

SuperAdmins have access to all Admin routes, plus these exclusive administrative actions.

- **POST `/auth/permissions`**
  - Body: `{ "role": "Admin", "permissions": ["student_registration"] }`
  - Notes: Replaces all permissions for a role.
- **PATCH `/academic-years/:id/active`**
  - Notes: Marks an academic year as active and deactivates others.
- **PATCH `/academic-years/:id/registration-period`**
  - Body: `{ "registrationStart": "2026-06-01", "registrationEnd": "2026-07-01" }`
- **PATCH `/classroom/attendance/:id/unlock`**
  - Notes: Unlocks an older attendance session so it can be edited.
- **POST `/classroom/grading-structure`**
  - Body: `{ "quizWeight": 10, "assignmentWeight": 20, "midtermWeight": 30, "finalWeight": 40 }`

---

## 4. Admin

Admins have access to the following endpoints (some require specific permissions). *Note: SuperAdmins also have access to all of these.*

**Authentication & Settings**
- **GET `/auth/permissions`** — List role→permission rows.
- **GET `/audit-logs`** — View system audit logs (supports `?page=1&action=Promote`).
- **GET `/stats/admin`** — Dashboard statistics.

**Academic Years & Subjects**
- **POST `/academic-years`** — Create a new academic year.
- **POST `/subjects`** — Create a new subject.
- **DELETE `/subjects/:id`** — Delete a subject.

**Students & Teachers**
- **GET `/students`** — List all students.
- **DELETE `/students/:id`** — Delete a student and their data.
- **POST `/students/promote`** — Promote a student to the next grade.
- **POST `/students/repeat`** — Make a student repeat a grade.
- **PATCH `/students/:id/status`** — Change student status (e.g., Transferred).
- **GET `/teachers`** — List all teachers.
- **POST `/teachers`** — Register a new teacher.
- **DELETE `/teachers/:id`** — Delete a teacher.

**Classes & Assignments**
- **GET `/assignments/options`** — Returns teachers, classes, and Grade 1..12 names.
- **GET `/assignments`** — View all teacher assignments.
- **POST `/assignments`** — Assign a teacher to a class/subject.
- **GET `/classroom/options`** — Options for grades/attendance.
- **GET `/classroom/classes`** — List all classes.
- **POST `/classroom/classes`** — Create a new class.
- **GET `/classroom/sections/:classId`** — List sections for a class.
- **POST `/classroom/sections`** — Create a new section.
- **POST `/timetables`** — Create or update a timetable slot.
- **DELETE `/timetables/:id`** — Delete a timetable slot.

**Attendance & Grades**
- **POST `/classroom/attendance`** — Record or update attendance.
- **GET `/classroom/attendance`** — List recent attendance sessions.
- **POST `/classroom/grades`** — Record student grades.
- **GET `/classroom/grades/:classId/:subject`** — View grades for a class.
- **POST `/report-cards/compile`** — Compile report cards for a year.
- **POST `/report-cards/publish`** — Publish compiled report cards.
- **PATCH `/report-cards/:id/comments`** — Add comments to a report card.

**Fees & Finances (Also accessible by Cashier)**
- **POST `/students/grade-fee`** — Configure a fee for a specific grade.
- **POST `/fees`** — Record an already-paid fee.
- **POST `/fees/generate`** — Create unpaid invoices for all students.
- **GET `/fees/pending-verifications`** — View bank transfers waiting for approval.
- **GET `/fees/defaulters/:month`** — View students who haven't paid.
- **GET `/fees/paid/:month/:classId`** — View paid fees.
- **POST `/fees/structures`** — Create a new fee structure.

---

## 5. Cashier

Cashiers manage finances and payments.

- **GET `/stats/admin`** — Financial dashboard stats.
- **POST `/fees`** — Record an already-paid fee.
- **POST `/fees/generate`** — Create unpaid invoices for all students.
- **GET `/fees/pending-verifications`** — View bank transfers waiting for approval.
- **PATCH `/fees/verify/:paymentId`** — Verify (`"Verified"`) or reject (`"Rejected"`) a bank payment.
- **GET `/fees/defaulters/:month`** — View unpaid fees.
- **GET `/fees/paid/:month/:classId`** — View paid fees.
- **POST `/fees/structures`** — Create fee structures.

---

## 6. Teacher

Teachers manage their assigned classes, attendance, and grades.

- **GET `/stats/teacher/me`** — Teacher dashboard statistics.
- **GET `/students`** — List only the students assigned to them.
- **GET `/assignments/me`** — View their own class/subject assignments.
- **GET `/timetables/teacher/me`** — View their personal teaching schedule.
- **GET `/classroom/options`** — Options for grades/attendance.
- **GET `/classroom/classes`** — View classes.
- **GET `/classroom/sections/:classId`** — View sections for a class.
- **POST `/classroom/attendance`** — Record attendance for their class.
- **POST `/classroom/grades`** — Record grades for their students.
- **GET `/classroom/grades/:classId/:subject`** — View grades for their class.
- **PATCH `/report-cards/:id/comments`** — Add comments to their students' report cards.

---

## 7. Student

Students can view their own academic and financial progress.

- **GET `/stats/student/me`** — Student dashboard stats.
- **GET `/timetables/student/me`** — View personal class schedule.
- **GET `/fees/my`** — View personal fee invoices and payment status.
- **POST `/fees/bank-pay`**
  - Body: `{ "feeId": "<fee.id>", "amount": 500, "transactionReference": "FT123", "bankName": "CBE" }`
  - Notes: Submit a bank transfer for cashier verification.

---

## 8. Parent

Parents can view records for their linked children.

- **GET `/stats/parent/me`** — Parent dashboard stats.
- **GET `/timetables/student/me?childStudentId=<student.id>`** — View a child's schedule.
- **GET `/fees/my?childStudentId=<student.id>`** — View a child's fee invoices.
- **POST `/fees/bank-pay`** — Submit a bank transfer payment on behalf of a child.
