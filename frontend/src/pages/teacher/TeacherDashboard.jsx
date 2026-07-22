import { Link } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useBranch } from '../../hooks/useBranch';
import { useTeacherDashboardQuery } from '../../queries/teacherPortalQueries';

function StatCard({ label, value, sub, icon, alert, dark }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${dark ? 'border-slate-900 bg-slate-900 text-white' : alert ? 'border-l-4 border-rose-500 bg-white' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${dark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">{icon}</svg>
        </span>
        {alert && <span className="rounded-md bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">Alert</span>}
      </div>
      <p className={`mt-4 text-3xl font-black ${dark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      <p className={`mt-1 text-xs font-semibold uppercase tracking-wide ${dark ? 'text-slate-300' : 'text-slate-400'}`}>{label}</p>
      {sub && <p className={`mt-0.5 text-xs ${dark ? 'text-slate-400' : 'text-slate-400'}`}>{sub}</p>}
    </div>
  );
}

export default function TeacherDashboard() {
  const { activeSemester } = useBranch();
  const { data, isLoading: loading, isError: error } = useTeacherDashboardQuery();

  const stats = data?.stats || null;
  const gradingSettings = data?.gradingSettings || { gpaEnabled: false, passMark: 50 };

  const name = stats?.teacher?.name || 'Teacher';
  const firstName = name.split(' ')[0];
  const avgGrade = stats?.averageGrade ?? 0;
  const gpa = (avgGrade / 100 * 4).toFixed(2);
  const passStatus = avgGrade >= gradingSettings.passMark ? 'Pass' : 'Fail';
  const avgAttendance = stats?.classSummaries?.length
    ? Math.round(stats.classSummaries.reduce((s, c) => s + (c.attendanceRate || 0), 0) / stats.classSummaries.length)
    : 0;

  const recentGrades = stats?.recentGrades || [];

  return (
    <TeacherLayout searchPlaceholder="Search student or class...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Welcome back, {firstName ? `Mr. ${firstName}` : 'Teacher'}</h1>
          <p className="text-sm text-slate-500">Your teaching summary for today.</p>
        </div>
        <div className="text-right flex items-center gap-3">
          {activeSemester && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs font-bold text-violet-700">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-500"></div>
              {activeSemester.name}{activeSemester.academicYear?.year ? ` · ${activeSemester.academicYear.year}` : ''}
            </div>
          )}
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stats?.subject || 'Faculty'}</div>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex flex-col items-center py-16 text-slate-400">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
          Loading dashboard…
        </div>
      ) : error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-rose-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-5h2v2h-2zm0-8h2v6h-2z" /></svg>
          <p className="text-lg font-bold text-rose-700">Could not load dashboard data</p>
          <p className="mt-1 text-sm text-rose-500">The server may be unavailable or you may be offline.</p>
          <button onClick={load} className="mt-4 rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-rose-700">Retry</button>
        </div>
      ) : (<>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned Students" value={stats?.assignedStudentsCount ?? 0} icon={<path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.7 0-6 1.3-6 4v2h8v-2c0-1 .4-1.9 1-2.6A8 8 0 0 0 8 13z" />} />
        <StatCard label="Avg Attendance" value={`${avgAttendance}%`} sub="Across your classes" icon={<path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />} />
        <StatCard label="Grades Recorded" value={stats?.gradesRecordedCount ?? 0} alert icon={<path d="M6 2h9l5 5v15H6V2zm8 1.5V8h4.5z" />} />
        <StatCard label="Assigned Classes" value={stats?.assignedClassesCount ?? 0} sub={activeSemester ? activeSemester.name : "This semester"} dark icon={<path d="M3 10 12 4l9 6v2H3v-2z" />} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.4fr]">
        {/* Quick actions */}
        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <Link to="/teacher/attendance" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
              <svg className="h-7 w-7 text-slate-700" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
              <div className="mt-3 font-bold text-slate-900">Mark Attendance</div>
              <div className="text-xs text-slate-400">Daily register</div>
            </Link>
            <Link to="/teacher/grades" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
              <svg className="h-7 w-7 text-slate-700" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 4v2h10V7H7zm0 4v2h10v-2H7zm0 4v2h7v-2H7z" /></svg>
              <div className="mt-3 font-bold text-slate-900">Input Grades</div>
              <div className="text-xs text-slate-400">Assessment entry</div>
            </Link>
            <Link to="/teacher/students" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
              <svg className="h-7 w-7 text-slate-700" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v12H7l-3 3V4z" /></svg>
              <div className="mt-3 font-bold text-slate-900">View Students</div>
              <div className="text-xs text-slate-400">Directory & contact</div>
            </Link>
          </div>
        </section>

        {/* Recent activity */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recent Student Activity</h2>
            <Link to="/teacher/grades" className="text-sm font-semibold text-slate-500 hover:text-slate-900">View All Logs</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-3 pr-4 font-semibold">Student</th>
                  <th className="py-3 pr-4 font-semibold">Class</th>
                  <th className="py-3 pr-4 font-semibold">Activity</th>
                  <th className="py-3 pr-4 text-right font-semibold">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentGrades.map((g) => (
                  <tr key={g.gradeId} className="text-slate-700">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                          {(g.studentName || 'NA').split(' ').map((x) => x[0]).slice(0, 2).join('')}
                        </span>
                        <span className="font-semibold text-slate-900">{g.studentName}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">{g.className}{g.subject ? ` · ${g.subject}` : ''}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-600">Grade Update</span>
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-slate-900">{Number(g.percentage).toFixed(0)}%</td>
                  </tr>
                ))}
                {recentGrades.length === 0 && (
                  <tr><td colSpan="4" className="py-8 text-center text-slate-400">No recent activity.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Performance summary */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Academic Performance Trend</h3>
          <p className="text-sm text-slate-500">Across your assigned sections this semester.</p>
          <div className="mt-4 flex items-end gap-8">
            <div>
              <div className="text-3xl font-black text-slate-900">
                {gradingSettings.gpaEnabled ? gpa : `${avgGrade}%`}
              </div>
              <div className="text-xs font-semibold uppercase text-slate-400">
                {gradingSettings.gpaEnabled ? 'GPA Avg' : 'Avg Score'}
              </div>
              {!gradingSettings.gpaEnabled && (
                <div className={`mt-1 text-xs font-semibold ${passStatus === 'Pass' ? 'text-emerald-600' : 'text-rose-600'}`}>Status: {passStatus}</div>
              )}
            </div>
            <div>
              <div className="text-3xl font-black text-rose-600">{Math.max(0, 100 - avgGrade > 100 ? 0 : (avgGrade ? Math.round((100 - avgGrade) / 10) : 0))}%</div>
              <div className="text-xs font-semibold uppercase text-slate-400">Failure Risk</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 11l18-8-8 18-2-7-8-3z" /></svg>
            <h3 className="text-lg font-bold text-slate-900">Administrative Notice</h3>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Keep attendance and grade entries up to date — {stats?.gradesRecordedCount ?? 0} grade records and{' '}
            {stats?.attendanceSessionsCount ?? 0} attendance sessions logged so far.
          </p>
        </div>
      </section>
      </>)}
    </TeacherLayout>
  );
}
