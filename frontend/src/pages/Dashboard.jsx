import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import AdminLayout from '../components/AdminLayout';

const normalizeClassLabel = (value) => String(value ?? '').trim() || 'Unassigned';

// ACTIVITY_LOGS removed, we now fetch live logs from backend.

const STATUS_STYLES = {
  COMPLETED: 'bg-teal-50 text-teal-700',
  MODIFIED: 'bg-gray-200 text-gray-700',
  PENDING: 'bg-orange-50 text-orange-700',
  FAILED: 'bg-red-50 text-red-700',
};

export default function Dashboard() {
  const { user, permissions } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [parentData, setParentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        if (!user) return;

        if (['Admin', 'SuperAdmin', 'Cashier'].includes(user.role)) {
          const res = await axios.get('/stats/admin');
          if (active) setStats(res.data);
        } else if (user.role === 'Student') {
          const res = await axios.get('/stats/student/me');
          if (active) setStudentData(res.data);
        } else if (user.role === 'Parent') {
          const res = await axios.get('/stats/parent/me');
          if (active) setParentData(res.data);
        } else if (user.role === 'Teacher') {
          const res = await axios.get('/stats/teacher/me');
          if (active) setTeacherData(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, [user]);

  const isAdmin = ['Admin', 'SuperAdmin', 'Cashier'].includes(user?.role);

  if (!isAdmin) {
    const greetingName = user?.name || 'User';
    const role = user?.role || 'Member';
    const childSummary = parentData?.children?.[0] || null;
    const childAvgGrade = childSummary?.grades?.length
      ? Math.round(childSummary.grades.reduce((sum, g) => sum + Number(g.percentage || 0), 0) / childSummary.grades.length)
      : 0;
    const childBalance = childSummary?.fees?.filter((fee) => !fee.paid).reduce((sum, fee) => sum + Number(fee.amount || 0), 0) || 0;

    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-black text-gray-900">Welcome back, {greetingName}</h1>
            <p className="mt-2 text-sm text-gray-500">
              You are signed in as <strong>{role}</strong>. Your dashboard data is loaded from the backend.
            </p>

            {role === 'Teacher' && teacherData && (
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Assigned classes</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">{teacherData.assignedClassesCount ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Assigned students</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">{teacherData.assignedStudentsCount ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Average grade</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">{teacherData.averageGrade ?? 0}%</p>
                </div>
              </div>
            )}

            {role === 'Student' && studentData && (
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Current grade</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">{studentData.grade || 'N/A'}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Attendance rate</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">{studentData.attendanceRate ?? 0}%</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Pending fees</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">ETB {studentData.totalFees ?? 0}</p>
                </div>
              </div>
            )}

            {role === 'Parent' && parentData && (
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Children linked</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">{parentData.children?.length ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Child average grade</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">{childAvgGrade}%</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Open balance</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">ETB {childBalance}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const STAT_CARDS = [
    {
      label: 'Total Students',
      value: stats?.totalStudents?.toLocaleString() || '—',
      badge: '+12%',
      badgeColor: 'text-green-600',
      icon: (
        <svg viewBox="0 0 36 36" fill="none" className="h-full w-full opacity-20">
          <path d="M18 2a10 10 0 1 0 0 20A10 10 0 0 0 18 2zM4 34c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="#000" strokeWidth="2"/>
        </svg>
      )
    },
    {
      label: 'Attendance Rate',
      value: `${stats?.avgAttendance || 0}%`,
      badge: 'Optimal',
      badgeColor: 'text-green-600',
      icon: (
        <svg viewBox="0 0 36 36" fill="none" className="h-full w-full opacity-20">
          <circle cx="18" cy="18" r="14" stroke="#000" strokeWidth="2"/>
          <path d="m11 18 5 5 9-10" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      label: 'Revenue (ETB)',
      value: stats?.totalRevenue ? `${(stats.totalRevenue / 1000000).toFixed(1)}M` : '—',
      badge: 'Q4 Actual',
      badgeColor: 'text-gray-500',
      icon: (
        <svg viewBox="0 0 36 36" fill="none" className="h-full w-full opacity-20">
          <rect x="3" y="7" width="30" height="22" rx="2" stroke="#000" strokeWidth="2"/>
          <path d="M3 13h30M12 13v16M24 13v16" stroke="#000" strokeWidth="2"/>
        </svg>
      )
    },
    {
      label: 'Outstanding Balances',
      value: stats?.totalPendingRevenue ? `${Math.round(stats.totalPendingRevenue / 1000)}K` : '0',
      badge: 'Action Required',
      badgeColor: 'text-red-600',
      danger: true,
      icon: (
        <svg viewBox="0 0 36 36" fill="none" className="h-full w-full opacity-20">
          <path d="M18 3L33 30H3L18 3z" stroke="#000" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M18 14v7M18 25h.01" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
  ];

  return (
    <AdminLayout pageTitle="System Management" headerAction={
      <div className="flex gap-3">
        {(user?.role === 'SuperAdmin' || permissions.includes('student_registration')) && (
          <button
            onClick={() => navigate('/register-student')}
            className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            Add Student
          </button>
        )}
        <button
          onClick={() => navigate('/teachers')}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          Assign Teacher
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          Print Reports
        </button>
      </div>
    }>
      {/* Page Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Principal's Dashboard</h2>
        <p className="text-sm text-gray-500">St. George Academy – Academic Session 2023/24</p>
      </div>

      {loading && <div className="py-12 text-center text-sm text-gray-500">Loading dashboard data…</div>}

      {!loading && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {STAT_CARDS.map((card, i) => (
              <div key={i} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="absolute right-4 top-4 h-16 w-16">
                  {card.icon}
                </div>
                <div className={`mb-1 text-xs font-bold uppercase tracking-wider ${card.badgeColor}`}>{card.badge}</div>
                <div className="mb-1 text-xs font-semibold text-gray-500">{card.label}</div>
                <div className={`text-4xl font-bold tracking-tight ${card.danger ? 'text-red-600' : 'text-gray-900'}`}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Middle Row: Chart + School Status */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            {/* Daily Attendance Trend */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Daily Attendance Trend</h3>
                  <p className="text-sm text-gray-500">Comparative analysis of past 7 days</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-black"></span><span className="text-gray-700 font-semibold">This Week</span></div>
                  <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gray-300"></span><span className="text-gray-500">Target</span></div>
                </div>
              </div>

              {/* Mini Bar Chart */}
              <div className="relative h-48">
                <div className="flex h-full items-end justify-between gap-2 px-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                    const heights = [72, 88, 64, 94, 80, 56, 78];
                    return (
                      <div key={day} className="flex flex-1 flex-col items-center gap-2">
                        <div className="w-full rounded-t bg-black/90 transition-all" style={{ height: `${heights[i]}%` }}></div>
                        <span className="text-xs text-gray-500">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* School Status Dark Card */}
            <div className="flex flex-col justify-between rounded-xl bg-black p-6 text-white shadow-sm">
              <div>
                <h3 className="mb-1 text-xl font-bold">School Status</h3>
                <p className="mb-6 text-sm text-gray-400">Real-time system health and operational capacity.</p>
                <div className="space-y-4">
                  {[
                    { label: 'LMS Server', status: 'ONLINE', color: 'text-green-400' },
                    { label: 'Exam Portal', status: 'STABLE', color: 'text-green-400' },
                    { label: 'Staff Connectivity', status: 'DEGRADED', color: 'text-red-400' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b border-white/10 pb-4">
                      <span className="text-sm text-gray-300">{item.label}</span>
                      <span className={`text-sm font-bold ${item.color}`}>{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button className="mt-6 w-full rounded-lg border border-white/20 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                View Full Network Log
              </button>
            </div>
          </div>

          {/* Recent Admin Activity */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Recent Administrative Activity</h3>
                <p className="text-sm text-gray-500">Last 10 system-wide modifications</p>
              </div>
              <button className="text-sm font-bold text-gray-700 hover:underline">Download CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Transaction ID</th>
                    <th className="px-6 py-4">Administrative User</th>
                    <th className="px-6 py-4">Activity Type</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(stats?.recentAuditLogs || []).map((log) => {
                    const initials = log.user?.name ? log.user.name.substring(0, 2).toUpperCase() : 'SY';
                    const color = log.action.includes('Delete') ? 'bg-red-500' : 'bg-blue-500';
                    return (
                    <tr key={log.id} className="transition hover:bg-gray-50">
                      <td className="px-6 py-4 font-bold text-gray-900 truncate max-w-[120px]">{log.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${color}`}>{initials}</div>
                          <span className="font-semibold text-gray-900">{log.user?.name || 'System'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{log.action}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wide bg-teal-50 text-teal-700`}>COMPLETED</span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                    );
                  })}
                  {(!stats?.recentAuditLogs || stats.recentAuditLogs.length === 0) && (
                    <tr><td colSpan="5" className="py-8 text-center text-gray-400">No recent activity found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="rounded-xl bg-gray-900 px-8 py-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <p className="text-sm text-gray-400">© 2024 Institutional Intelligence Platform. All rights reserved.</p>
              <div className="flex gap-6 text-sm text-gray-400">
                <button className="hover:text-gray-200">Privacy Policy</button>
                <button className="hover:text-gray-200">Security Standards</button>
                <button className="hover:text-gray-200">Help Center</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

