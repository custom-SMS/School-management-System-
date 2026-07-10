import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { BranchProvider } from "./context/BranchContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastContainer } from "react-toastify";

// General
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Super Admin
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import UserManagement from "./pages/superadmin/UserManagement";
import UserDetails from "./pages/superadmin/UserDetails";
import EmployeeManagement from "./pages/superadmin/EmployeeManagement";
import AcademicYears from "./pages/superadmin/AcademicYears";
import AttendanceGovernance from "./pages/superadmin/AttendanceGovernance";
import FinancialOversight from "./pages/superadmin/FinancialOversight";
import SuperAdminFees from "./pages/superadmin/Fees";
import SuperAdminGrades from "./pages/superadmin/SuperAdminGrades";
import BranchManagement from "./pages/superadmin/BranchManagement";
import Settings from "./pages/Settings";
import Roles from "./pages/Roles";
import Permissions from "./pages/Permissions";
import AuditLogs from "./pages/AuditLogs";
import SystemAnalytics from "./pages/superadmin/SystemAnalytics";
import SystemNotifications from "./pages/superadmin/SystemNotifications";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminGrades from "./pages/admin/AdminGrades";
import RegisterStudent from "./pages/StudentRegistrationWizard";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Academics from "./pages/Academics"; // Subjects
import Classes from "./pages/admin/Classes";
import Sections from "./pages/admin/Sections";
import SectionStudents from "./pages/admin/SectionStudents";
import AdminStudentProfile from "./pages/admin/StudentProfile";
import Assignments from "./pages/Assignments";
import Timetables from "./pages/Timetables";
import ReportCards from "./pages/ReportCards";
import AcademicReports from "./pages/admin/AcademicReports";
import ReportView from "./pages/admin/ReportView";
import Registrar from "./pages/Registrar";

// Finance (Cashier)
import FinanceDashboard from "./pages/finance/FinanceDashboard";
import FinancePayments from "./pages/finance/Payments";
import FinanceVerification from "./pages/finance/Verification";
import FinanceAnalytics from "./pages/finance/Analytics";
import FinanceFees from "./pages/finance/Fees";
import Bursar from "./pages/Bursar";

// Teacher
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherClasses from "./pages/teacher/AssignedClasses";
import TeacherStudents from "./pages/teacher/AssignedStudents";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherGradebook from "./pages/teacher/Gradebook";
import TeacherTimetable from "./pages/teacher/TeacherTimetable";
import StudentProfile from "./pages/teacher/StudentProfile";
import StudentAttendanceDetail from "./pages/teacher/StudentAttendanceDetail";
import GradeSpreadsheet from "./pages/GradeSpreadsheet";
import AttendanceChecklist from "./pages/AttendanceChecklist";
import TeacherNotifications from "./pages/teacher/TeacherNotifications";
import Homeroom from "./pages/teacher/Homeroom";
import HomeroomReportCards from "./pages/teacher/HomeroomReportCards";

// Student
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentAttendancePortal from "./pages/student/StudentAttendance";
import StudentAcademics from "./pages/student/StudentAcademics";
import SubjectResultDetails from "./pages/student/SubjectResultDetails";
import StudentFinance from "./pages/student/StudentFinance";
import StudentPayment from "./pages/student/StudentPayment";
import StudentFees from "./pages/StudentFees";

