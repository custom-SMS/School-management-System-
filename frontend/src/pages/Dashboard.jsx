import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import AdminLayout from '../components/AdminLayout';
import { AuthContext } from '../context/AuthContext';

const executiveAuditFeed = [
  { id: 'AUD-2091', actor: 'Meron Desta', action: 'Attendance unlock request approved', time: '12 min ago', tone: 'violet' },
  { id: 'AUD-2087', actor: 'Samuel Bekele', action: 'Permission matrix updated for Admin role', time: '48 min ago', tone: 'emerald' },
  { id: 'AUD-2083', actor: 'System', action: 'Registration approval workflow queued for review', time: '1 hr ago', tone: 'amber' },
  { id: 'AUD-2079', actor: 'Finance Engine', action: 'Daily revenue summary finalized', time: 'Today', tone: 'sky' },
];

const schoolPerformance = [
  { area: 'Lower School', students: 1420, revenue: 'ETB 5.2M', growth: '+8.4%', status: 'Leading' },
  { area: 'Middle School', students: 1186, revenue: 'ETB 4.6M', growth: '+5.9%', status: 'Stable' },
  { area: 'Upper School', students: 932, revenue: 'ETB 3.7M', growth: '+3.1%', status: 'Watchlist' },
];

const attendanceUnlockRequests = [
  { area: 'Lower School', requestedBy: 'Academic Office', period: 'Grade 11 · Week 4', reason: 'Late verification', priority: 'High' },
  { area: 'Middle School', requestedBy: 'Vice Principal', period: 'Grade 8 · Midterm', reason: 'Biometric sync issue', priority: 'Medium' },
  { area: 'Upper School', requestedBy: 'Academic Office', period: 'Grade 6 · Daily attendance', reason: 'Teacher absence correction', priority: 'Low' },
];

const adminRegistrations = [
  { name: 'Bethel Tadesse', grade: 'Grade 7', channel: 'Online Registration', status: 'Documents verified', time: '09:40 AM' },
  { name: 'Yonatan Abebe', grade: 'Grade 10', channel: 'Front Desk', status: 'Awaiting section placement', time: '08:55 AM' },
  { name: 'Ruth Alemu', grade: 'Grade 5', channel: 'Transfer Intake', status: 'Pending fee review', time: 'Yesterday' },
  { name: 'Lidya Daniel', grade: 'Grade 3', channel: 'Parent Portal', status: 'Ready for confirmation', time: 'Yesterday' },
];

const adminAssignments = [
  { teacher: 'Marta Hailu', subject: 'Mathematics', className: 'Grade 8 – Section A', load: '24 periods', status: 'Balanced' },
  { teacher: 'Bereket Taye', subject: 'Physics', className: 'Grade 11 – Section B', load: '19 periods', status: 'Optimal' },
  { teacher: 'Hiwot Bekele', subject: 'English', className: 'Grade 6 – Section C', load: '27 periods', status: 'High' },
];

const academicEvents = [
  { title: 'Midterm assessment window', detail: 'Opens in 3 days', type: 'Assessment' },
  { title: 'Report card publishing', detail: 'Scheduled for Friday', type: 'Academic' },
  { title: 'PTA briefing', detail: 'This week · 2:00 PM', type: 'Community' },
];

const academicActivities = [
  { title: 'Grade 10 report cards reviewed', meta: 'Academic office · 20 min ago' },
  { title: 'New section created for Grade 4', meta: 'Operations · 52 min ago' },
  { title: 'Teacher assignment adjusted for chemistry lab', meta: 'Department head · Today' },
  { title: 'Attendance checklist synchronized for Grade 9', meta: 'Registrar · Today' },
];

const toneStyles = {
  violet: 'bg-violet-500/15 text-violet-700 ring-violet-200',
  emerald: 'bg-emerald-500/15 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-500/15 text-amber-700 ring-amber-200',
  sky: 'bg-sky-500/15 text-sky-700 ring-sky-200',
};

