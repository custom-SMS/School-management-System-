# School Management System — API Reference

**Base URL:** `http://localhost:8000/api`
**Auth:** Cookie-based (httpOnly JWT). On `POST /auth/login` the server responds with `Set-Cookie: token=<jwt>; HttpOnly; SameSite=Lax` (SameSite=None + Secure in production). The browser/Postman stores it and sends it automatically on every subsequent request — there is **no** `Authorization` header and the token is **not** in the response body (JS can't read it, which is the point). `POST /auth/logout` clears the cookie.

Send `Content-Type: application/json` on requests with a body.

> **Postman:** cookies are handled by Postman's cookie jar automatically (stored for the `localhost` domain). Just run a Login request once; subsequent requests are authenticated. To switch roles, run a different Login request.
>
> **Frontend:** the axios client uses `withCredentials: true`. CORS is restricted to the origins in the backend `FRONTEND_URL` env var (defaults to `http://localhost:5173,http://localhost:5174,http://localhost:3000`) because credentialed CORS cannot use `*`.

> **curl example:**
> ```bash
> curl -c jar.txt -X POST http://localhost:8000/api/auth/login \
>   -H "Content-Type: application/json" \
>   -d '{"identifier":"superadmin@school.com","password":"superadmin"}'
> curl -b jar.txt http://localhost:8000/api/auth/permissions/me   # uses the saved cookie
> ```

**Seeded logins** (run `node seedAdmin.js` once):
| Role | identifier | password |
|---|---|---|
| Admin | `admin@school.com` | `admin` |
| SuperAdmin | `superadmin@school.com` | `superadmin` |
| Cashier | `cashier@school.com` | `cashier` |

Students log in with their `STU-xxxx` id, teachers with `TCH-xxxx`, parents with their email or `PAR-xxxx`.

---

## 1. Auth & Permissions

### POST `/auth/login` — public
```json
{ "identifier": "superadmin@school.com", "password": "superadmin" }
```
`identifier` accepts email, studentId, teacherId, or parentId. Sets the `token` httpOnly cookie and returns `{ message, user }`.

### POST `/auth/logout` — public
No body (JWT is stateless; client just drops the token).

### POST `/auth/register-admin` — public (bootstrap helper)
```json
{ "name": "Owner", "email": "owner@school.com", "password": "secret", "role": "SuperAdmin" }
```
`role` optional (default `Admin`).

### GET `/auth/permissions` — Admin, SuperAdmin
List role→permission rows.

### POST `/auth/permissions` — SuperAdmin
Replaces all permissions for a role.
```json
{ "role": "Admin", "permissions": ["student_registration", "manage_academic_year"] }
```

### GET `/auth/permissions/me` — any authenticated
Returns the current user's permissions (`["*"]` for SuperAdmin).

---

## 2. Academic Years

### GET `/academic-years` — any authenticated

### POST `/academic-years` — perm `manage_academic_year` / SuperAdmin
```json
{ "year": "2026/2027" }
```

### PATCH `/academic-years/:id/active` — perm `manage_academic_year` / SuperAdmin
No body. Marks this year active (deactivates others).

### PATCH `/academic-years/:id/registration` — perm `manage_academic_year` / SuperAdmin
```json
{ "registrationOpen": true }
```

---

## 3. Students

### GET `/students` — Admin, Teacher, SuperAdmin
Teachers get only their assigned students.

### POST `/students` — public (self-registration)
Requires an **active** academic year with `registrationOpen: true` **and** a configured grade fee for the grade.
```json
{
  "name": "Abel Tesfaye",
  "email": "abel@example.com",
  "grade": "Class 1",
  "personalDetails": { "dateOfBirth": "2015-03-01", "gender": "Male", "phone": "0911000000", "address": "Addis Ababa", "previousSchool": "ABC" },
  "familyBackground": { "fatherName": "Tesfaye", "motherName": "Marta", "occupation": "Trader" },
  "guardians": [
    { "fullName": "Tesfaye Bekele", "email": "tesfaye@example.com", "phone": "0911000001", "relationship": "Father", "primary": true }
  ]
}
```
Response includes auto-generated `credentials` (student) and `guardianCredentials` (parents).

### POST `/students/grade-fee` — perm `student_registration`
```json
{ "grade": "Class 1", "amount": 500 }
```

### GET `/students/grade-fee` — public
List configured grade fees.

### DELETE `/students/:id` — perm `student_registration`
Cascades enrollments, grades, fees, attendance, parent cleanup.

### POST `/students/promote` — perm `student_registration`
```json
{ "studentId": "<student.id>", "nextGrade": "Class 2", "nextAcademicYearId": "<year.id>", "sectionId": null }
```

### POST `/students/repeat` — perm `student_registration`
```json
{ "studentId": "<student.id>", "targetAcademicYearId": "<year.id>", "sectionId": null }
```

### PATCH `/students/:id/status` — perm `student_registration`
```json
{ "status": "Transferred", "enrollmentId": "<enrollment.id>" }
```
`status` ∈ Enrolled | Promoted | Repeated | Transferred | Graduated.

---

## 4. Teachers

### GET `/teachers` — Admin

### POST `/teachers` — Admin
```json
{ "name": "Sara Lemma", "email": "sara@school.com", "subject": "Mathematics", "password": "optional" }
```
Returns generated `teacherId` + password.

### DELETE `/teachers/:id` — Admin

---

## 5. Teacher Assignments

### GET `/assignments/options` — Admin
Returns teachers, classes, and `Class 1..12` names.

### POST `/assignments` — Admin
```json
{ "teacherId": "<teacher.id>", "classIds": ["<class.id>"], "specificClassNames": ["Class 3"], "notes": "Math" }
```
Provide `classId`, `classIds[]`, and/or `specificClassNames[]` (auto-creates missing classes).

### GET `/assignments/me` — Teacher
Logged-in teacher's assignments (with class + students).

### GET `/assignments` — Admin
All assignments.

---

## 6. Classroom (Classes, Sections, Attendance, Grades, Grading)

### GET `/classroom/options` — Teacher, Admin, SuperAdmin
Classes (+ students) for grade/attendance screens.

### POST `/classroom/classes` — Admin, SuperAdmin
```json
{ "name": "Class 1", "subject": "General", "teacherId": null, "schedule": null }
```

### GET `/classroom/classes` — Admin, SuperAdmin, Teacher

### POST `/classroom/sections` — Admin, SuperAdmin
```json
{ "name": "A", "classId": "<class.id>" }
```

### GET `/classroom/sections/:classId` — Admin, SuperAdmin, Teacher

### POST `/classroom/attendance` — Teacher, Admin, SuperAdmin
Future dates rejected; records older than 7 days locked (SuperAdmin can still write).
```json
{
  "classId": "<class.id>",
  "date": "2026-06-15",
  "records": [
    { "student": "<student.id>", "status": "Present" },
    { "student": "<student.id>", "status": "Absent" }
  ]
}
```
`status` ∈ Present | Absent | Late.

### GET `/classroom/attendance` — Admin, SuperAdmin
List recent attendance sessions with computed lock state. *(added)*

### PATCH `/classroom/attendance/:id/unlock` — SuperAdmin
No body. Unlocks a session.

### POST `/classroom/grades` — Teacher, Admin, SuperAdmin
Each component is scored **out of 100**; total is auto-computed from the active weights.
```json
{
  "classId": "<class.id>",
  "subject": "Mathematics",
  "gradesData": [
    { "student": "<student.id>", "marks": { "quiz": 80, "assignment": 90, "midterm": 75, "final": 88 } }
  ]
}
```

### GET `/classroom/grades/:classId/:subject` — Teacher, Admin, SuperAdmin

### POST `/classroom/grading-structure` — SuperAdmin
Weights must sum to 100.
```json
{ "quizWeight": 10, "assignmentWeight": 20, "midtermWeight": 30, "finalWeight": 40 }
```

### GET `/classroom/grading-structure` — any authenticated

---

## 7. Fees & Payments

### POST `/fees` — Admin, SuperAdmin, Cashier (records an already-paid fee)
```json
{ "studentId": "<student.id>", "amount": 500, "description": "Monthly Tuition", "month": "Meskerem", "dueDate": "2026-06-15" }
```

### POST `/fees/generate` — Admin, SuperAdmin, Cashier *(added)*
Creates **unpaid** invoices for all students (by grade fee), skipping any already invoiced for that month.
```json
{ "month": "Meskerem", "dueDate": "2026-06-30", "description": "Monthly Tuition - Meskerem" }
```

### GET `/fees/my` — Student, Parent *(added)*
Logged-in student's fees with status. Parents must pass `?childStudentId=<student.id>`.

### POST `/fees/bank-pay` — Student, Parent, SuperAdmin
Submits a bank transfer for cashier verification (ownership enforced).
```json
{ "feeId": "<fee.id>", "amount": 500, "transactionReference": "FT123456789", "bankName": "CBE" }
```

### GET `/fees/pending-verifications` — Admin, SuperAdmin, Cashier

### PATCH `/fees/verify/:paymentId` — Cashier, SuperAdmin
```json
{ "status": "Verified" }
```
`status` ∈ Verified | Rejected. Verifying marks the fee paid and issues a receipt.

### GET `/fees/receipts/:paymentId` — any authenticated

### GET `/fees/defaulters/:month` — Admin, SuperAdmin, Cashier
e.g. `/fees/defaulters/Meskerem`.

### GET `/fees/paid/:month/:classId` — Admin, SuperAdmin, Cashier

### POST `/fees/structures` — Admin, SuperAdmin, Cashier
```json
{ "grade": "Class 1", "amount": 500, "description": "Tuition" }
```

### GET `/fees/structures` — any authenticated

---

## 8. Subjects

### GET `/subjects` — any authenticated
### POST `/subjects` — Admin, SuperAdmin
```json
{ "name": "Physics", "department": "Science" }
```
### DELETE `/subjects/:id` — Admin, SuperAdmin

---

## 9. Timetables

### GET `/timetables/class/:classId/:academicYearId` — any authenticated
Optional `?sectionId=<id>`.

### GET `/timetables/teacher/me` — Teacher, SuperAdmin
### GET `/timetables/student/me` — Student, Parent, SuperAdmin
Parents pass `?childStudentId=<student.id>`.

### POST `/timetables` — Admin, SuperAdmin (create or update if `id` given)
```json
{
  "academicYearId": "<year.id>",
  "classId": "<class.id>",
  "subjectId": "<subject.id>",
  "sectionId": null,
  "dayOfWeek": "Monday",
  "startTime": "08:30",
  "endTime": "09:30",
  "room": "R1"
}
```

### DELETE `/timetables/:id` — Admin, SuperAdmin

---

## 10. Report Cards

### POST `/report-cards/compile` — Admin, SuperAdmin
```json
{ "academicYearId": "<year.id>" }
```

### POST `/report-cards/publish` — Admin, SuperAdmin
```json
{ "academicYearId": "<year.id>" }
```

### GET `/report-cards/:studentId/:academicYearId` — any authenticated
Students/parents only see it once published.

### PATCH `/report-cards/:id/comments` — Admin, SuperAdmin, Teacher
```json
{ "comments": "Great improvement this term." }
```

---

## 11. Notifications

### GET `/notifications` — any authenticated (last 50)
### PATCH `/notifications/:id/read` — any authenticated (no body)

---

## 12. Audit Logs

### GET `/audit-logs` — Admin, SuperAdmin
Query: `?page=1&action=Promote` (action is a search filter). Returns `{ logs, totalPages }`.

---

## 13. Stats / Dashboards

### GET `/stats/admin` — Admin, SuperAdmin, Cashier
### GET `/stats/student/me` — Student
### GET `/stats/teacher/me` — Teacher
### GET `/stats/parent/me` — Parent

---

## Suggested end-to-end test order

1. `node seedAdmin.js`, then **login as SuperAdmin**.
2. Create academic year → set active → open registration.
3. Set a grade fee (`/students/grade-fee`).
4. Register a student (`/students`) — save the returned student/guardian credentials.
5. Create subjects, a class, a section (`/subjects`, `/classroom/classes`, `/classroom/sections`).
6. Register a teacher, then assign to the class (`/teachers`, `/assignments`).
7. Record attendance and grades for the class.
8. Generate invoices (`/fees/generate`) → login as the student → `/fees/my` → `/fees/bank-pay` → login as Cashier → `/fees/pending-verifications` → `/fees/verify/:id` → `/fees/receipts/:id`.
9. Compile + publish report cards → login as student → `/report-cards/:studentId/:yearId`.