// Parent
import ParentDashboard from "./pages/parent/ParentDashboard";
import ParentAcademics from "./pages/parent/ParentAcademics";
import ParentAttendance from "./pages/parent/ParentAttendance";
import ParentFinance from "./pages/parent/ParentFinance";
import ParentPayment from "./pages/parent/ParentPayment";
import ParentNotifications from "./pages/parent/ParentNotifications";

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BranchProvider>
          <Router>
          <ToastContainer position="top-right" autoClose={3000} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/parent-portal"
              element={<Navigate to="/parent/dashboard" replace />}
            />

            {/* Fallback Dashboard for non-admin/superadmin */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute
                  allowedRoles={["Teacher", "Student", "Parent", "Cashier"]}
                >
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* ========================================================
              SUPER ADMIN ROUTES
              ======================================================== */}
            <Route
              path="/super-admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/branches"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <BranchManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/users"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/employees"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <EmployeeManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/users/:id"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <UserDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/roles"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <Roles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/permissions"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <Permissions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/academic-years"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <AcademicYears />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/attendance-governance"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <AttendanceGovernance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/financial-oversight"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <FinancialOversight />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/analytics"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <SystemAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/notifications"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <SystemNotifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/grades"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <SuperAdminGrades />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/fees"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <SuperAdminFees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/registration"
              element={
                <ProtectedRoute
                  allowedRoles={["Admin", "SuperAdmin"]}
                  requiredPermission="student_registration"
                >
                  <RegisterStudent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/audit-logs"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/settings"
              element={
                <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Legacy links that might be accessed, redirect to new paths */}
            <Route
              path="/settings"
              element={<Navigate to="/super-admin/settings" replace />}
            />
            <Route
              path="/roles"
              element={<Navigate to="/super-admin/roles" replace />}
            />
            <Route
              path="/permissions"
              element={<Navigate to="/super-admin/permissions" replace />}
            />
            <Route
              path="/audit"
              element={<Navigate to="/super-admin/audit-logs" replace />}
            />

            {/* ========================================================
              ADMIN ROUTES
              ======================================================== */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/grades"
              element={
                <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                  <AdminGrades />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students"
              element={
                <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                  <Students />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers"
              element={
                <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                  <Teachers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects"
              element={
                <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                  <Academics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/classes"
              element={
                <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                  <Classes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sections"
              element={
                <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                  <Sections />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sections/:sectionId/students"
              element={
                <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                  <SectionStudents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/assignments"
              element={
                <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                  <Assignments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/timetables"
              element={
                <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                  <Timetables />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/report-cards"
              element={
                <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                  <ReportCards />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/academic-reports"
              element={
                <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                  <AcademicReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports/:type"
              element={
                <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                  <ReportView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/registration"
              element={
                <ProtectedRoute
                  allowedRoles={["Admin", "SuperAdmin"]}
                  requiredPermission="student_registration"
                >
                  <RegisterStudent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/:id/edit"
              element={
                <ProtectedRoute
                  allowedRoles={["Admin", "SuperAdmin"]}
                  requiredPermission="student_registration"
                >
                  <RegisterStudent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students/:id"
              element={
                <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                  <AdminStudentProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/registrar"
              element={
                <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                  <Registrar />
                </ProtectedRoute>
              }
            />

            {/* ========================================================
              FINANCE (CASHIER) ROUTES
              ======================================================== */}
            <Route
              path="/finance/dashboard"
              element={
                <ProtectedRoute allowedRoles={["Cashier", "SuperAdmin"]}>
                  <FinanceDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/payments"
              element={
                <ProtectedRoute allowedRoles={["Cashier", "SuperAdmin"]}>
                  <FinancePayments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/verification"
              element={
                <ProtectedRoute allowedRoles={["Cashier", "SuperAdmin"]}>
                  <FinanceVerification />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/analytics"
              element={
                <ProtectedRoute allowedRoles={["Cashier", "SuperAdmin"]}>
                  <FinanceAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/fees"
              element={
                <ProtectedRoute allowedRoles={["Cashier", "SuperAdmin"]}>
                  <FinanceFees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bursar"
              element={
                <ProtectedRoute allowedRoles={["Cashier", "SuperAdmin"]}>
                  <Bursar />
                </ProtectedRoute>
              }
            />

            {/* ========================================================
              TEACHER ROUTES
              ======================================================== */}
            <Route
              path="/teacher/dashboard"
              element={
                <ProtectedRoute allowedRoles={["Teacher", "SuperAdmin"]}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/classes"
              element={
                <ProtectedRoute allowedRoles={["Teacher", "SuperAdmin"]}>
                  <TeacherClasses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/students"
              element={
                <ProtectedRoute allowedRoles={["Teacher", "SuperAdmin"]}>
                  <TeacherStudents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/students/:studentId"
              element={
                <ProtectedRoute allowedRoles={["Teacher", "SuperAdmin"]}>
                  <StudentProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/students/:studentId/attendance"
              element={
                <ProtectedRoute allowedRoles={["Teacher", "SuperAdmin"]}>
                  <StudentAttendanceDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/attendance"
              element={
                <ProtectedRoute allowedRoles={["Teacher", "SuperAdmin"]}>
                  <TeacherAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/homeroom"
              element={
                <ProtectedRoute allowedRoles={["Teacher", "SuperAdmin"]}>
                  <Homeroom />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/homeroom/report-cards"
              element={
                <ProtectedRoute allowedRoles={["Teacher", "SuperAdmin"]}>
                  <HomeroomReportCards />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/notifications"
              element={
                <ProtectedRoute allowedRoles={["Teacher", "SuperAdmin"]}>
                  <TeacherNotifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/grades"
              element={
                <ProtectedRoute allowedRoles={["Teacher", "SuperAdmin"]}>
                  <TeacherGradebook />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/timetable"
              element={
                <ProtectedRoute allowedRoles={["Teacher", "SuperAdmin"]}>
                  <TeacherTimetable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classroom/grades"
              element={
                <ProtectedRoute allowedRoles={["Teacher", "SuperAdmin"]}>
                  <GradeSpreadsheet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classroom/attendance"
              element={
                <ProtectedRoute allowedRoles={["Teacher", "SuperAdmin"]}>
                  <AttendanceChecklist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/registration"
              element={
                <ProtectedRoute
                  allowedRoles={["Admin", "Teacher"]}
                  requiredPermission="student_registration"
                >
                  <RegisterStudent />
                </ProtectedRoute>
              }
            />

            {/* ========================================================
              STUDENT / PARENT ROUTES
              ======================================================== */}
            <Route
              path="/my-fees"
              element={
                <ProtectedRoute allowedRoles={["Student", "Parent"]}>
                  <StudentFees />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute
                  allowedRoles={["Student", "Parent", "SuperAdmin"]}
                >
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/attendance"
              element={
                <ProtectedRoute
                  allowedRoles={["Student", "Parent", "SuperAdmin"]}
                >
                  <StudentAttendancePortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/academics"
              element={
                <ProtectedRoute
                  allowedRoles={["Student", "Parent", "SuperAdmin"]}
                >
                  <StudentAcademics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/academics/:subjectKey"
              element={
                <ProtectedRoute
                  allowedRoles={["Student", "Parent", "SuperAdmin"]}
                >
                  <SubjectResultDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/finance"
              element={
                <ProtectedRoute
                  allowedRoles={["Student", "Parent", "SuperAdmin"]}
                >
                  <StudentFinance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/finance/pay"
              element={
                <ProtectedRoute
                  allowedRoles={["Student", "Parent", "SuperAdmin"]}
                >
                  <StudentPayment />
                </ProtectedRoute>
              }
            />

            <Route
              path="/parent/dashboard"
              element={
                <ProtectedRoute allowedRoles={["Parent", "SuperAdmin"]}>
                  <ParentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parent/academics"
              element={
                <ProtectedRoute allowedRoles={["Parent", "SuperAdmin"]}>
                  <ParentAcademics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parent/attendance"
              element={
                <ProtectedRoute allowedRoles={["Parent", "SuperAdmin"]}>
                  <ParentAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parent/notifications"
              element={
                <ProtectedRoute allowedRoles={["Parent", "SuperAdmin"]}>
                  <ParentNotifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parent/finance"
              element={
                <ProtectedRoute allowedRoles={["Parent", "SuperAdmin"]}>
                  <ParentFinance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parent/finance/pay"
              element={
                <ProtectedRoute allowedRoles={["Parent", "SuperAdmin"]}>
                  <ParentPayment />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
        </BranchProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
export default App;
