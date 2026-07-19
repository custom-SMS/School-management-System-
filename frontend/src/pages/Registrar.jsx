import { useState, useEffect, useContext } from 'react';
import { showDangerConfirmDialog } from '../utils/sweetAlert';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';

export default function Registrar() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('students'); // 'students', 'academic-years', 'promotion', 'permissions', 'audit-logs'

  // Original Registrar States
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [feeGrade, setFeeGrade] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [gradeFees, setGradeFees] = useState([]);
  const [filterGrade, setFilterGrade] = useState('All');
  const [message, setMessage] = useState('');
  const [deletingStudentId, setDeletingStudentId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const feeClassOptions = Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`);

  // Academic Year States
  const [academicYears, setAcademicYears] = useState([]);
  const [newYearString, setNewYearString] = useState('');

  // Promotion States
  const [selectedPromoYear, setSelectedPromoYear] = useState('');
  const [promoTargetGrade, setPromoTargetGrade] = useState('Class 1');
  const [promotingStudentId, setPromotingStudentId] = useState('');

  // Permission States
  const [permissionsMatrix, setPermissionsMatrix] = useState([]);
  const [availablePermissions] = useState(['student_registration', 'manage_academic_year']);
  const rolesList = ['Admin', 'Cashier', 'Teacher', 'Student', 'Parent'];

  // Audit Log States
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);

  // Fetch functions
  const fetchStudents = async () => {
    try {
      const res = await axios.get('/students');
      setStudents(res.data || []);
    } catch (error) {
      console.error('Failed to fetch students', error);
    }
  };

  const fetchGradeFees = async () => {
    try {
      const res = await axios.get('/students/grade-fee');
      setGradeFees(res.data || []);
    } catch (error) {
      console.error('Failed to fetch grade fees', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const studentsRes = await axios.get('/students');
      const availableGrades = Array.from(
        new Set((studentsRes.data || []).map((student) => student.grade).filter(Boolean)),
      ).map((grade) => ({ _id: grade, name: grade, subject: '' }));
      setClasses(availableGrades);
    } catch (error) {
      console.error('Failed to fetch classes', error);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const res = await axios.get('/academic-years');
      setAcademicYears(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedPromoYear((current) => current || res.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch academic years', error);
    }
  };

  const fetchPermissionsMatrix = async () => {
    try {
      const res = await axios.get('/auth/permissions');
      setPermissionsMatrix(res.data || []);
    } catch (error) {
      console.error('Failed to fetch permissions', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get(`/audit-logs?page=${auditPage}&action=${auditSearch}`);
      setAuditLogs(res.data?.logs || []);
      setAuditTotalPages(res.data?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchGradeFees();
    fetchClasses();
    fetchAcademicYears();
    if (user?.role === 'SuperAdmin') {
      fetchPermissionsMatrix();
    }
    fetchAuditLogs();
  }, [user, auditPage, auditSearch]);

  const handleCreateAcademicYear = async (e) => {
    e.preventDefault();
    if (!newYearString) return;
    try {
      await axios.post('/academic-years', { year: newYearString });
      toast.success(`Academic Year ${newYearString} created successfully!`);
      setNewYearString('');
      fetchAcademicYears();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating academic year.');
    }
  };

  const handleSetActiveYear = async (id) => {
    try {
      await axios.patch(`/academic-years/${id}/active`);
      toast.success('Active Academic Year updated successfully.');
      fetchAcademicYears();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error setting active year.');
    }
  };

  const handleToggleRegistration = async (id, currentVal) => {
    try {
      await axios.patch(`/academic-years/${id}/registration`, { registrationOpen: !currentVal });
      toast.success('Registration period state updated.');
      fetchAcademicYears();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error toggling registration period.');
    }
  };

  const handlePromoteStudent = async (studentId) => {
    setPromotingStudentId(studentId);
    try {
      await axios.post('/students/promote', {
        studentId,
        nextGrade: promoTargetGrade,
        nextAcademicYearId: selectedPromoYear
      });
      toast.success('Student promoted successfully!');
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to promote student.');
    } finally {
      setPromotingStudentId('');
    }
  };

  const handleRepeatStudent = async (studentId) => {
    setPromotingStudentId(studentId);
    try {
      await axios.post('/students/repeat', {
        studentId,
        targetAcademicYearId: selectedPromoYear
      });
      toast.success('Student set to repeat grade successfully!');
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to repeat student.');
    } finally {
      setPromotingStudentId('');
    }
  };

  const handleStatusChange = async (studentId, newStatus) => {
    try {
      await axios.patch(`/students/${studentId}/status`, { status: newStatus });
      toast.success(`Student status updated to ${newStatus}.`);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status.');
    }
  };

  const handlePermissionToggle = async (role, permission) => {
    const hasPerm = permissionsMatrix.some(p => p.role === role && p.permission === permission);
    const updatedPermissionsList = permissionsMatrix
      .filter(p => p.role === role && p.permission !== permission)
      .map(p => p.permission);

    if (!hasPerm) {
      updatedPermissionsList.push(permission);
    }

    try {
      await axios.post('/auth/permissions', { role, permissions: updatedPermissionsList });
      toast.success(`Updated ${role} permission matrix.`);
      fetchPermissionsMatrix();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update role permissions.');
    }
  };

  const handleSetGradeFee = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/students/grade-fee', { grade: feeGrade, amount: Number(feeAmount) });
      toast.success(`Fee successfully configured for ${feeGrade}`);
      setFeeGrade(''); setFeeAmount('');
      fetchGradeFees();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error configuring grade fee.');
    }
  };

  const handleDeleteStudent = async (student) => {
    const { isConfirmed } = await showDangerConfirmDialog({
      title: 'Delete student?',
      text: `Delete ${student.user?.name || student.studentId}? This will remove the student and related records.`,
      confirmButtonText: 'Delete',
    });
    if (!isConfirmed) return;

    setDeletingStudentId(student._id);
    setMessage('');

    try {
      const res = await axios.delete(`/students/${student._id}`);
      toast.success(res.data.message || 'Student deleted successfully');
      await fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete student');
    } finally {
      setDeletingStudentId('');
    }
  };

  const sortedStudents = [...students].sort((a, b) => {
    const gradeCompare = String(a.grade || '').localeCompare(String(b.grade || ''), undefined, { numeric: true, sensitivity: 'base' });
    if (gradeCompare !== 0) return gradeCompare;
    return String(a.user?.name || '').localeCompare(String(b.user?.name || ''), undefined, { numeric: true, sensitivity: 'base' });
  });

  const uniqueGrades = ['All', ...new Set(sortedStudents.map((student) => student.grade))];
  const filteredStudents = filterGrade === 'All'
    ? sortedStudents
    : sortedStudents.filter((student) => student.grade === filterGrade);

  const selectedStudent = filteredStudents.find((student) => student._id === selectedStudentId) || null;

  const openStudentDetails = (student) => {
    setSelectedStudentId(student._id);
  };

  const activeAcademicYear = academicYears.find(year => year.isActive);

  return (
    <div className="min-h-screen bg-transparent pb-10">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-4xl border border-white/50 bg-white/75 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Registrar</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Registrar Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">Manage students, classes, registration windows, and role permissions.</p>
        </div>

        {/* Tab Selector */}
        <div className="mb-8 flex flex-wrap border-b border-slate-200">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition duration-200 ${activeTab === 'students' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-950'}`}
          >
            Students Directory & Fees
          </button>
          <button
            onClick={() => setActiveTab('academic-years')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition duration-200 ${activeTab === 'academic-years' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-950'}`}
          >
            Academic Years
          </button>
          <button
            onClick={() => setActiveTab('promotion')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition duration-200 ${activeTab === 'promotion' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-950'}`}
          >
            Promotion Board
          </button>
          {user?.role === 'SuperAdmin' && (
            <button
              onClick={() => {
                setActiveTab('permissions');
                fetchPermissionsMatrix();
              }}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition duration-200 ${activeTab === 'permissions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-950'}`}
            >
              Role Permissions Matrix
            </button>
          )}
          <button
            onClick={() => {
              setActiveTab('audit-logs');
              fetchAuditLogs();
            }}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition duration-200 ${activeTab === 'audit-logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-950'}`}
          >
            Audit Trail
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'students' && (
          <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
            <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
              <div className="mb-6 border-b border-slate-200 pb-4">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Billing rules</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Grade Fee Configuration</h2>
              </div>
              <form onSubmit={handleSetGradeFee} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Grade / Class Level</label>
                  <select
                    required
                    value={feeGrade}
                    onChange={(e) => setFeeGrade(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  >
                    <option value="">Select a class</option>
                    {feeClassOptions.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Monthly Tuition (ETB)</label>
                  <input type="number" required placeholder="e.g. 500" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"/>
                </div>
                <button type="submit" className="w-full rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5">
                  Set Grade Fee
                </button>
              </form>

              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Current Fee Settings</h3>
                <ul className="space-y-3">
                  {gradeFees.map(gf => (
                    <li key={gf._id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="font-medium text-slate-700">{gf.grade}</span>
                      <span className="font-semibold text-emerald-600">ETB {gf.amount}</span>
                    </li>
                  ))}
                  {gradeFees.length === 0 && <li className="text-sm text-slate-500">No fee rules configured.</li>}
                </ul>
              </div>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
              <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Records</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">Enrolled Students</h2>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <label className="text-sm font-semibold text-slate-600">Choose Grade:</label>
                  <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:w-auto">
                    {uniqueGrades.map((grade) => <option key={`filt-${grade}`} value={grade}>{grade}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3 sm:hidden">
                {filteredStudents.map((std) => (
                  <div key={std._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <button type="button" onClick={() => openStudentDetails(std)} className="w-full text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">ID</div>
                          <div className="mt-1 font-semibold text-blue-700">{std.studentId}</div>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">View details</span>
                      </div>
                      <div className="mt-4 grid gap-2 text-sm text-slate-700">
                        <div><span className="font-semibold text-slate-900">Name:</span> {std.user?.name}</div>
                        <div><span className="font-semibold text-slate-900">Grade:</span> {std.grade}</div>
                      </div>
                    </button>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(std)}
                        disabled={deletingStudentId === std._id}
                        className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                      >
                        {deletingStudentId === std._id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
                {filteredStudents.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-500">No students found for this grade.</div>}
              </div>

              <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 sm:block">
                <table className="min-w-190 w-full border-collapse text-left text-sm sm:text-base">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-4 py-4">ID</th>
                      <th className="px-4 py-4">Name</th>
                      <th className="px-4 py-4">Email</th>
                      <th className="px-4 py-4">Grade</th>
                      <th className="px-4 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredStudents.map(std => (
                      <tr key={std._id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-4 font-semibold text-blue-700">{std.studentId}</td>
                        <td className="px-4 py-4 text-slate-700">{std.user?.name}</td>
                        <td className="px-4 py-4 text-slate-500">{std.user?.email}</td>
                        <td className="px-4 py-4 font-medium text-slate-700">{std.grade}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openStudentDetails(std)}
                              className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                            >
                              View details
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(std)}
                              disabled={deletingStudentId === std._id}
                              className="rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                            >
                              {deletingStudentId === std._id ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-500">No students found for this grade.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selectedStudent && (
                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Student details</p>
                      <h3 className="mt-1 text-xl font-bold text-slate-900">{selectedStudent.user?.name || 'Selected student'}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentId('')}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Student ID</div>
                      <div className="mt-1 font-semibold text-slate-900">{selectedStudent.studentId}</div>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Grade</div>
                      <div className="mt-1 font-semibold text-slate-900">{selectedStudent.grade || '—'}</div>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Email</div>
                      <div className="mt-1 font-semibold text-slate-900">{selectedStudent.user?.email || '—'}</div>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Enrollment Date</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {selectedStudent.enrollmentDate ? new Date(selectedStudent.enrollmentDate).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl bg-white px-4 py-4">
                      <div className="text-sm font-bold text-slate-900">Personal details</div>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <div><span className="font-semibold text-slate-900">Gender:</span> {selectedStudent.personalDetails?.gender || '—'}</div>
                        <div><span className="font-semibold text-slate-900">Phone:</span> {selectedStudent.personalDetails?.phone || '—'}</div>
                        <div><span className="font-semibold text-slate-900">Address:</span> {selectedStudent.personalDetails?.address || '—'}</div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-4">
                      <div className="text-sm font-bold text-slate-900">Family background</div>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <div><span className="font-semibold text-slate-900">Father:</span> {selectedStudent.familyBackground?.fatherName || '—'}</div>
                        <div><span className="font-semibold text-slate-900">Mother:</span> {selectedStudent.familyBackground?.motherName || '—'}</div>
                        <div><span className="font-semibold text-slate-900">Guardian:</span> {selectedStudent.familyBackground?.guardianName || '—'}</div>
                        <div><span className="font-semibold text-slate-900">Occupation:</span> {selectedStudent.familyBackground?.occupation || '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'academic-years' && (
          <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
            <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Create Academic Year</h3>
              <form onSubmit={handleCreateAcademicYear} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Year String</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026/2027"
                    value={newYearString}
                    onChange={(e) => setNewYearString(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
                <button type="submit" className="w-full rounded-2xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition">
                  Create Year
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Academic Years Management</h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-150 w-full border-collapse text-left text-sm sm:text-base">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-4 py-4">Academic Year</th>
                      <th className="px-4 py-4">Active Status</th>
                      <th className="px-4 py-4">Registration Window</th>
                      <th className="px-4 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {academicYears.map((year) => (
                      <tr key={year.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-4 font-semibold text-slate-900">{year.year}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${year.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {year.isActive ? 'Active Year' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${year.registrationOpen ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                            {year.registrationOpen ? 'Open' : 'Closed'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleSetActiveYear(year.id)}
                              disabled={year.isActive}
                              className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                            >
                              Activate
                            </button>
                            <button
                              onClick={() => handleToggleRegistration(year.id, year.registrationOpen)}
                              className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-950"
                            >
                              Toggle Reg
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'promotion' && (
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Student Promotion Board</h3>
            <p className="text-slate-500 text-sm mb-6">Promote students to their next grade level, set repeat status, or update active enrollments.</p>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 max-w-xl">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Target Academic Year</label>
                <select value={selectedPromoYear} onChange={e => setSelectedPromoYear(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none">
                  {academicYears.map(year => <option key={year.id} value={year.id}>{year.year} {year.isActive ? '(Active)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Promotion Target Grade</label>
                <select value={promoTargetGrade} onChange={e => setPromoTargetGrade(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none">
                  {feeClassOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-190 w-full border-collapse text-left text-sm sm:text-base">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-4">Student ID</th>
                    <th className="px-4 py-4">Student Name</th>
                    <th className="px-4 py-4">Current Grade</th>
                    <th className="px-4 py-4 text-center">Promotion Board Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {students.map((student) => (
                    <tr key={student._id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold text-blue-700">{student.studentId}</td>
                      <td className="px-4 py-4 text-slate-900 font-semibold">{student.user?.name}</td>
                      <td className="px-4 py-4 text-slate-700">{student.grade}</td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            disabled={promotingStudentId === student._id}
                            onClick={() => handlePromoteStudent(student._id)}
                            className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            Promote
                          </button>
                          <button
                            disabled={promotingStudentId === student._id}
                            onClick={() => handleRepeatStudent(student._id)}
                            className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                          >
                            Repeat
                          </button>
                          <select
                            onChange={(e) => handleStatusChange(student._id, e.target.value)}
                            defaultValue=""
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold outline-none"
                          >
                            <option value="" disabled>Change Status</option>
                            <option value="Transferred">Transferred</option>
                            <option value="Graduated">Graduated</option>
                            <option value="Enrolled">Enrolled</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && user?.role === 'SuperAdmin' && (
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Dynamic Role Permissions Dashboard</h3>
            <p className="text-slate-500 text-sm mb-6">Assign or revoke dynamic system permissions for each user role instantly.</p>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-150 w-full border-collapse text-left text-sm sm:text-base">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-4">Role</th>
                    {availablePermissions.map(perm => (
                      <th key={perm} className="px-4 py-4 text-center">{perm.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rolesList.map((role) => (
                    <tr key={role} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4 font-bold text-slate-900">{role}</td>
                      {availablePermissions.map(perm => {
                        const isGranted = permissionsMatrix.some(p => p.role === role && p.permission === perm);
                        return (
                          <td key={perm} className="px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={isGranted}
                              onChange={() => handlePermissionToggle(role, perm)}
                              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'audit-logs' && (
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Audit Logs Trail</h3>
            <p className="text-slate-500 text-sm mb-6">Monitor all admin, cashier, and teacher actions in the school system.</p>

            <div className="sticky top-16 z-40 mb-6 max-w-md bg-slate-50/90 py-2 backdrop-blur-sm">
              <input
                type="text"
                placeholder="Search logs by action name (e.g. Promote)..."
                value={auditSearch}
                onChange={(e) => {
                  setAuditSearch(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-190 w-full border-collapse text-left text-sm sm:text-base">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-4">User</th>
                    <th className="px-4 py-4">Action</th>
                    <th className="px-4 py-4">Affected Record</th>
                    <th className="px-4 py-4">Details</th>
                    <th className="px-4 py-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4">
                        {log.user?.name} <span className="text-xs text-slate-400">({log.user?.role})</span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-blue-700">{log.action}</td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-500">{log.affectedRecord || '—'}</td>
                      <td className="px-4 py-4 text-xs text-slate-500">{log.details || '—'}</td>
                      <td className="px-4 py-4 text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-slate-500">No logs found matching filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {auditTotalPages > 1 && (
              <div className="mt-6 flex justify-between items-center">
                <button
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm font-semibold text-slate-500">Page {auditPage} of {auditTotalPages}</span>
                <button
                  disabled={auditPage >= auditTotalPages}
                  onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}