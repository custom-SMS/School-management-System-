import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import RegisterStudent from "./pages/RegisterStudentEnhanced";
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
          <Route path="/register-student" element={<RegisterStudent />} />
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
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
