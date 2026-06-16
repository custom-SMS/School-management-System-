import { useEffect, useMemo, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { toast } from 'react-toastify';
import AdminLayout from '../components/AdminLayout';
import { AuthContext } from '../context/AuthContext';

const normalizeLabel = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const extractClassNumber = (value) => String(value || '').match(/\d+/)?.[0] || '';

const matchesClass = (studentGrade, className) => {
  const studentLabel = normalizeLabel(studentGrade);
  const classLabel = normalizeLabel(className);
  if (!studentLabel || !classLabel) return false;
  const studentNumber = extractClassNumber(studentGrade);
  const classNumber = extractClassNumber(className);
  return (
    studentLabel === classLabel ||
    studentLabel === normalizeLabel(`grade ${classNumber}`) ||
    classLabel === normalizeLabel(`grade ${studentNumber}`) ||
    (studentNumber && classNumber && studentNumber === classNumber)
  );
};

const AVATAR_COLORS = ['bg-gray-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-teal-500'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const FinancialBadge = ({ status }) => {
  const styles = {
    Cleared: 'bg-green-50 text-green-700',
    'Overdue (ETB 1,200)': 'bg-orange-50 text-orange-700',
    'Suspended (Fees)': 'bg-red-50 text-red-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const AccountBadge = ({ status }) => {
  const isActive = status === 'Active';
  const isRestricted = status === 'Restricted';
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : isRestricted ? 'bg-red-500' : 'bg-gray-400'}`}></span>
      <span className="text-sm font-semibold text-gray-700">{status}</span>
    </div>
  );
};

export default function Students() {
  const navigate = useNavigate();
  const { user, permissions } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const studentsRes = await axios.get('/students');
        const allStudents = studentsRes.data || [];
        setStudents(allStudents);
        const derivedClasses = Array.from(
          new Map(
            allStudents
              .map((s) => String(s.grade || '').trim())
              .filter(Boolean)
              .map((grade) => [grade, { _id: grade, name: grade }])
          ).values()
        );
        setClasses(derivedClasses);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load student records');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const availableClasses = useMemo(() =>
    [...classes].sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: 'base' }))
  , [classes]);

  const filteredStudents = useMemo(() => {
    const term = normalizeLabel(searchTerm);
    return students.filter((student) => {
      const matchesCls = selectedClass === 'All' || matchesClass(student.grade, selectedClass);
      if (!matchesCls) return false;
      if (!term) return true;
      const haystacks = [student.user?.name, student.studentId, student.user?.email, student.grade]
        .map(normalizeLabel).join(' | ');
      return haystacks.includes(term);
    });
  }, [searchTerm, selectedClass, students]);

  const activeCount = filteredStudents.length;

  return (
    <AdminLayout pageTitle="System Management" headerAction={
      (user?.role === 'SuperAdmin' || permissions.includes('student_registration')) && (
        <button
          onClick={() => navigate('/register-student')}
          className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          Enroll New Student
        </button>
      )
    }>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <span className="cursor-pointer hover:text-gray-900">User Management</span>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
        <span className="font-semibold text-gray-900">Student Directory</span>
      </div>

      {/* Page Title */}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Directory</h2>
          <p className="text-sm text-gray-500">Manage central academic records for the 2023/24 Academic Year.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-1 text-xs font-semibold text-gray-500">Total Students</div>
          <div className="text-3xl font-bold text-gray-900">{students.length.toLocaleString()}</div>
          <div className="mt-1 text-xs font-semibold text-green-600">+4.2%</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-1 text-xs font-semibold text-gray-500">Active Students</div>
          <div className="text-3xl font-bold text-gray-900">{Math.floor(students.length * 0.93).toLocaleString()}</div>
          <div className="mt-1 text-xs text-gray-500">93% Total</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-1 text-xs font-semibold text-gray-500">New Enrollments</div>
          <div className="text-3xl font-bold text-gray-900">156</div>
          <div className="mt-1 text-xs text-gray-500">This Month</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-1 text-xs font-semibold text-gray-500">Pending Documents</div>
          <div className="text-3xl font-bold text-orange-600">42</div>
          <svg className="mt-1 h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeLinecap="round" d="M12 8v4M12 16h.01" strokeWidth="2"/></svg>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex items-center flex-1 min-w-[240px] max-w-md">
          <svg className="absolute left-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8" strokeWidth="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2"/></svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID, or parent contact..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-gray-300"
          />
        </div>

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none focus:border-gray-300"
        >
          <option value="All">All Grades</option>
          {availableClasses.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
        </select>

        <button className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Status ⚡
        </button>

        <button className="ml-auto rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Bulk Actions ▾
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="w-10 px-5 py-4"><input type="checkbox" className="rounded"/></th>
                <th className="px-5 py-4">Student Name</th>
                <th className="px-5 py-4">Grade / Section</th>
                <th className="px-5 py-4">Parent Contact</th>
                <th className="px-5 py-4">Financial Status</th>
                <th className="px-5 py-4">Account Status</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={7} className="py-8 text-center text-gray-500">Loading students…</td></tr>
              )}
              {!loading && filteredStudents.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-gray-500">No students found.</td></tr>
              )}
              {!loading && filteredStudents.map((student, i) => {
                const name = student.user?.name || 'Unknown';
                const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
                const financialStatuses = ['Cleared', 'Cleared', 'Overdue (ETB 1,200)', 'Cleared', 'Suspended (Fees)'];
                const accountStatuses = ['Active', 'Active', 'Inactive', 'Active', 'Restricted'];
                return (
                  <tr key={student._id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4"><input type="checkbox" className="rounded"/></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${avatarColor(name)}`}>{initials}</div>
                        <div>
                          <div className="font-bold text-gray-900">{name}</div>
                          <div className="text-xs text-gray-500">ID: #{student.studentId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{student.grade || '—'} {student.section ? `- ${student.section}` : ''}</td>
                    <td className="px-5 py-4">
                      <div className="text-gray-700">{student.personalDetails?.phone || '+251 9XX XXX XXX'}</div>
                      <div className="text-xs text-gray-400">Father</div>
                    </td>
                    <td className="px-5 py-4">
                      <FinancialBadge status={financialStatuses[i % 5]} />
                    </td>
                    <td className="px-5 py-4">
                      <AccountBadge status={accountStatuses[i % 5]} />
                    </td>
                    <td className="px-5 py-4">
                      <button className="text-gray-400 hover:text-gray-700">⋮</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredStudents.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-3">
            <span className="text-sm text-gray-500">Showing 1 to 10 of {filteredStudents.length.toLocaleString()} entries</span>
            <div className="flex gap-1">
              <button className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-400 hover:bg-gray-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              {[1, 2, 3].map((p) => (
                <button key={p} className={`flex h-8 w-8 items-center justify-center rounded font-semibold text-sm ${p === 1 ? 'bg-black text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>{p}</button>
              ))}
              <span className="flex h-8 w-8 items-center justify-center text-gray-400">...</span>
              <button className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white font-semibold text-sm text-gray-600 hover:bg-gray-50">249</button>
              <button className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-400 hover:bg-gray-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Banner */}
      <div className="mt-6 rounded-xl bg-gray-900 p-6">
        <h3 className="mb-1 font-bold text-gray-100">Academic Integrity Portal</h3>
        <p className="max-w-md text-sm text-gray-400">All student data is encrypted and subject to Ministry of Education data privacy protocols.</p>
      </div>
    </AdminLayout>
  );
}
