import { Link } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useBranch } from '../../hooks/useBranch';
import { useTeacherDashboardQuery } from '../../queries/teacherPortalQueries';

function StatCard({ label, value, sub, icon, alert, badgeTone = 'blue' }) {
  const badgeStyles = {
    blue: 'bg-[#E4EFF6] text-[#1c4d66]',
    mint: 'bg-[#DCF5EB] text-[#0f5236]',
    slate: 'bg-[#e2ebf0] text-[#203e4f]',
    rose: 'bg-[#FDF3F2] text-[#901e19] border border-[#f5c2c0]',
  };

  return (
    <div className="rounded-2xl border border-[#d8e5ec] bg-white p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4f8] text-[#203e4f]">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">{icon}</svg>
        </span>
        {alert && (
          <span className="rounded-full px-2.5 py-1 text-[10px] font-bold bg-[#FDF3F2] text-[#901e19] border border-[#f5c2c0]">
            Action
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-black tracking-tight text-[#203e4f]">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#6a8b9c]">{label}</p>
      {sub && <p className="mt-1 text-xs font-medium text-[#799cb0]">{sub}</p>}
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
  const avgAttendance = stats?.classSummaries?.length
    ? Math.round(stats.classSummaries.reduce((s, c) => s + (c.attendanceRate || 0), 0) / stats.classSummaries.length)
    : 0;

  const recentGrades = stats?.recentGrades || [];

  return (
    <TeacherLayout searchPlaceholder="Search student or class...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#203e4f]">
            Welcome back, {firstName ? `Mr. ${firstName}` : 'Teacher'}
          </h1>
          <p className="text-sm font-medium text-[#567a8c]">Your teaching overview and quick portal shortcuts.</p>
        </div>
        <div className="text-right flex items-center gap-3">
          {activeSemester && (
            <div className="inline-flex items-center gap-2 rounded-full bg-[#DCF5EB] border border-[#a3e2c9] px-3.5 py-1.5 text-xs font-bold text-[#0f5236]">
              <div className="h-2 w-2 rounded-full bg-[#0f5236]"></div>
              {activeSemester.name}{activeSemester.academicYear?.year ? ` · ${activeSemester.academicYear.year}` : ''}
            </div>
          )}
          <div className="text-xs font-bold uppercase tracking-wider text-[#6a8b9c] bg-white px-3 py-1.5 rounded-full border border-[#d2e2eb]">
            {stats?.subject || 'Faculty'}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 flex flex-col items-center py-16 text-[#6a8b9c]">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[#cbdbe3] border-t-[#203e4f]" />
          Loading dashboard metrics…
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center shadow-xs">
          <svg className="mx-auto mb-3 h-10 w-10 text-rose-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-5h2v2h-2zm0-8h2v6h-2z" /></svg>
          <p className="text-lg font-bold text-rose-700">Could not load dashboard data</p>
          <p className="mt-1 text-sm text-rose-500">The server may be unavailable or you may be offline.</p>
          <button onClick={() => window.location.reload()} className="mt-4 rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-rose-700">Retry</button>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Assigned Students"
              value={stats?.assignedStudentsCount ?? 0}
              icon={<path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.7 0-6 1.3-6 4v2h8v-2c0-1 .4-1.9 1-2.6A8 8 0 0 0 8 13z" />}
            />
            <StatCard
              label="Avg Attendance"
              value={`${avgAttendance}%`}
              sub="Across your classes"
              icon={<path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />}
            />
            <StatCard
              label="Grades Recorded"
              value={stats?.gradesRecordedCount ?? 0}
              alert
              icon={<path d="M6 2h9l5 5v15H6V2zm8 1.5V8h4.5z" />}
            />
            <StatCard
              label="Assigned Classes"
              value={stats?.assignedClassesCount ?? 0}
              sub={activeSemester ? activeSemester.name : "This semester"}
              icon={<path d="M3 10 12 4l9 6v2H3v-2z" />}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.4fr]">
            {/* Quick Actions */}
            <section className="space-y-4">
              <h2 className="text-lg font-extrabold text-[#203e4f]">Quick Actions</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1">
                <Link
                  to="/teacher/attendance"
                  className="group rounded-3xl border border-[#d8e5ec] bg-white p-5 shadow-xs transition hover:border-[#203e4f] hover:shadow-md flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#DCF5EB] text-[#0f5236] flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform shrink-0">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
                  </div>
                  <div>
                    <div className="font-extrabold text-[#203e4f] text-base group-hover:text-[#3b6b82] transition">Mark Attendance</div>
                    <div className="text-xs font-semibold text-[#6a8b9c]">Record daily register for assigned classes</div>
                  </div>
                </Link>

                <Link
                  to="/teacher/grades"
                  className="group rounded-3xl border border-[#d8e5ec] bg-white p-5 shadow-xs transition hover:border-[#203e4f] hover:shadow-md flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#E4EFF6] text-[#1c4d66] flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform shrink-0">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 4v2h10V7H7zm0 4v2h10v-2H7zm0 4v2h7v-2H7z" /></svg>
                  </div>
                  <div>
                    <div className="font-extrabold text-[#203e4f] text-base group-hover:text-[#3b6b82] transition">Input Assessment Grades</div>
                    <div className="text-xs font-semibold text-[#6a8b9c]">Enter test, quiz & exam scores</div>
                  </div>
                </Link>

                <Link
                  to="/teacher/students"
                  className="group rounded-3xl border border-[#d8e5ec] bg-white p-5 shadow-xs transition hover:border-[#203e4f] hover:shadow-md flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#e2ebf0] text-[#203e4f] flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform shrink-0">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v12H7l-3 3V4z" /></svg>
                  </div>
                  <div>
                    <div className="font-extrabold text-[#203e4f] text-base group-hover:text-[#3b6b82] transition">View Assigned Students</div>
                    <div className="text-xs font-semibold text-[#6a8b9c]">Student directory & academic performance</div>
                  </div>
                </Link>
              </div>
            </section>

            {/* Recent Activity Table */}
            <section className="rounded-3xl border border-[#d8e5ec] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-[#203e4f]">Recent Student Activity</h2>
                    <p className="text-xs font-semibold text-[#6a8b9c]">Latest grade recordings</p>
                  </div>
                  <Link to="/teacher/grades" className="text-xs font-extrabold text-[#3b6b82] hover:text-[#203e4f] transition">
                    View Gradebook &rarr;
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#e2ebf0] text-[11px] font-bold uppercase tracking-wider text-[#6a8b9c]">
                        <th className="py-3 pr-4">Student</th>
                        <th className="py-3 pr-4">Class</th>
                        <th className="py-3 pr-4">Activity</th>
                        <th className="py-3 pr-4 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf3f6]">
                      {recentGrades.map((g) => (
                        <tr key={g.gradeId} className="text-[#203e4f] hover:bg-[#f6fafc] transition">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef4f8] text-xs font-black text-[#203e4f] shrink-0">
                                {(g.studentName || 'NA').split(' ').map((x) => x[0]).slice(0, 2).join('')}
                              </span>
                              <span className="font-bold text-xs">{g.studentName}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-xs font-medium text-[#507284]">
                            {g.className}{g.subject ? ` · ${g.subject}` : ''}
                          </td>
                          <td className="py-3 pr-4">
                            <span className="rounded-full bg-[#E4EFF6] px-2.5 py-0.5 text-[10px] font-extrabold text-[#1c4d66]">
                              Grade Update
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right font-extrabold text-xs text-[#203e4f]">
                            {Number(g.percentage).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                      {recentGrades.length === 0 && (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-xs font-medium text-[#8daec0]">
                            No recent grade activity recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>

          {/* Class Summaries Grid */}
          {stats?.classSummaries && stats.classSummaries.length > 0 && (
            <section className="mt-6 rounded-3xl border border-[#d8e5ec] bg-white p-6 shadow-xs">
              <h3 className="text-lg font-extrabold text-[#203e4f] mb-1">Class Attendance & Performance Overview</h3>
              <p className="text-xs font-semibold text-[#6a8b9c] mb-5">Summary across your assigned class sections</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.classSummaries.map((c) => (
                  <div key={c.classId || c.className} className="rounded-2xl border border-[#edf3f6] bg-[#f8fafc] p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-extrabold text-sm text-[#203e4f]">{c.className}</span>
                        <span className="rounded-full bg-[#DCF5EB] px-2 py-0.5 text-[10px] font-bold text-[#0f5236]">
                          {c.studentCount || 0} Students
                        </span>
                      </div>
                      <div className="space-y-2 mt-3">
                        <div>
                          <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="text-[#6a8b9c]">Attendance Rate</span>
                            <span className="text-[#203e4f]">{c.attendanceRate ?? 0}%</span>
                          </div>
                          <div className="w-full bg-[#e2ebf0] rounded-full h-2">
                            <div
                              className="bg-[#203e4f] h-2 rounded-full transition-all"
                              style={{ width: `${c.attendanceRate ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/teacher/attendance?classId=${c.classId}`}
                      className="mt-4 text-center block text-xs font-extrabold text-[#3b6b82] hover:text-[#203e4f] transition py-1.5 rounded-xl bg-white border border-[#d8e5ec]"
                    >
                      Open Register &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </TeacherLayout>
  );
}
