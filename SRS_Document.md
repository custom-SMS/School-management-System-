# Software Requirements Specification (SRS)
## School Management System

**Version:** 1.0  
**Date:** June 29, 2026  
**Prepared by:** Development Team

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Features and Requirements](#3-system-features-and-requirements)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [System Models](#6-system-models)
7. [Appendices](#7-appendices)

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) document provides a comprehensive description of the School Management System (SMS). It details the functional and non-functional requirements for stakeholders including developers, administrators, teachers, students, and parents.

### 1.2 Scope
The School Management System is a web-based application designed to automate and streamline administrative, academic, and financial operations in educational institutions. The system encompasses:

- **Student Management:** Registration, enrollment, promotion, and academic tracking
- **Teacher Management:** Assignment, class allocation, and performance tracking
- **Academic Management:** Grading, attendance, timetables, and report cards
- **Financial Management:** Fee structure, payment processing, and receipt generation
- **User Management:** Role-based access control with six distinct user roles
- **Communication:** Notifications and audit logging

### 1.3 Definitions, Acronyms, and Abbreviations
- **SMS:** School Management System
- **API:** Application Programming Interface
- **JWT:** JSON Web Token
- **RBAC:** Role-Based Access Control
- **SRS:** Software Requirements Specification
- **CRUD:** Create, Read, Update, Delete
- **UI:** User Interface

### 1.4 References
- API Documentation: [API_DOCS.md](./API_DOCS.md)
- Database Schema: `backend/prisma/schema.prisma`
- Postman Collection: `SMS_API.postman_collection.json`

### 1.5 Overview
This document is organized into seven sections covering system introduction, overall description, functional requirements, interface requirements, non-functional requirements, system models, and appendices.

---

## 2. Overall Description

### 2.1 Product Perspective
The School Management System is a standalone web application consisting of:
- **Backend:** RESTful API built with Node.js, Express.js, and PostgreSQL
- **Frontend:** Single Page Application (SPA) built with React, TypeScript, and Tailwind CSS
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Secure cookie-based JWT authentication

### 2.2 Product Functions
The system provides the following major functions:

1. **Authentication & Authorization**
   - Secure login/logout
   - Role-based permissions management
   - Cookie-based session management

2. **Academic Year Management**
   - Create and manage academic years
   - Control registration periods
   - Set active academic year

3. **Student Lifecycle Management**
   - Self-registration during open periods
   - Enrollment tracking
   - Promotion and repetition workflows
   - Status management (Enrolled, Promoted, Transferred, Graduated)

4. **Class & Section Management**
   - Create classes and sections
   - Assign students to sections
   - Manage classroom resources

5. **Teacher Management**
   - Teacher registration and profile management
   - Class and subject assignments
   - Assignment tracking

6. **Attendance System**
   - Daily attendance recording
   - Bulk operations
   - Lock/unlock mechanism with approval workflow

7. **Grading System**
   - Subject-wise grade entry
   - Multiple assessment types (exam, quiz, assignment)
   - Grade calculation and aggregation

8. **Financial Management**
   - Grade-based fee configuration
   - Invoice generation
   - Multiple payment methods (cash, bank, mobile)
   - Payment verification workflow
   - Receipt generation (PDF)

9. **Timetable Management**
   - Create and manage class schedules
   - Subject and teacher allocation
   - Time slot management

10. **Report Card System**
    - Compile academic performance reports
    - Teacher comments and feedback
    - Publish to students and parents

11. **Notification System**
    - Real-time notifications for all user roles
    - Read/unread status tracking

12. **Audit & Reporting**
    - Comprehensive audit logging
    - Dashboard statistics for all user roles
    - Action history tracking

### 2.3 User Classes and Characteristics

#### 2.3.1 SuperAdmin
- **Characteristics:** Full system access with unrestricted permissions
- **Responsibilities:** System configuration, permission management, critical operations
- **Technical Expertise:** High
- **Frequency of Use:** Daily

#### 2.3.2 Admin
- **Characteristics:** Administrative staff with configurable permissions
- **Responsibilities:** Student registration, teacher management, academic operations
- **Technical Expertise:** Moderate to High
- **Frequency of Use:** Daily

#### 2.3.3 Cashier
- **Characteristics:** Financial operations staff
- **Responsibilities:** Payment verification, receipt issuance, financial reporting
- **Technical Expertise:** Moderate
- **Frequency of Use:** Daily

#### 2.3.4 Teacher
- **Characteristics:** Academic staff assigned to classes
- **Responsibilities:** Attendance recording, grade entry, student performance tracking
- **Technical Expertise:** Moderate
- **Frequency of Use:** Daily

#### 2.3.5 Student
- **Characteristics:** End-users enrolled in the institution
- **Responsibilities:** View grades, attendance, fees, and report cards
- **Technical Expertise:** Low to Moderate
- **Frequency of Use:** Weekly

#### 2.3.6 Parent
- **Characteristics:** Guardians of enrolled students
- **Responsibilities:** Monitor children's academic progress, attendance, and fees
- **Technical Expertise:** Low to Moderate
- **Frequency of Use:** Weekly

### 2.4 Operating Environment
- **Backend Server:** Node.js v18+ runtime environment
- **Database:** PostgreSQL 14+
- **Web Browser:** Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Network:** Internet connectivity required
- **Platform:** Cross-platform web application

### 2.5 Design and Implementation Constraints
- **Technology Stack:**
  - Backend: Node.js, Express.js, Prisma ORM
  - Frontend: React 19, TypeScript, Tailwind CSS
  - Database: PostgreSQL
  - Authentication: JWT with httpOnly cookies
  
- **Security Constraints:**
  - All passwords must be hashed using bcrypt
  - JWT tokens stored in httpOnly cookies (not accessible via JavaScript)
  - CORS restricted to configured frontend origins
  - Role-based access control enforced on all endpoints

- **Data Constraints:**
  - Student IDs follow format: STU-XXXX (auto-generated)
  - Teacher IDs follow format: TCH-XXXX (auto-generated)
  - Parent IDs follow format: PAR-XXXX (auto-generated)
  - Academic year format: YYYY/YYYY (e.g., 2026/2027)

### 2.6 Assumptions and Dependencies
- PostgreSQL database server is available and accessible
- SMTP service (Resend) is configured for email notifications
- Node.js runtime environment is properly configured
- Users have stable internet connectivity
- Modern web browsers with JavaScript enabled

---

## 3. System Features and Requirements

### 3.1 Authentication & Authorization

#### 3.1.1 Description
Secure user authentication and role-based authorization system with granular permission control.

#### 3.1.2 Functional Requirements

**FR-AUTH-001:** The system shall authenticate users via email, student ID, teacher ID, or parent ID with password.

**FR-AUTH-002:** The system shall issue httpOnly JWT cookies upon successful authentication.

**FR-AUTH-003:** The system shall support six user roles: SuperAdmin, Admin, Cashier, Teacher, Student, Parent.

**FR-AUTH-004:** SuperAdmin shall have wildcard permissions ("*") granting access to all system functions.

**FR-AUTH-005:** Admin and other roles shall have configurable permissions stored in RolePermission table.

**FR-AUTH-006:** The system shall allow SuperAdmin to modify role permissions.

**FR-AUTH-007:** The system shall provide a public bootstrap endpoint for initial SuperAdmin registration.

**FR-AUTH-008:** The system shall validate JWT tokens on every protected endpoint request.

**FR-AUTH-009:** The system shall clear authentication cookies on logout.

**FR-AUTH-010:** The system shall return current user permissions via dedicated endpoint.

### 3.2 Academic Year Management

#### 3.2.1 Description
Manage academic years, control registration periods, and maintain active year status.

#### 3.2.2 Functional Requirements

**FR-ACAD-001:** The system shall allow creation of academic years with format YYYY/YYYY.

**FR-ACAD-002:** Only one academic year shall be active at any given time.

**FR-ACAD-003:** The system shall support registration window control with start and end dates.

**FR-ACAD-004:** The system shall prevent duplicate academic year entries.

**FR-ACAD-005:** Activating a new academic year shall automatically deactivate the previous active year.

**FR-ACAD-006:** The system shall require permission "manage_academic_year" or SuperAdmin role for academic year operations.

### 3.3 Student Management

#### 3.3.1 Description
Comprehensive student lifecycle management from registration through graduation.

#### 3.3.2 Functional Requirements

**FR-STU-001:** The system shall allow public self-registration during open registration periods.

**FR-STU-002:** Student registration shall require an active academic year with registrationOpen flag set to true.

**FR-STU-003:** Student registration shall require a configured grade fee for the selected grade.

**FR-STU-004:** The system shall auto-generate unique student IDs in format STU-XXXX.

**FR-STU-005:** The system shall collect personal details: name, email, grade, date of birth, gender, phone, address.

**FR-STU-006:** The system shall collect family background: father name, mother name, occupation.

**FR-STU-007:** The system shall support multiple guardians with at least one marked as primary.

**FR-STU-008:** Guardian information shall include: full name, email, phone, relationship.

**FR-STU-009:** The system shall auto-generate login credentials for students and guardians.

**FR-STU-010:** The system shall create Parent records and link them to students.

**FR-STU-011:** The system shall support student promotion to next grade level.

**FR-STU-012:** The system shall support student repetition (repeating same grade).

**FR-STU-013:** The system shall track student status: Enrolled, Promoted, Repeated, Transferred, Graduated.

**FR-STU-014:** The system shall allow student deletion with cascade deletion of related records.

**FR-STU-015:** Admin and Teachers shall view student lists based on their access permissions.

**FR-STU-016:** Teachers shall only view students assigned to their classes.

### 3.4 Teacher Management

#### 3.4.1 Description
Management of teacher records, credentials, and basic profile information.

#### 3.4.2 Functional Requirements

**FR-TCH-001:** The system shall allow Admin users to create teacher accounts.

**FR-TCH-002:** The system shall auto-generate unique teacher IDs in format TCH-XXXX.

**FR-TCH-003:** Teacher records shall include: name, email, subject specialization, qualification, department.

**FR-TCH-004:** The system shall auto-generate passwords for teachers if not provided.

**FR-TCH-005:** The system shall return generated credentials upon teacher creation.

**FR-TCH-006:** The system shall support teacher status management (Active/Inactive).

**FR-TCH-007:** Admin users shall be able to delete teacher records.

**FR-TCH-008:** The system shall track teacher hire dates.

### 3.5 Teacher Assignment Management

#### 3.5.1 Description
Assign teachers to classes and track their teaching responsibilities.

#### 3.5.2 Functional Requirements

**FR-ASSIGN-001:** Admin users shall assign teachers to one or multiple classes.

**FR-ASSIGN-002:** Assignments shall support class IDs and/or specific class names (e.g., "Class 3").

**FR-ASSIGN-003:** The system shall auto-create classes if specified by name but not existing.

**FR-ASSIGN-004:** Assignments shall support optional notes field.

**FR-ASSIGN-005:** Teachers shall view their assigned classes via dedicated endpoint.

**FR-ASSIGN-006:** Teacher assignment responses shall include class details and enrolled students.

**FR-ASSIGN-007:** Admin users shall view all teacher assignments with filtering options.

### 3.6 Class & Section Management

#### 3.6.1 Description
Organize students into classes and sections for academic grouping.

#### 3.6.2 Functional Requirements

**FR-CLASS-001:** The system shall support creation of classes with unique names.

**FR-CLASS-002:** Classes shall support grade level and optional description.

**FR-CLASS-003:** The system shall support creation of sections within classes (e.g., "A", "B", "C").

**FR-CLASS-004:** Sections shall be linked to parent class.

**FR-CLASS-005:** The system shall allow students to be enrolled in specific sections.

**FR-CLASS-006:** The system shall manage classroom resources with attributes: name, number, capacity, building, status.

**FR-CLASS-007:** Classroom numbers shall be unique across the system.

### 3.7 Subject Management

#### 3.7.1 Description
Define and manage academic subjects offered by the institution.

#### 3.7.2 Functional Requirements

**FR-SUBJ-001:** The system shall allow creation of subjects with unique names.

**FR-SUBJ-002:** Subjects shall support optional department classification.

**FR-SUBJ-003:** The system shall prevent duplicate subject names.

**FR-SUBJ-004:** Subjects shall be available for teacher assignments and grade entries.

### 3.8 Attendance Management

#### 3.8.1 Description
Track daily student attendance with lock/unlock mechanism for data integrity.

#### 3.8.2 Functional Requirements

**FR-ATT-001:** Teachers shall record attendance for their assigned classes.

**FR-ATT-002:** Attendance records shall be linked to specific dates and academic years.

**FR-ATT-003:** The system shall support individual attendance status: Present, Absent, Late, Excused.

**FR-ATT-004:** The system shall support bulk attendance operations.

**FR-ATT-005:** Attendance records shall be locked after submission to prevent unauthorized modifications.

**FR-ATT-006:** Teachers shall request attendance unlock with reason justification.

**FR-ATT-007:** Admin/SuperAdmin shall approve or reject unlock requests.

**FR-ATT-008:** Unlock requests shall track status: Pending, Approved, Rejected.

**FR-ATT-009:** Approved unlock requests shall allow temporary editing of attendance.

**FR-ATT-010:** The system shall maintain audit trail of all attendance modifications.

**FR-ATT-011:** Students and parents shall view attendance history.

**FR-ATT-012:** The system shall calculate attendance statistics (present %, absent %, late %).

### 3.9 Grading System

#### 3.9.1 Description
Record and manage student academic performance across subjects and assessment types.

#### 3.9.2 Functional Requirements

**FR-GRADE-001:** Teachers shall enter grades for students in their assigned subjects.

**FR-GRADE-002:** The system shall support multiple assessment types: Exam, Quiz, Assignment, Project, Midterm, Final.

**FR-GRADE-003:** Grade entries shall include: score, maximum score, weight, and optional remarks.

**FR-GRADE-004:** Grades shall be linked to specific academic years and subjects.

**FR-GRADE-005:** The system shall validate score does not exceed maximum score.

**FR-GRADE-006:** The system shall calculate weighted averages for final grades.

**FR-GRADE-007:** Students shall view their grades per subject and assessment type.

**FR-GRADE-008:** Parents shall view their children's grades.

**FR-GRADE-009:** The system shall support bulk grade import operations.

**FR-GRADE-010:** Admin users shall have full access to all student grades.

### 3.10 Financial Management

#### 3.10.1 Description
Comprehensive fee management system with payment processing and receipt generation.

#### 3.10.2 Functional Requirements

**FR-FEE-001:** The system shall support grade-based fee configuration.

**FR-FEE-002:** Each grade shall have a configurable fee amount.

**FR-FEE-003:** The system shall generate invoices for students based on their grade.

**FR-FEE-004:** Invoice generation shall be restricted to students with configured grade fees.

**FR-FEE-005:** The system shall support multiple payment methods: Cash, Bank, Mobile Money.

**FR-FEE-006:** Cash payments shall be immediately verified and confirmed.

**FR-FEE-007:** Bank and mobile payments shall require verification by Cashier.

**FR-FEE-008:** Payment verification workflow shall include: Pending → Verified or Rejected.

**FR-FEE-009:** The system shall generate PDF receipts for verified payments.

**FR-FEE-010:** Receipts shall include: student details, amount, payment method, date, receipt number.

**FR-FEE-011:** Students and parents shall view fee status and payment history.

**FR-FEE-012:** The system shall track outstanding balances and payment due dates.

**FR-FEE-013:** Cashiers shall access pending payment verifications dashboard.

**FR-FEE-014:** The system shall generate unique receipt numbers for each transaction.

**FR-FEE-015:** Admin and Cashier shall access comprehensive financial reports.

### 3.11 Timetable Management

#### 3.11.1 Description
Schedule and manage class timetables with subject and teacher allocation.

#### 3.11.2 Functional Requirements

**FR-TIME-001:** The system shall support creation of timetable entries.

**FR-TIME-002:** Timetable entries shall include: day, start time, end time, subject, teacher, classroom.

**FR-TIME-003:** Timetables shall be linked to specific sections and academic years.

**FR-TIME-004:** The system shall validate time slot conflicts for teachers.

**FR-TIME-005:** The system shall validate time slot conflicts for classrooms.

**FR-TIME-006:** Teachers shall view their personal timetables.

**FR-TIME-007:** Students shall view their class timetables.

**FR-TIME-008:** The system shall support days: Monday through Sunday.

### 3.12 Report Card System

#### 3.12.1 Description
Generate comprehensive academic performance reports for students.

#### 3.12.2 Functional Requirements

**FR-REPORT-001:** The system shall compile report cards aggregating all grades for an academic year.

**FR-REPORT-002:** Report cards shall calculate overall performance metrics.

**FR-REPORT-003:** Report cards shall include teacher comments and remarks.

**FR-REPORT-004:** The system shall track promotion status: Promoted, Not Promoted, Conditional Promotion, Pending.

**FR-REPORT-005:** Homeroom teachers shall update promotion decisions.

**FR-REPORT-006:** Report cards shall remain unpublished until explicitly published by Admin/SuperAdmin.

**FR-REPORT-007:** Students and parents shall only view published report cards.

**FR-REPORT-008:** Admin and Teachers shall view all report cards regardless of publication status.

**FR-REPORT-009:** The system shall track who promoted the student and when.

**FR-REPORT-010:** Report cards shall be unique per student per academic year.

### 3.13 Notification System

#### 3.13.1 Description
Real-time notification system for user communication and system alerts.

#### 3.13.2 Functional Requirements

**FR-NOTIF-001:** The system shall generate notifications for significant events.

**FR-NOTIF-002:** Notifications shall be targeted to specific user roles or individuals.

**FR-NOTIF-003:** Users shall view their last 50 notifications.

**FR-NOTIF-004:** Notifications shall support read/unread status tracking.

**FR-NOTIF-005:** Users shall mark notifications as read individually.

**FR-NOTIF-006:** The system shall include notification badges for unread count.

**FR-NOTIF-007:** Notification types shall include: Payment, Grade, Attendance, Report Card, System alerts.

### 3.14 Audit Logging

#### 3.14.1 Description
Comprehensive audit trail for security, compliance, and troubleshooting.

#### 3.14.2 Functional Requirements

**FR-AUDIT-001:** The system shall log all significant user actions automatically.

**FR-AUDIT-002:** Audit logs shall capture: user, action, entity, timestamp, IP address, details.

**FR-AUDIT-003:** Logged actions shall include: Login, Logout, Create, Update, Delete, Promote, Verify, Publish.

**FR-AUDIT-004:** Admin and SuperAdmin shall access audit log viewer.

**FR-AUDIT-005:** The system shall support audit log filtering by action type.

**FR-AUDIT-006:** The system shall support pagination for large audit log datasets.

**FR-AUDIT-007:** Audit logs shall be immutable (no deletion or modification).

**FR-AUDIT-008:** The system shall log failed authentication attempts.

### 3.15 Dashboard & Statistics

#### 3.15.1 Description
Role-specific dashboards providing relevant metrics and insights.

#### 3.15.2 Functional Requirements

**FR-DASH-001:** Admin/SuperAdmin shall view comprehensive system statistics.

**FR-DASH-002:** Admin dashboard shall include: total students, teachers, pending payments, recent activities.

**FR-DASH-003:** Cashier dashboard shall display: pending verifications, daily revenue, payment summaries.

**FR-DASH-004:** Teacher dashboard shall show: assigned classes, upcoming schedules, pending tasks.

**FR-DASH-005:** Student dashboard shall display: grades, attendance summary, fee status, upcoming events.

**FR-DASH-006:** Parent dashboard shall show: children's performance, attendance, fee status for all children.

**FR-DASH-007:** All dashboards shall refresh data in real-time or near real-time.

---

## 4. External Interface Requirements

### 4.1 User Interfaces

#### 4.1.1 General UI Requirements

**UI-001:** The system shall provide a responsive web interface compatible with desktop, tablet, and mobile devices.

**UI-002:** The interface shall use a consistent color scheme and design language throughout.

**UI-003:** The system shall display loading indicators during asynchronous operations.

**UI-004:** Error messages shall be clear, actionable, and user-friendly.

**UI-005:** Success confirmations shall be displayed via toast notifications.

**UI-006:** The system shall support dark and light theme modes.

#### 4.1.2 Authentication Interface

**UI-AUTH-001:** Login page shall accept identifier (email/ID) and password inputs.

**UI-AUTH-002:** The system shall display appropriate error messages for invalid credentials.

**UI-AUTH-003:** The system shall redirect users to role-appropriate dashboards after login.

#### 4.1.3 Navigation

**UI-NAV-001:** The system shall provide a persistent navigation menu based on user role.

**UI-NAV-002:** Navigation items shall be organized by functional categories.

**UI-NAV-003:** Active navigation items shall be visually distinguished.

**UI-NAV-004:** The system shall display user profile and logout options in header.

#### 4.1.4 Data Tables

**UI-TABLE-001:** Data tables shall support sorting by columns.

**UI-TABLE-002:** Data tables shall support filtering and search functionality.

**UI-TABLE-003:** Data tables shall support pagination with configurable page sizes.

**UI-TABLE-004:** Action buttons (Edit, Delete, View) shall be clearly visible.

#### 4.1.5 Forms

**UI-FORM-001:** Forms shall provide clear labels for all input fields.

**UI-FORM-002:** Required fields shall be marked with asterisks (*).

**UI-FORM-003:** The system shall validate inputs client-side before submission.

**UI-FORM-004:** Validation errors shall be displayed inline near relevant fields.

**UI-FORM-005:** Forms shall disable submit buttons during processing to prevent duplicate submissions.

### 4.2 API Interfaces

#### 4.2.1 RESTful API Design

**API-001:** All endpoints shall be accessible via base URL: `http://localhost:8000/api` (development).

**API-002:** API shall use standard HTTP methods: GET, POST, PATCH, DELETE.

**API-003:** Request bodies shall use JSON format with `Content-Type: application/json`.

**API-004:** Responses shall return appropriate HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

**API-005:** Error responses shall include descriptive error messages.

**API-006:** Success responses shall include relevant data and success messages.

#### 4.2.2 Authentication Flow

**API-AUTH-001:** Authentication shall use httpOnly cookies for JWT storage.

**API-AUTH-002:** Login endpoint shall set `Set-Cookie` header with JWT token.

**API-AUTH-003:** All subsequent requests shall automatically include the cookie.

**API-AUTH-004:** Logout endpoint shall clear the authentication cookie.

**API-AUTH-005:** Protected endpoints shall validate JWT before processing requests.

#### 4.2.3 CORS Configuration

**API-CORS-001:** The system shall restrict CORS to configured frontend origins.

**API-CORS-002:** CORS shall support credentials (`Access-Control-Allow-Credentials: true`).

**API-CORS-003:** Preflight requests shall be handled appropriately.

### 4.3 Database Interface

**DB-001:** The system shall use PostgreSQL as the primary database.

**DB-002:** Database interactions shall be managed through Prisma ORM.

**DB-003:** The system shall use connection pooling for database efficiency.

**DB-004:** Database migrations shall be version-controlled via Prisma migrations.

**DB-005:** All sensitive data (passwords) shall be hashed before storage.

### 4.4 External Service Interfaces

#### 4.4.1 Email Service

**EXT-EMAIL-001:** The system shall integrate with Resend for email notifications.

**EXT-EMAIL-002:** Email service shall be used for password resets and critical notifications.

**EXT-EMAIL-003:** Failed email deliveries shall be logged for troubleshooting.

#### 4.4.2 PDF Generation

**EXT-PDF-001:** The system shall generate PDF receipts using PDFKit library.

**EXT-PDF-002:** PDFs shall include institution branding and formatting.

**EXT-PDF-003:** Generated PDFs shall be stored or streamed to users as configured.

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

**NFR-PERF-001:** The system shall load dashboard pages within 2 seconds under normal load.

**NFR-PERF-002:** API endpoints shall respond within 1 second for standard operations.

**NFR-PERF-003:** The system shall support at least 100 concurrent users without performance degradation.

**NFR-PERF-004:** Database queries shall be optimized with appropriate indexes.

**NFR-PERF-005:** Large datasets (>1000 records) shall implement pagination.

### 5.2 Security Requirements

**NFR-SEC-001:** All passwords shall be hashed using bcrypt with minimum 10 salt rounds.

**NFR-SEC-002:** JWT tokens shall expire after 24 hours of inactivity.

**NFR-SEC-003:** The system shall enforce HTTPS in production environments.

**NFR-SEC-004:** Authentication cookies shall have `HttpOnly` and `Secure` flags in production.

**NFR-SEC-005:** The system shall implement CSRF protection via SameSite cookie attribute.

**NFR-SEC-006:** SQL injection shall be prevented via parameterized queries (Prisma ORM).

**NFR-SEC-007:** The system shall sanitize all user inputs to prevent XSS attacks.

**NFR-SEC-008:** Role-based access control shall be enforced on all protected endpoints.

**NFR-SEC-009:** Sensitive operations shall require authentication and authorization.

**NFR-SEC-010:** The system shall log all security-relevant events (logins, permission changes).

### 5.3 Reliability & Availability

**NFR-REL-001:** The system shall have 99% uptime during business hours (8 AM - 5 PM).

**NFR-REL-002:** The system shall implement graceful error handling without crashes.

**NFR-REL-003:** Database transactions shall ensure data consistency.

**NFR-REL-004:** Failed operations shall not leave the system in inconsistent state.

**NFR-REL-005:** The system shall implement automatic database backups daily.

### 5.4 Maintainability

**NFR-MAINT-001:** Code shall follow consistent style guidelines and formatting standards.

**NFR-MAINT-002:** The system shall maintain comprehensive API documentation.

**NFR-MAINT-003:** Database schema shall be documented and version-controlled.

**NFR-MAINT-004:** The system shall log errors with sufficient detail for debugging.

**NFR-MAINT-005:** Code shall be modular with clear separation of concerns.

### 5.5 Scalability

**NFR-SCALE-001:** The system architecture shall support horizontal scaling.

**NFR-SCALE-002:** Database design shall accommodate growing data volumes.

**NFR-SCALE-003:** The system shall support multiple academic years without performance impact.

**NFR-SCALE-004:** File uploads shall be handled efficiently for large files.

### 5.6 Usability

**NFR-USE-001:** The system shall be intuitive requiring minimal training.

**NFR-USE-002:** Common tasks shall be completable within 3 clicks from dashboard.

**NFR-USE-003:** The system shall provide contextual help and tooltips.

**NFR-USE-004:** Error messages shall guide users toward resolution.

**NFR-USE-005:** The system shall support keyboard navigation for accessibility.

### 5.7 Compatibility

**NFR-COMP-001:** The system shall support modern browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+.

**NFR-COMP-002:** The system shall be responsive across screen sizes (320px to 2560px width).

**NFR-COMP-003:** The system shall maintain consistent functionality across supported browsers.

---

## 6. System Models

### 6.1 Data Model

#### 6.1.1 Core Entities

**User**
- Primary authentication entity
- Attributes: id, name, email, password (hashed), role, isActive
- Relationships: One-to-One with Student/Teacher/Parent profiles

**Student**
- Attributes: id, userId, studentId, grade, personalDetails (JSON), familyBackground (JSON), enrollmentDate
- Relationships: Many-to-Many with Parents, Classes, Teachers

**Teacher**
- Attributes: id, userId, teacherId, subject, qualification, department, status, hireDate
- Relationships: Many-to-Many with Classes, Subjects

**Parent**
- Attributes: id, userId, parentId, fullName, email, phone, relationship, address
- Relationships: Many-to-Many with Students

**AcademicYear**
- Attributes: id, year, isActive, registrationOpen, registrationStart, registrationEnd
- Relationships: One-to-Many with Enrollments, Attendance, Grades, Fees

**Class**
- Attributes: id, name, grade, description
- Relationships: One-to-Many with Sections, Many-to-Many with Students and Teachers

**Section**
- Attributes: id, name, classId
- Relationships: Many-to-One with Class, One-to-Many with Enrollments

**Subject**
- Attributes: id, name, department
- Relationships: Many-to-Many with Teachers, One-to-Many with Grades

**Enrollment**
- Attributes: id, studentId, academicYearId, grade, sectionId, status
- Links students to academic years and sections

**Attendance**
- Attributes: id, classId, academicYearId, date, recordedBy, locked
- Relationships: One-to-Many with AttendanceRecords

**AttendanceRecord**
- Attributes: id, attendanceId, studentId, status, remarks
- Individual student attendance entries

**Grade**
- Attributes: id, studentId, subjectId, academicYearId, assessmentType, score, maxScore, weight, gradedBy
- Individual grade entries

**Fee**
- Attributes: id, studentId, academicYearId, amount, dueDate, status
- Student fee invoices

**Payment**
- Attributes: id, feeId, amount, method, transactionRef, verifiedBy, verificationStatus
- Payment records and verification

**Receipt**
- Attributes: id, paymentId, receiptNumber, issuedBy, pdfPath
- Payment receipt records

**ReportCard**
- Attributes: id, studentId, academicYearId, overallGrade, attendance, comments, published, promotionStatus
- Compiled academic performance reports

**Notification**
- Attributes: id, userId, message, type, read
- User notifications

**AuditLog**
- Attributes: id, userId, action, entity, entityId, details, ipAddress, timestamp
- System audit trail

### 6.2 Use Case Diagrams

#### 6.2.1 Student Registration Use Case

**Actors:** Public User (Student/Guardian), System

**Preconditions:**
- Active academic year exists
- Registration is open
- Grade fee is configured

**Main Flow:**
1. User accesses registration page
2. User fills personal details, family background, guardian information
3. System validates inputs
4. System checks academic year and grade fee availability
5. System creates Student record
6. System creates Parent records for guardians
7. System creates User accounts with auto-generated credentials
8. System creates initial enrollment record
9. System returns credentials to user
10. System sends notification

**Postconditions:**
- Student and Parent records created
- User accounts created with login credentials
- Student enrolled in specified grade

#### 6.2.2 Attendance Recording Use Case

**Actors:** Teacher, System

**Preconditions:**
- Teacher is logged in
- Teacher has class assignments
- Academic year is active

**Main Flow:**
1. Teacher selects class and date
2. System displays student list
3. Teacher marks attendance status for each student
4. Teacher submits attendance
5. System validates and saves records
6. System locks attendance record
7. System sends notifications to parents of absent students

**Alternate Flow (Unlock Request):**
1. Teacher requests attendance unlock
2. Teacher provides justification reason
3. System creates unlock request
4. Admin reviews and approves/rejects
5. If approved, attendance is temporarily unlocked for editing

#### 6.2.3 Fee Payment Use Case

**Actors:** Student, Cashier, System

**Preconditions:**
- Student has generated invoice
- Student is logged in

**Main Flow:**
1. Student views fee invoice
2. Student initiates payment
3. Student selects payment method (Cash/Bank/Mobile)
4. If Cash: Payment is auto-verified
5. If Bank/Mobile: Student provides transaction reference
6. System creates payment record with "Pending" status
7. Cashier reviews pending payments
8. Cashier verifies payment details
9. Cashier approves or rejects payment
10. If approved, system generates PDF receipt
11. System updates fee status to "Paid"
12. System sends notification to student

### 6.3 Sequence Diagrams

#### 6.3.1 Authentication Sequence

```
User → Frontend: Enter credentials
Frontend → Backend API: POST /api/auth/login
Backend API → Database: Validate credentials
Database → Backend API: User data
Backend API → Backend API: Generate JWT
Backend API → Frontend: Set httpOnly cookie + user data
Frontend → Frontend: Store user context
Frontend → User: Redirect to dashboard
```

#### 6.3.2 Grade Entry Sequence

```
Teacher → Frontend: Enter grade data
Frontend → Backend API: POST /api/grades
Backend API → Auth Middleware: Validate JWT
Auth Middleware → Backend API: User authenticated
Backend API → Permission Check: Verify teacher assignment
Permission Check → Backend API: Authorization granted
Backend API → Database: Save grade record
Database → Backend API: Grade saved
Backend API → Audit Logger: Log grade entry
Backend API → Notification Service: Notify student
Backend API → Frontend: Success response
Frontend → Teacher: Display confirmation
```

### 6.4 State Diagrams

#### 6.4.1 Student Status State Machine

```
[New Registration] → Enrolled
Enrolled → Promoted (end of year, passed)
Enrolled → Repeated (end of year, failed)
Enrolled → Transferred (leaves institution)
Promoted → Enrolled (in next grade)
Repeated → Enrolled (same grade, new year)
Enrolled → Graduated (completed final grade)
```

#### 6.4.2 Payment Verification State Machine

```
[Payment Initiated] → Pending (Bank/Mobile)
[Payment Initiated] → Verified (Cash)
Pending → Verified (Cashier approval)
Pending → Rejected (Cashier rejection)
Verified → Receipt Generated
```

#### 6.4.3 Report Card State Machine

```
[Grades Entered] → Compiled
Compiled → Published (Admin action)
Published → [Visible to Students/Parents]
Compiled → Modified (Admin/Teacher edits)
Modified → Compiled
```

---

## 7. Appendices

### 7.1 Glossary

**Academic Year:** A period representing one school year (e.g., 2026/2027).

**Enrollment:** The act of registering a student for a specific academic year and grade.

**Guardian:** A parent or legal guardian responsible for a student.

**httpOnly Cookie:** A secure cookie that cannot be accessed via JavaScript, used for JWT storage.

**JWT (JSON Web Token):** A compact token format used for authentication.

**Permission:** A granular access right (e.g., "student_registration", "manage_academic_year").

**Promotion:** Advancing a student to the next grade level.

**RBAC (Role-Based Access Control):** Security model where permissions are assigned to roles.

**Receipt:** A document confirming payment of fees.

**Repetition:** When a student repeats the same grade in a new academic year.

**Section:** A subdivision of a class (e.g., Class 3-A, Class 3-B).

### 7.2 Technology Stack Summary

**Backend:**
- Runtime: Node.js v18+
- Framework: Express.js
- ORM: Prisma
- Database: PostgreSQL
- Authentication: JWT with bcrypt
- File Processing: Multer
- PDF Generation: PDFKit
- Email: Resend

**Frontend:**
- Framework: React 19
- Language: TypeScript
- Styling: Tailwind CSS v4
- Routing: React Router DOM v7
- HTTP Client: Axios
- Notifications: React Toastify
- Build Tool: Vite v8

**Development Tools:**
- Version Control: Git
- API Testing: Postman
- Package Manager: npm/yarn

### 7.3 System Constraints

**Business Rules:**
1. Only one academic year can be active at a time
2. Student registration requires open registration period and configured grade fee
3. Teachers can only access students in their assigned classes
4. Attendance can only be modified after unlock approval
5. Report cards remain hidden until explicitly published
6. Cash payments are auto-verified; Bank/Mobile require Cashier verification
7. SuperAdmin role has unrestricted access to all system functions

**Technical Constraints:**
1. PostgreSQL database required (not compatible with MySQL/MongoDB)
2. Requires Node.js v18 or higher
3. Modern browser required (no IE support)
4. JWT token expiration: 24 hours
5. File upload size limit: Configurable via Multer
6. API rate limiting: To be implemented based on deployment environment

### 7.4 Future Enhancements

**Phase 2 Potential Features:**
1. SMS notifications for attendance and grades
2. Online exam and quiz module
3. Library management system
4. Hostel/dormitory management
5. Transport management
6. Staff payroll system
7. Alumni management
8. Parent-teacher messaging system
9. Mobile application (iOS/Android)
10. Advanced analytics and reporting dashboards
11. Integration with third-party payment gateways
12. Biometric attendance integration
13. Video conferencing integration
14. Assignment submission portal
15. Gradebook import/export (Excel, CSV)

### 7.5 Approval Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Manager | ____________ | ____________ | ______ |
| Technical Lead | ____________ | ____________ | ______ |
| Client Representative | ____________ | ____________ | ______ |
| QA Lead | ____________ | ____________ | ______ |

---

**Document Control**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-06-29 | Development Team | Initial SRS document |

---

**END OF DOCUMENT**