const priorityStyles = {
  High: 'bg-rose-500/15 text-rose-700 ring-rose-200',
  Medium: 'bg-amber-500/15 text-amber-700 ring-amber-200',
  Low: 'bg-emerald-500/15 text-emerald-700 ring-emerald-200',
};

const statusStyles = {
  Leading: 'bg-emerald-500/15 text-emerald-700 ring-emerald-200',
  Stable: 'bg-sky-500/15 text-sky-700 ring-sky-200',
  Watchlist: 'bg-amber-500/15 text-amber-700 ring-amber-200',
  Balanced: 'bg-sky-500/15 text-sky-700 ring-sky-200',
  Optimal: 'bg-emerald-500/15 text-emerald-700 ring-emerald-200',
  High: 'bg-amber-500/15 text-amber-700 ring-amber-200',
};

function StatCard({ label, value, meta, accent, icon }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{label}</div>
          <div className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</div>
          <div className="mt-2 text-sm text-slate-500">{meta}</div>
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function MiniBars({ values, colorClass = 'bg-slate-900' }) {
  return (
    <div className="flex h-44 items-end gap-3">
      {values.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-full w-full items-end rounded-2xl bg-slate-100 p-1">
            <div className={`w-full rounded-xl ${colorClass}`} style={{ height: `${item.value}%` }} />
          </div>
          <span className="text-xs font-semibold text-slate-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function ExecutiveStatCard({ label, value, meta, accent, icon, status }) {
  return (
    <div className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-slate-100/60 blur-2xl transition duration-300 group-hover:scale-125" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</div>
          <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</div>
          <div className="mt-2 text-sm text-slate-500">{meta}</div>
        </div>
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg`}>
          {icon}
        </div>
      </div>
      {status && (
        <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {status}
        </div>
      )}
    </div>
  );
}

function ExecutiveActionButton({ label, description, accent, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-[1.6rem] bg-gradient-to-r ${accent} px-5 py-5 text-left text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-black">{label}</div>
          <div className="mt-1 text-sm text-white/80">{description}</div>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/90 transition group-hover:bg-white/15">
          Open
        </div>
      </div>
    </button>
  );
}

function AdminDashboardView({ stats, navigate, user, permissions }) {
  const pendingRegistrations = stats?.pendingRegistrations || 18;

  const statCards = [
    {
      label: 'Total Students',
      value: stats?.totalStudents?.toLocaleString() || '1,248',
      meta: 'Actively enrolled students',
      accent: 'from-emerald-500 to-teal-600',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Total Teachers',
      value: stats?.totalTeachers?.toLocaleString() || '86',
      meta: 'Teachers scheduled this term',
      accent: 'from-sky-500 to-indigo-600',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
          <path d="m12 3 9 4.5-9 4.5L3 7.5 12 3Z" />
          <path d="M7 10.5V15c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5" />
          <path d="M21 9v6" />
        </svg>
      ),
    },
    {
      label: 'Attendance Rate',
      value: `${stats?.avgAttendance || 96}%`,
      meta: 'Today’s attendance completion',
      accent: 'from-violet-500 to-fuchsia-600',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
          <path d="m5 12 4 4L19 6" />
        </svg>
      ),
    },
    {
      label: 'Academic Performance Score',
      value: `${stats?.averageGrade || 82}%`,
      meta: 'Current reporting cycle average',
      accent: 'from-amber-500 to-orange-600',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
          <path d="M12 20V10M18 20V4M6 20v-6" />
        </svg>
      ),
    },
    {
      label: 'Active Classes',
      value: stats?.activeClasses?.toLocaleString() || '24',
      meta: 'Classes running today',
      accent: 'from-slate-700 to-slate-900',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
          <path d="M3 5h18v14H3z" />
          <path d="M3 10h18M8 5v14M16 5v14" />
        </svg>
      ),
    },
    {
      label: 'Pending Registrations',
      value: pendingRegistrations.toLocaleString(),
      meta: 'Applications awaiting action',
      accent: 'from-rose-500 to-pink-600',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
          <path d="M12 8v4l3 3" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      ),
    },
  ];

  const quickActions = [
    { label: 'Register Student', route: '/register-student', accent: 'from-slate-900 to-slate-700' },
    { label: 'Manage Students', route: '/students', accent: 'from-emerald-500 to-teal-600' },
    { label: 'Manage Teachers', route: '/teachers', accent: 'from-sky-500 to-indigo-600' },
    { label: 'Create Timetable', route: '/timetables', accent: 'from-violet-500 to-fuchsia-600' },
    { label: 'Generate Report Cards', route: '/report-cards', accent: 'from-amber-500 to-orange-600' },
    { label: 'View Academic Reports', route: '/academic-reports', accent: 'from-cyan-500 to-sky-600' },
  ];

  return (
    <AdminLayout
      pageTitle="Admin Dashboard"
      pageSubtitle="Daily School Operations Overview"
      headerAction={
        <>
          {(user?.role === 'SuperAdmin' || permissions.includes('student_registration')) && (
            <button
              onClick={() => navigate('/register-student')}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Register Student
            </button>
          )}
        </>
      }
      searchPlaceholder="Search students, teachers, subjects, classes, sections, or registrations..."
    >
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-3xl transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70"
            >
              <StatCard {...card} />
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                  Attendance Monitoring
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-900">Attendance Trends</h3>
                <p className="mt-1 text-sm text-slate-500">7-day attendance movement across active classes and sections.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">Completion</div>
                <div className="mt-1 text-lg font-black text-slate-900">96%</div>
              </div>
            </div>
            <div className="mt-6">
              <MiniBars
                values={[
                  { label: 'Mon', value: 88 },
                  { label: 'Tue', value: 91 },
                  { label: 'Wed', value: 86 },
                  { label: 'Thu', value: 93 },
                  { label: 'Fri', value: 89 },
                  { label: 'Sat', value: 72 },
                  { label: 'Sun', value: 66 },
                ]}
                colorClass="bg-gradient-to-t from-emerald-600 to-emerald-400"
              />
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
            <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-200">
              Daily Planning
            </div>
            <h3 className="mt-4 text-2xl font-black">Upcoming Academic Events</h3>
            <p className="mt-2 text-sm text-slate-400">Calendar-driven tasks and important school events for operations planning.</p>

            <div className="mt-6 space-y-3">
              {academicEvents.map((event) => (
                <div key={event.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold">{event.title}</div>
                      <div className="mt-1 text-sm text-slate-400">{event.detail}</div>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
                      {event.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Recent Student Registrations</h3>
                <p className="mt-1 text-sm text-slate-500">New applications and enrollment actions requiring daily follow-up.</p>
              </div>
              <button
                onClick={() => navigate('/register-student')}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Open Registration
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Student</th>
                      <th className="px-5 py-4">Grade</th>
                      <th className="px-5 py-4">Channel</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {adminRegistrations.map((item) => (
                      <tr key={`${item.name}-${item.time}`} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-bold text-slate-900">{item.name}</td>
                        <td className="px-5 py-4 text-slate-600">{item.grade}</td>
                        <td className="px-5 py-4 text-slate-600">{item.channel}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 ring-1 ring-sky-200">
                            {item.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500">{item.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Teacher Assignment Overview</h3>
                <p className="mt-1 text-sm text-slate-500">Operational workload cards for class coverage and timetable readiness.</p>
              </div>
              <button
                onClick={() => navigate('/assignments')}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                View Assignments
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {adminAssignments.map((row) => (
                <div key={`${row.teacher}-${row.className}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{row.teacher}</div>
                      <div className="mt-1 text-sm text-slate-500">{row.subject}</div>
                      <div className="mt-2 text-sm text-slate-600">{row.className}</div>
                    </div>
                    <div className="flex flex-col items-start gap-3 sm:items-end">
                      <div className="text-sm font-semibold text-slate-600">{row.load}</div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[row.status]}`}>
                        {row.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-slate-900">School Academic Health</h3>
              <p className="mt-1 text-sm text-slate-500">Summary metrics for report cards, timetable stability, and registration flow.</p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Report Cards Ready', value: '87%', tone: 'from-sky-500 to-indigo-600' },
                { label: 'Timetable Stability', value: '94%', tone: 'from-emerald-500 to-teal-600' },
                { label: 'Registration Completion', value: '78%', tone: 'from-amber-500 to-orange-600' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
                  <div className={`mt-4 inline-flex rounded-2xl bg-gradient-to-r px-4 py-2 text-2xl font-black text-white ${item.tone}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-slate-900">Recent Academic Activities</h3>
              <p className="mt-1 text-sm text-slate-500">Operational feed of the latest class, reporting, and staff coordination updates.</p>
            </div>
            <div className="mt-5 space-y-3">
              {academicActivities.map((activity) => (
                <div key={activity.title} className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-bold text-slate-900">{activity.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{activity.meta}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Quick Actions</h3>
              <p className="mt-1 text-sm text-slate-500">Task-driven shortcuts for the most common daily school management workflows.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Operations Toolkit</div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.route)}
                className={`rounded-3xl bg-gradient-to-r ${action.accent} px-5 py-5 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg`}
              >
                <div className="text-sm font-black">{action.label}</div>
                <div className="mt-1 text-sm text-white/80">Open operational workspace</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function SuperAdminDashboardView({ stats, navigate, user }) {
  const schoolInsights = useMemo(() => schoolPerformance, []);

  const totalStudents = stats?.totalStudents || 3538;
  const totalTeachers = stats?.totalTeachers || 264;
  const totalCashiers = stats?.totalCashiers || 18;
  const totalRevenue = stats?.totalRevenue ? `ETB ${(stats.totalRevenue / 1000000).toFixed(1)}M` : 'ETB 13.5M';
  const activeAcademicYear = stats?.activeAcademicYear || '2025/26';

  const statCards = [
    {
      label: 'Total Students',
      value: totalStudents.toLocaleString(),
      meta: 'System-wide enrollment across all divisions',
      accent: 'from-sky-500 to-indigo-600',
      status: 'Enrollment visibility',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Total Teachers',
      value: totalTeachers.toLocaleString(),
      meta: 'Active educators in governance scope',
      accent: 'from-emerald-500 to-teal-600',
      status: 'Teaching workforce',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
          <path d="m12 3 9 4.5-9 4.5L3 7.5 12 3Z" />
          <path d="M7 10.5V15c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5" />
          <path d="M21 9v6" />
        </svg>
      ),
    },
    {
      label: 'Total Cashiers',
      value: totalCashiers.toLocaleString(),
      meta: 'Finance operations staff monitored centrally',
      accent: 'from-cyan-500 to-sky-600',
      status: 'Finance desk coverage',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
          <path d="M3 7h18v10H3z" />
          <path d="M7 15h2M15 11h.01" />
        </svg>
      ),
    },
    {
      label: 'Total Revenue',
      value: totalRevenue,
      meta: 'Consolidated collections for active cycle',
      accent: 'from-amber-500 to-orange-600',
      status: 'Financial oversight',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
          <path d="M3 7h18v10H3z" />
          <path d="M16 12h.01M3 10h18M6 15h4" />
        </svg>
      ),
    },
    {
      label: 'Active Academic Year',
      value: activeAcademicYear,
      meta: 'Current governance window across the system',
      accent: 'from-slate-700 to-slate-950',
      status: 'Governance timeline',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
          <path d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        </svg>
      ),
    },
    {
      label: 'System Health Status',
      value: 'Optimal',
      meta: 'Core governance workflows operating normally',
      accent: 'from-violet-500 to-fuchsia-600',
      status: 'All systems stable',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
          <path d="M12 21c-4.97-3.56-8-7.58-8-11.5A4.5 4.5 0 0 1 8.5 5c1.48 0 2.79.67 3.5 1.72A4.48 4.48 0 0 1 15.5 5 4.5 4.5 0 0 1 20 9.5c0 3.92-3.03 7.94-8 11.5Z" />
        </svg>
      ),
    },
  ];

  const divisionRevenueChart = schoolInsights.map((item) => ({
    label: item.area.split(' ')[0],
    value: Math.max(38, Math.min(100, Math.round(item.students / 16) + 8)),
  }));

  const studentDistribution = [
    { area: 'Lower School', share: 40, count: '1,420', tone: 'from-violet-500 to-fuchsia-500' },
    { area: 'Middle School', share: 34, count: '1,186', tone: 'from-sky-500 to-cyan-500' },
    { area: 'Upper School', share: 26, count: '932', tone: 'from-emerald-500 to-teal-500' },
  ];

  const governanceAlerts = [
    {
      title: 'Attendance anomaly detected',
      detail: 'Upper School recorded a 4.2% dip in attendance compliance this week.',
      severity: 'High',
      tone: 'bg-rose-500/10 text-rose-700 ring-rose-200',
    },
    {
      title: 'Policy override submitted',
      detail: 'One exceptional timetable approval was escalated for governance review.',
      severity: 'Medium',
      tone: 'bg-amber-500/10 text-amber-700 ring-amber-200',
    },
    {
      title: 'Fee reconciliation stable',
      detail: 'Division-level revenue reporting is balanced across all active units.',
      severity: 'Low',
      tone: 'bg-emerald-500/10 text-emerald-700 ring-emerald-200',
    },
  ];

  const analyticsSnapshot = [
    { label: 'Attendance Analytics', value: '95.2%', tone: 'from-emerald-500 to-teal-600' },
    { label: 'Academic Performance', value: '84.7%', tone: 'from-sky-500 to-indigo-600' },
    { label: 'Revenue Collection', value: '91.3%', tone: 'from-amber-500 to-orange-600' },
    { label: 'Policy Compliance', value: '97.0%', tone: 'from-violet-500 to-fuchsia-600' },
  ];

  const quickActions = [
    {
      label: 'Manage Users',
      description: 'Open the system-wide user directory and governance controls.',
      route: '/teachers',
      accent: 'from-sky-500 to-indigo-600',
    },
    {
      label: 'Review Permissions',
      description: 'Inspect role access policy and permission governance.',
      route: '/assignments',
      accent: 'from-violet-500 to-fuchsia-600',
    },
    {
      label: 'View Audit Logs',
      description: 'Inspect sensitive activity and executive audit history.',
      route: '/registrar',
      accent: 'from-slate-700 to-slate-900',
    },
    {
      label: 'Configure System Settings',
      description: 'Adjust organization-wide platform and policy settings.',
      route: '/settings',
      accent: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Review Financial Reports',
      description: 'Open oversight views for school-wide financial performance.',
      route: '/bursar',
      accent: 'from-amber-500 to-orange-600',
    },
  ];

  return (
    <AdminLayout
      pageTitle="Super Admin Overview"
      pageSubtitle={`${user?.organizationName || 'School Management System'} · Executive control, system-wide visibility, and governance analytics`}
      headerAction={
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-800">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
            Current Academic Year · {activeAcademicYear}
          </div>
          <button
            onClick={() => navigate('/registrar')}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Executive Audit View
          </button>
        </div>
      }
      searchPlaceholder="Search students, users, roles, audit activity, notifications, or analytics..."
    >
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 p-6 text-white shadow-sm sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(139,92,246,0.28),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.18),_transparent_30%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-200">
                Top-level System Governance Dashboard
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Super Admin Overview</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Executive command center for organization-wide oversight across academics, attendance governance,
                permissions, finance, and institutional analytics.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px] xl:max-w-[460px]">
              {[
                { label: 'Divisions', value: `${schoolInsights.length}`, helper: 'Monitored units' },
                { label: 'Open Alerts', value: '04', helper: 'Requires review' },
                { label: 'Compliance', value: '97%', helper: 'Policy adherence' },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">{item.label}</div>
                  <div className="mt-3 text-2xl font-black">{item.value}</div>
                  <div className="mt-1 text-sm text-slate-400">{item.helper}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {statCards.map((card) => (
            <ExecutiveStatCard key={card.label} {...card} />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-violet-700">
                  Division Intelligence
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-900">School Division Performance</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Comparative executive view of enrollment, revenue contribution, and operating momentum.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">System Performance Index</div>
                <div className="mt-1 text-lg font-black text-slate-900">91.4 / 100</div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Division</th>
                      <th className="px-5 py-4">Students</th>
                      <th className="px-5 py-4">Revenue</th>
                      <th className="px-5 py-4">Growth</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {schoolInsights.map((row) => (
                      <tr key={row.area} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-bold text-slate-900">{row.area}</td>
                        <td className="px-5 py-4 text-slate-600">{row.students.toLocaleString()}</td>
                        <td className="px-5 py-4 text-slate-600">{row.revenue}</td>
                        <td className="px-5 py-4 text-slate-600">{row.growth}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[row.status]}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-200">
                Governance Control
              </div>
              <h3 className="mt-4 text-2xl font-black">Attendance Governance Alerts</h3>
              <p className="mt-2 text-sm text-slate-400">
                Centralized signals across compliance, academic year state, and policy exceptions.
              </p>

              <div className="mt-6 space-y-3">
                {governanceAlerts.map((alert) => (
                  <div key={alert.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-bold text-white">{alert.title}</div>
                        <div className="mt-1 text-sm text-slate-400">{alert.detail}</div>
                      </div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${alert.tone}`}>
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h3 className="text-lg font-black text-slate-900">System Analytics Snapshot</h3>
                <p className="mt-1 text-sm text-slate-500">Executive summary across operational quality, finance, and compliance.</p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {analyticsSnapshot.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
                    <div className={`mt-4 inline-flex rounded-2xl bg-gradient-to-r px-4 py-2 text-2xl font-black text-white ${item.tone}`}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[1fr_1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Revenue by Division</h3>
                <p className="mt-1 text-sm text-slate-500">Bar and trend visualization for consolidated division performance.</p>
              </div>
              <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Finance Oversight</div>
            </div>

            <div className="mt-6">
              <MiniBars
                values={divisionRevenueChart}
                colorClass="bg-gradient-to-t from-amber-600 via-orange-500 to-amber-300"
              />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {schoolInsights.map((item) => (
                <div key={item.area} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{item.area}</div>
                  <div className="mt-2 text-lg font-black text-slate-900">{item.revenue}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.growth} trend</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Student Distribution by Division</h3>
                <p className="mt-1 text-sm text-slate-500">Donut-inspired population distribution for system-wide oversight.</p>
              </div>
              <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">Enrollment Mix</div>
            </div>

            <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center">
              <div className="mx-auto h-52 w-52 rounded-full bg-[conic-gradient(#8b5cf6_0deg_144deg,#38bdf8_144deg_266.4deg,#10b981_266.4deg_360deg)] p-4 shadow-inner">
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Students</div>
                  <div className="mt-2 text-4xl font-black tracking-tight text-slate-900">{totalStudents.toLocaleString()}</div>
                  <div className="mt-2 text-sm text-slate-500">Across all divisions</div>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                {studentDistribution.map((item) => (
                  <div key={item.area} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{item.area}</div>
                        <div className="mt-1 text-sm text-slate-500">{item.count} students</div>
                      </div>
                      <div className={`rounded-full bg-gradient-to-r px-3 py-1 text-xs font-bold text-white ${item.tone}`}>
                        {item.share}%
                      </div>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                      <div className={`h-full rounded-full bg-gradient-to-r ${item.tone}`} style={{ width: `${item.share}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Pending Attendance Unlock Requests</h3>
                <p className="mt-1 text-sm text-slate-500">Action-oriented governance queue requiring central review.</p>
              </div>
              <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">3 Pending</div>
            </div>

            <div className="mt-5 space-y-3">
              {attendanceUnlockRequests.map((request) => (
                <div key={`${request.area}-${request.period}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{request.area}</div>
                      <div className="mt-1 text-sm text-slate-500">{request.period}</div>
                      <div className="mt-2 text-sm text-slate-600">{request.reason}</div>
                      <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Requested by {request.requestedBy}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${priorityStyles[request.priority]}`}>
                        {request.priority}
                      </span>
                      <button
                        type="button"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[1fr_0.95fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Recent Audit Activity</h3>
                <p className="mt-1 text-sm text-slate-500">Timeline of sensitive system actions, approvals, and operational checkpoints.</p>
              </div>
              <button
                onClick={() => navigate('/registrar')}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Open Audit Logs
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {executiveAuditFeed.map((entry, index) => (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-xs font-bold ring-1 ${toneStyles[entry.tone]}`}>
                      {entry.id.split('-')[1]}
                    </div>
                    {index < executiveAuditFeed.length - 1 && <div className="mt-2 h-full w-px bg-slate-200" />}
                  </div>
                  <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{entry.action}</div>
                        <div className="mt-1 text-sm text-slate-500">{entry.actor}</div>
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{entry.time}</div>
                    </div>
                    <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{entry.id}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Quick Actions</h3>
                  <p className="mt-1 text-sm text-slate-500">High-value administrative shortcuts for executive governance tasks.</p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Executive Tools</div>
              </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {quickActions.map((action) => (
                      <ExecutiveActionButton
                        key={action.label}
                        label={action.label}
                        description={action.description}
                        accent={action.accent}
                        onClick={() => navigate(action.route)}
                      />
                    ))}
                  </div>
            </div>

            <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-200">
                System Governance Summary
              </div>
              <h3 className="mt-4 text-2xl font-black">Executive Readiness</h3>
              <p className="mt-2 text-sm text-slate-400">A premium summary panel emphasizing system-wide oversight rather than operational execution.</p>

              <div className="mt-6 grid gap-3">
                {[
                  { label: 'Academic Year', value: activeAcademicYear },
                  { label: 'Revenue Position', value: totalRevenue },
                  { label: 'Attendance Queue', value: '3 approvals pending' },
                  { label: 'Governance Posture', value: 'Stable with minor alerts' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                    <div className="mt-2 text-sm font-bold text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default function Dashboard() {
  const { user, permissions } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      if (!user) return;

      try {
        if (['Admin', 'SuperAdmin', 'Cashier'].includes(user.role)) {
          const res = await axios.get('/stats/admin');
          if (active) setStats(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [user]);

  const isAdminRole = useMemo(
    () => ['Admin', 'SuperAdmin'].includes(user?.role),
    [user?.role]
  );

  if (!isAdminRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white">
            Restricted Role View
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900">Role-specific dashboard preserved</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Teacher, Student, Parent, and Cashier experiences remain unchanged and should continue to use their dedicated routes and completed interfaces.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <AdminLayout
        pageTitle={user?.role === 'SuperAdmin' ? 'Super Admin Overview' : 'Admin Dashboard'}
        pageSubtitle="Loading role-specific workspace..."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: user?.role === 'SuperAdmin' ? 6 : 6 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  if (user?.role === 'SuperAdmin') {
    return (
      <SuperAdminDashboardView
        stats={stats}
        navigate={navigate}
        user={user}
      />
    );
  }

  return <AdminDashboardView stats={stats} navigate={navigate} user={user} permissions={permissions} />;
}