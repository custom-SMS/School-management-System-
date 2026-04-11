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
                allowedRoles={["Admin", "Teacher", "Student", "Parent"]}
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
              <ProtectedRoute allowedRoles={["Admin"]}>
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
                allowedRoles={["Admin", "Teacher", "Student", "Parent"]}
              >
                <ReportCard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
