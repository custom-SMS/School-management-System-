import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import AdminLayout from '../components/AdminLayout';

const normalizeClassLabel = (value) => String(value ?? '').trim() || 'Unassigned';

const ACTIVITY_LOGS = [
  { id: '#TRX-8921-S', user: 'Tewodros Melaku', initials: 'TM', color: 'bg-blue-500', type: 'Fee Collection – Grade 10', status: 'COMPLETED', time: '10:42 AM' },
  { id: '#TRX-8919-A', user: 'Abebe Kebede', initials: 'AK', color: 'bg-purple-500', type: 'Curriculum Update – Biology', status: 'MODIFIED', time: '09:15 AM' },
  { id: '#TRX-8915-P', user: 'Helen Assefa', initials: 'HA', color: 'bg-orange-500', type: 'New Staff Onboarding', status: 'PENDING', time: '08:02 AM' },
  { id: '#TRX-8910-E', user: 'Dawit Alemu', initials: 'DA', color: 'bg-red-500', type: 'System Backup Failure', status: 'FAILED', time: 'Yesterday' },
];

const STATUS_STYLES = {
  COMPLETED: 'bg-teal-50 text-teal-700',
  MODIFIED: 'bg-gray-200 text-gray-700',
  PENDING: 'bg-orange-50 text-orange-700',
  FAILED: 'bg-red-50 text-red-700',
};

const buildTeacherFallbackData = (assignments = [], user = null) => {
  const uniqueClasses = Array.from(
    new Map(
      assignments.map((a) => a.class).filter(Boolean).map((k) => [k._id, k])
    ).values()
  );
  return {
    assignedClassesCount: uniqueClasses.length,
    assignedStudentsCount: new Set(
      uniqueClasses.flatMap((k) => (k.students || []).map((s) => s?._id?.toString()).filter(Boolean))
    ).size,
    gradesRecordedCount: 0,
    averageGrade: 0,
    classSummaries: uniqueClasses.map((k) => ({
      classId: k._id,
      className: normalizeClassLabel(k.name),
      subject: normalizeClassLabel(k.subject),
      studentCount: k.students?.length || 0,
      attendanceRate: 0,
      averageGrade: 0,
      gradesCount: 0,
    })),
    recentGrades: [],
    recentAttendance: [],
  };
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
        if (user.role === 'Admin' || user.role === 'SuperAdmin' || user.role === 'Cashier') {
          const res = await axios.get('/stats/admin');
          if (active) setStats(res.data);
        } else if (user.role === 'Student') {
          const res = await axios.get('/stats/student/me');
          if (active) setStudentData(res.data);
        } else if (user.role === 'Parent') {
          const res = await axios.get('/stats/parent/me');
          if (active) setParentData(res.data);
        } else if (user.role === 'Teacher') {
          const assignmentsRes = await axios.get('/assignments/me');
          if (active) setTeacherData(buildTeacherFallbackData(assignmentsRes.data || [], user));
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

  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === 'Cashier';

  if (!isAdmin) {
    // Non-admin users: redirect to old behavior or show simple view
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}</h1>
          <p className="mt-2 text-gray-500">You are logged in as <strong>{user?.role}</strong></p>
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
                  {ACTIVITY_LOGS.map((log) => (
                    <tr key={log.id} className="transition hover:bg-gray-50">
                      <td className="px-6 py-4 font-bold text-gray-900">{log.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${log.color}`}>{log.initials}</div>
                          <span className="font-semibold text-gray-900">{log.user}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{log.type}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_STYLES[log.status]}`}>{log.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">{log.time}</td>
                    </tr>
                  ))}
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
