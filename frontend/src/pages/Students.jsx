import { useEffect, useMemo, useState, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { toast } from 'react-toastify';
import AdminLayout from '../components/AdminLayout';
import { AuthContext } from '../context/AuthContext';

const PAGE_SIZE = 10;

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

const AVATAR_COLORS = ['bg-gray-500', 'bg-blue-500', 'bg-teal-500', 'bg-green-500', 'bg-orange-500', 'bg-teal-500'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const ACTIVE_ENROLLMENT_STATUSES = new Set(['Enrolled', 'Promoted', 'Repeated']);

const formatCurrency = (amount) =>
  `ETB ${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

// Derive a financial summary from a student's real fee records.
const getFinancialStatus = (student) => {
  const fees = Array.isArray(student.fees) ? student.fees : [];
  if (!fees.length) return { label: 'No Fees', tone: 'neutral', outstanding: 0, overdue: false };

  const unpaid = fees.filter((f) => !f.paid);
  if (!unpaid.length) return { label: 'Cleared', tone: 'cleared', outstanding: 0, overdue: false };

  const outstanding = unpaid.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const now = Date.now();
  const overdue = unpaid.some((f) => f.dueDate && new Date(f.dueDate).getTime() < now);

  return {
    label: `${overdue ? 'Overdue' : 'Pending'} (${formatCurrency(outstanding)})`,
    tone: overdue ? 'overdue' : 'pending',
    outstanding,
    overdue,
  };
};

// Derive account status from latest enrollment + fee state.
const getAccountStatus = (student, financial) => {
  if (financial.overdue) return 'Restricted';
  const latest = Array.isArray(student.enrollments) ? student.enrollments[0] : null;
  if (latest && !ACTIVE_ENROLLMENT_STATUSES.has(latest.status)) return 'Inactive';
  return 'Active';
};

const getPrimaryGuardian = (student) => {
  const contacts = Array.isArray(student.guardianContacts) ? student.guardianContacts : [];
  const primary = contacts.find((c) => c.primary) || contacts[0];
  if (primary) return primary;
  const guardian = Array.isArray(student.guardians) ? student.guardians[0] : null;
  return guardian || null;
};

const FINANCIAL_STYLES = {
  cleared: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-700',
  pending: 'bg-orange-50 text-orange-700',
  neutral: 'bg-gray-100 text-gray-600',
};

const FinancialBadge = ({ status }) => (
  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${FINANCIAL_STYLES[status.tone]}`}>
    {status.label}
  </span>
);

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
  const canManage = user?.role === 'SuperAdmin' || permissions.includes('student_registration');

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [menuOpenId, setMenuOpenId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const studentsRes = await axios.get('/students');
      const payload = studentsRes.data;
      const allStudents = Array.isArray(payload) ? payload : (payload?.students || []);
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableClasses = useMemo(() =>
    [...classes].sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: 'base' }))
  , [classes]);

  // Pre-compute derived status once per student so cards, filters and rows agree.
 const enrichedStudents = useMemo(() => {
  if (!Array.isArray(students)) {
    return [];
  }

  return students.map((student) => {
    const financial = getFinancialStatus(student);
    const account = getAccountStatus(student, financial);

    return {
      ...student,
      _financial: financial,
      _account: account,
    };
  });
}, [students]);

  const filteredStudents = useMemo(() => {
    const term = normalizeLabel(searchTerm);
    return enrichedStudents.filter((student) => {
      const matchesCls = selectedClass === 'All' || matchesClass(student.grade, selectedClass);
      if (!matchesCls) return false;
      if (statusFilter !== 'All' && student._account !== statusFilter) return false;
      if (!term) return true;
      const guardian = getPrimaryGuardian(student);
      const haystacks = [student.user?.name, student.studentId, student.user?.email, student.grade, guardian?.phone, guardian?.fullName]
        .map(normalizeLabel).join(' | ');
      return haystacks.includes(term);
    });
  }, [searchTerm, selectedClass, statusFilter, enrichedStudents]);

  // Reset to first page whenever the result set changes shape.
  useEffect(() => { setPage(1); }, [searchTerm, selectedClass, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedStudents = useMemo(
    () => filteredStudents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredStudents, currentPage]
  );

  const summary = useMemo(() => {
    const total = enrichedStudents.length;
    const active = enrichedStudents.filter((s) => s._account === 'Active').length;
    const now = new Date();
    const newThisMonth = enrichedStudents.filter((s) => {
      if (!s.enrollmentDate) return false;
      const d = new Date(s.enrollmentDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const outstanding = enrichedStudents.filter((s) => s._financial.outstanding > 0).length;
    return { total, active, newThisMonth, outstanding };
  }, [enrichedStudents]);

  const pageIds = pagedStudents.map((s) => s._id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDelete = async (student) => {
    setMenuOpenId(null);
    if (!window.confirm(`Delete ${student.user?.name || student.studentId}? This will remove the student and related records.`)) return;
    try {
      await axios.delete(`/students/${student._id}`);
      toast.success('Student deleted successfully.');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(student._id);
        return next;
      });
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete student.');
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} selected student(s)? This will remove them and related records.`)) return;
    try {
      const results = await Promise.allSettled(ids.map((id) => axios.delete(`/students/${id}`)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed) {
        toast.warn(`${ids.length - failed} deleted, ${failed} failed.`);
      } else {
        toast.success(`${ids.length} student(s) deleted.`);
      }
      setSelectedIds(new Set());
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk delete failed.');
    }
  };

  const startIndex = filteredStudents.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * PAGE_SIZE, filteredStudents.length);

  return (
    <AdminLayout pageTitle="System Management" headerAction={
      canManage && (
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
          <p className="text-sm text-gray-500">Manage central academic records.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-1 text-xs font-semibold text-gray-500">Total Students</div>
          <div className="text-3xl font-bold text-gray-900">{summary.total.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-1 text-xs font-semibold text-gray-500">Active Students</div>
          <div className="text-3xl font-bold text-gray-900">{summary.active.toLocaleString()}</div>
          <div className="mt-1 text-xs text-gray-500">{summary.total ? Math.round((summary.active / summary.total) * 100) : 0}% Total</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-1 text-xs font-semibold text-gray-500">New Enrollments</div>
          <div className="text-3xl font-bold text-gray-900">{summary.newThisMonth.toLocaleString()}</div>
          <div className="mt-1 text-xs text-gray-500">This Month</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-1 text-xs font-semibold text-gray-500">Outstanding Fees</div>
          <div className="text-3xl font-bold text-orange-600">{summary.outstanding.toLocaleString()}</div>
          <div className="mt-1 text-xs text-gray-500">Students with balances</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex items-center flex-1 min-w-60 max-w-md">
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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none focus:border-gray-300"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Restricted">Restricted</option>
          <option value="Inactive">Inactive</option>
        </select>

        {canManage && (
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            className="ml-auto rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete Selected{selectedIds.size ? ` (${selectedIds.size})` : ''}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="w-10 px-5 py-4">
                  <input type="checkbox" className="rounded" checked={allPageSelected} onChange={toggleSelectAllOnPage} />
                </th>
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
              {!loading && pagedStudents.map((student) => {
                const name = student.user?.name || 'Unknown';
                const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
                const guardian = getPrimaryGuardian(student);
                return (
                  <tr key={student._id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <input type="checkbox" className="rounded" checked={selectedIds.has(student._id)} onChange={() => toggleSelect(student._id)} />
                    </td>
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
                      <div className="text-gray-700">{guardian?.phone || '—'}</div>
                      <div className="text-xs text-gray-400">{guardian?.relationship || (guardian ? 'Guardian' : 'No contact')}</div>
                    </td>
                    <td className="px-5 py-4">
                      <FinancialBadge status={student._financial} />
                    </td>
                    <td className="px-5 py-4">
                      <AccountBadge status={student._account} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === student._id ? null : student._id)}
                          className="text-gray-400 hover:text-gray-700"
                        >⋮</button>
                        {menuOpenId === student._id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                            <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                              <button
                                onClick={() => { setMenuOpenId(null); navigate(`/teacher/students/${student._id}`); }}
                                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                              >View profile</button>
                              {canManage && (
                                <button
                                  onClick={() => { setMenuOpenId(null); navigate(`/students/${student._id}/edit`); }}
                                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >Edit</button>
                              )}
                              {canManage && (
                                <button
                                  onClick={() => handleDelete(student)}
                                  className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                >Delete</button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
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
            <span className="text-sm text-gray-500">
              Showing {startIndex} to {endIndex} of {filteredStudents.length.toLocaleString()} entries
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p) => {
                  if (acc.length && p - acc[acc.length - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) => (
                  typeof p === 'number' ? (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`flex h-8 w-8 items-center justify-center rounded font-semibold text-sm ${p === currentPage ? 'bg-black text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                    >{p}</button>
                  ) : (
                    <span key={`gap-${idx}`} className="flex h-8 w-8 items-center justify-center text-gray-400">...</span>
                  )
                ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-40"
              >
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

