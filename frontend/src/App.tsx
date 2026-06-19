import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import RegisterStudent from "./pages/StudentRegistrationWizard";
import Assignments from "./pages/Assignments";
import Dashboard from "./pages/Dashboard";
import AttendanceChecklist from "./pages/AttendanceChecklist";
import GradeSpreadsheet from "./pages/GradeSpreadsheet";
import Registrar from "./pages/Registrar";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Bursar from "./pages/Bursar";
import ReportCard from "./pages/ReportCard";
import Timetables from "./pages/Timetables";
import Academics from "./pages/Academics";
import ReportCards from "./pages/ReportCards";
import Settings from "./pages/Settings";
import SuperAdminUsers from "./pages/SuperAdminUsers";
import SuperAdminRoles from "./pages/SuperAdminRoles";
import SuperAdminAnalytics from "./pages/SuperAdminAnalytics";
import SuperAdminSettings from "./pages/SuperAdminSettings";
import StudentFees from "./pages/StudentFees";
import FinanceDashboard from "./pages/finance/FinanceDashboard";
import FinancePayments from "./pages/finance/Payments";
import FinanceVerification from "./pages/finance/Verification";
import FinanceAnalytics from "./pages/finance/Analytics";
import FinanceFees from "./pages/finance/Fees";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherClasses from "./pages/teacher/AssignedClasses";
import TeacherStudents from "./pages/teacher/AssignedStudents";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherGradebook from "./pages/teacher/Gradebook";
import TeacherTimetable from "./pages/teacher/TeacherTimetable";
import StudentProfile from "./pages/teacher/StudentProfile";
import StudentAttendanceDetail from "./pages/teacher/StudentAttendanceDetail";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentAttendancePortal from "./pages/student/StudentAttendance";
import StudentAcademics from "./pages/student/StudentAcademics";
import StudentFinance from "./pages/student/StudentFinance";
import StudentReports from "./pages/student/StudentReports";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastContainer } from "react-toastify";

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
          theme="colored"
          aria-label="Notifications"
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/register-student" 
            element={
              <ProtectedRoute allowedRoles={["Admin"]} requiredPermission="student_registration">
                <RegisterStudent />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/parent-portal"
            element={
              <ProtectedRoute allowedRoles={["Parent"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={["Admin", "SuperAdmin", "Teacher", "Student", "Parent", "Cashier"]}
              >
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assignments"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <Assignments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/registrar"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <Registrar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <Students />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teachers"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <Teachers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bursar"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Cashier"]}>
                <Bursar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classroom/grades"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Teacher"]}>
                <GradeSpreadsheet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classroom/attendance"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Teacher"]}>
                <AttendanceChecklist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-card"
            element={
              <ProtectedRoute
                allowedRoles={["Student", "Parent"]}
              >
                <ReportCard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timetable"
            element={
              <ProtectedRoute
                allowedRoles={["Student", "Parent"]}
              >
                <Timetables />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academics"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <Academics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-cards-admin"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <ReportCards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/users"
            element={
              <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                <SuperAdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/roles"
            element={
              <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                <SuperAdminRoles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/analytics"
            element={
              <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                <SuperAdminAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                <SuperAdminSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/settings"
            element={
              <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                <SuperAdminSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-fees"
            element={
              <ProtectedRoute allowedRoles={["Student", "Parent"]}>
                <StudentFees />
              </ProtectedRoute>
            }
          />

          {/* Finance Suite — Cashier Portal */}
          <Route
            path="/finance/dashboard"
            element={
              <ProtectedRoute allowedRoles={["Cashier"]}>
                <FinanceDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/payments"
            element={
              <ProtectedRoute allowedRoles={["Cashier"]}>
                <FinancePayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/verification"
            element={
              <ProtectedRoute allowedRoles={["Cashier"]}>
                <FinanceVerification />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/analytics"
            element={
              <ProtectedRoute allowedRoles={["Cashier"]}>
                <FinanceAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/fees"
            element={
              <ProtectedRoute allowedRoles={["Cashier"]}>
                <FinanceFees />
              </ProtectedRoute>
            }
          />

          {/* Ethio-Edu ERP — Teacher Portal */}
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute allowedRoles={["Teacher"]}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/classes"
            element={
              <ProtectedRoute allowedRoles={["Teacher"]}>
                <TeacherClasses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/students"
            element={
              <ProtectedRoute allowedRoles={["Teacher"]}>
                <TeacherStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/students/:studentId/attendance"
            element={
              <ProtectedRoute allowedRoles={["Teacher"]}>
                <StudentAttendanceDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/students/:studentId"
            element={
              <ProtectedRoute allowedRoles={["Teacher"]}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/attendance"
            element={
              <ProtectedRoute allowedRoles={["Teacher"]}>
                <TeacherAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/grades"
            element={
              <ProtectedRoute allowedRoles={["Teacher"]}>
                <TeacherGradebook />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/timetable"
            element={
              <ProtectedRoute allowedRoles={["Teacher"]}>
                <TeacherTimetable />
              </ProtectedRoute>
            }
          />

          {/* SchoolERP — Student Portal */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={["Student", "Parent"]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/attendance"
            element={
              <ProtectedRoute allowedRoles={["Student", "Parent"]}>
                <StudentAttendancePortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/academics"
            element={
              <ProtectedRoute allowedRoles={["Student", "Parent"]}>
                <StudentAcademics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/finance"
            element={
              <ProtectedRoute allowedRoles={["Student", "Parent"]}>
                <StudentFinance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/reports"
            element={
              <ProtectedRoute allowedRoles={["Student", "Parent"]}>
                <StudentReports />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
