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
import ParentDashboard from "./pages/parent/ParentDashboard";
import ParentAcademics from "./pages/parent/ParentAcademics";
import ParentAttendance from "./pages/parent/ParentAttendance";
import ParentFinance from "./pages/parent/ParentFinance";
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
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]} requiredPermission="student_registration">
                <RegisterStudent />
              </ProtectedRoute>
            } 
          />
          <Route path="/parent-portal" element={<Navigate to="/parent/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={["Admin", "Teacher", "Student", "Parent", "SuperAdmin", "Cashier"]}
              >
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assignments"
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <Assignments />
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
          <Route
            path="/students"
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <Students />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teachers"
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <Teachers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bursar"
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin", "Cashier"]}>
                <Bursar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classroom/grades"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Teacher", "SuperAdmin"]}>
                <GradeSpreadsheet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classroom/attendance"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Teacher", "SuperAdmin"]}>
                <AttendanceChecklist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-card"
            element={
              <ProtectedRoute
                allowedRoles={["Admin", "Teacher", "Student", "Parent", "SuperAdmin"]}
              >
                <ReportCard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timetable"
            element={
              <ProtectedRoute
                allowedRoles={["Admin", "Teacher", "Student", "Parent", "SuperAdmin"]}
              >
                <Timetables />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academics"
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <Academics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-cards-admin"
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <ReportCards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                <Settings />
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
              <ProtectedRoute allowedRoles={["Cashier", "Admin", "SuperAdmin"]}>
                <FinanceDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/payments"
            element={
              <ProtectedRoute allowedRoles={["Cashier", "Admin", "SuperAdmin"]}>
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
              <ProtectedRoute allowedRoles={["Cashier", "Admin", "SuperAdmin"]}>
                <FinanceAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/fees"
            element={
              <ProtectedRoute allowedRoles={["Cashier", "Admin", "SuperAdmin"]}>
                <FinanceFees />
              </ProtectedRoute>
            }
          />

          {/* Ethio-Edu ERP — Teacher Portal */}
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute allowedRoles={["Teacher", "Admin", "SuperAdmin"]}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/classes"
            element={
              <ProtectedRoute allowedRoles={["Teacher", "Admin", "SuperAdmin"]}>
                <TeacherClasses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/students"
            element={
              <ProtectedRoute allowedRoles={["Teacher", "Admin", "SuperAdmin"]}>
                <TeacherStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/students/:studentId/attendance"
            element={
              <ProtectedRoute allowedRoles={["Teacher", "Admin", "SuperAdmin"]}>
                <StudentAttendanceDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/students/:studentId"
            element={
              <ProtectedRoute allowedRoles={["Teacher", "Admin", "SuperAdmin"]}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/attendance"
            element={
              <ProtectedRoute allowedRoles={["Teacher", "Admin", "SuperAdmin"]}>
                <TeacherAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/grades"
            element={
              <ProtectedRoute allowedRoles={["Teacher", "Admin", "SuperAdmin"]}>
                <TeacherGradebook />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/timetable"
            element={
              <ProtectedRoute allowedRoles={["Teacher", "Admin", "SuperAdmin"]}>
                <TeacherTimetable />
              </ProtectedRoute>
            }
          />

          {/* SchoolERP — Student Portal */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={["Student", "Parent", "SuperAdmin"]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/attendance"
            element={
              <ProtectedRoute allowedRoles={["Student", "Parent", "SuperAdmin"]}>
                <StudentAttendancePortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/academics"
            element={
              <ProtectedRoute allowedRoles={["Student", "Parent", "SuperAdmin"]}>
                <StudentAcademics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/finance"
            element={
              <ProtectedRoute allowedRoles={["Student", "Parent", "SuperAdmin"]}>
                <StudentFinance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/reports"
            element={
              <ProtectedRoute allowedRoles={["Student", "Parent", "SuperAdmin"]}>
                <StudentReports />
              </ProtectedRoute>
            }
          />

          {/* Ethio Academy — Parent Portal */}
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
            path="/parent/finance"
            element={
              <ProtectedRoute allowedRoles={["Parent", "SuperAdmin"]}>
                <ParentFinance />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
