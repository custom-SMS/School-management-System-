import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import StudentLayout from '../../components/StudentLayout';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function FetchError({ onRetry }) {
  return (
    <div className="mt-6 rounded-2xl border border-red-200 bg-[#fdf3f2] p-8 text-center text-[#c53929]">
      <svg className="mx-auto mb-3 h-10 w-10 text-[#e0726b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="text-base font-bold text-[#c53929]">Could not load dashboard data</p>
      <p className="mt-1 text-xs text-[#66889a]">The server may be unavailable or you may be offline.</p>
      <button onClick={onRetry} className="mt-4 rounded-full bg-[#3b6b82] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#203e4f]">Retry</button>
    </div>
  );
}

export default function StudentDashboard() {
  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [gradingSettings, setGradingSettings] = useState({ gpaEnabled: false, passMark: 50 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    let statsOk = false;
    const p1 = axios.get('/stats/student/me')
      .then((r) => { setStats(r.data); statsOk = true; })
      .catch(() => { });
    const p2 = axios.get('/timetables/student/me')
      .then((r) => setTimetable(r.data?.timetable || []))
      .catch(() => { });
    const p3 = axios.get('/settings/public')
      .then((r) => setGradingSettings(r.data?.grading || { gpaEnabled: false, passMark: 50 }))
      .catch(() => { });
    const p4 = axios.get('/students/me/subjects')
      .then((r) => setSubjects(r.data?.subjects || []))
      .catch(() => { });
    Promise.all([p1, p2, p3, p4]).finally(() => {
      if (!statsOk) setError(true);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const name = stats?.profile?.user?.name || 'Student';
  const firstName = name.split(' ')[0];
  const grades = stats?.grades || [];
  const attendanceRate = stats?.attendanceRate ?? 0;

  const allComplete = subjects.length > 0 && subjects.every((s) => s.latestPercentage != null && s.assessmentsCount === 4);
  const avgPct = allComplete
    ? subjects.reduce((sum, s) => sum + Number(s.latestPercentage), 0) / subjects.length
    : null;
  const gpa = avgPct != null ? (avgPct / 100 * 4).toFixed(2) : null;
  const passStatus = avgPct != null ? (avgPct >= gradingSettings.passMark ? 'Pass' : 'Fail') : null;

  const todayName = dayNames[new Date().getDay()] || 'Monday';
  const todaySlots = timetable.filter((s) => s.dayOfWeek === todayName).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

  return (
    <StudentLayout searchPlaceholder="Search academics...">
      {/* Hero Card */}
      <div className="rounded-2xl bg-[#203e4f] p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Hello, {firstName} !</h1>
          <p className="mt-1 text-xs sm:text-sm text-[#cbe1eb]">Ready to tackle your studies? You're doing great!</p>
          <Link to="/student/academics" className="mt-5 inline-block rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#203e4f] shadow-md transition hover:bg-slate-100">
            View Academics →
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex flex-col items-center py-20 text-[#63889b]">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[#d8e6ed] border-t-[#203e4f]" />
          Loading your student dashboard…
        </div>
      ) : error ? (
        <FetchError onRetry={load} />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
            {/* Today's schedule */}
            <section className="rounded-2xl border border-[#d8e6ed] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-[#203e4f]">Today's Schedule</h2>
                <Link to="/student/academics" className="text-xs font-bold text-[#3b6b82] hover:underline">Full Timetable</Link>
              </div>
              <div className="space-y-3">
                {todaySlots.length ? todaySlots.slice(0, 4).map((s, i) => (
                  <div key={s.id || i} className={`rounded-xl border p-4 transition ${i === 0 ? 'border-[#3b6b82] bg-[#f0f6f9]' : 'border-[#e2edf2]'}`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#63889b]">{i === 0 ? 'Up Next' : `Period ${i + 1}`}</div>
                    <div className="mt-1 text-base font-bold text-[#203e4f]">{s.subject?.name || s.class?.name}</div>
                    <div className="text-xs text-[#547587] mt-0.5">{s.startTime} – {s.endTime}{s.room ? ` · Room ${s.room}` : ''}</div>
                  </div>
                )) : (
                  <p className="py-8 text-center text-xs text-[#66889a]">No classes scheduled for {todayName}.</p>
                )}
              </div>
            </section>

            {/* GPA/Score + Attendance */}
            <section className="space-y-6">
              {gradingSettings.gpaEnabled ? (
                <div className="rounded-2xl border border-[#d8e6ed] bg-white p-6 text-center shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#63889b]">Current GPA</div>
                  {gpa != null ? (
                    <>
                      <div className="mx-auto mt-3 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#203e4f] bg-[#f0f6f9] text-2xl font-black text-[#203e4f] shadow-inner">{gpa}</div>
                      <div className="mt-3 text-xs font-medium text-[#66889a]">Based on {subjects.length} subject{subjects.length === 1 ? '' : 's'}</div>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto mt-3 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#e2edf2] text-sm font-bold text-[#88a7b8]">—</div>
                      <div className="mt-3 text-xs font-medium text-[#66889a]">Available when all assessments are graded</div>
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#d8e6ed] bg-white p-6 text-center shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#63889b]">Average Score</div>
                  {avgPct != null ? (
                    <>
                      <div className="mx-auto mt-3 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#203e4f] bg-[#f0f6f9] text-2xl font-black text-[#203e4f] shadow-inner">{avgPct.toFixed(0)}%</div>
                      <div className={`mt-2 text-xs font-bold ${passStatus === 'Pass' ? 'text-[#2d7a64]' : 'text-[#c53929]'}`}>Status: {passStatus}</div>
                      <div className="mt-0.5 text-xs text-[#66889a]">Pass mark: {gradingSettings.passMark}%</div>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto mt-3 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#e2edf2] text-sm font-bold text-[#88a7b8]">—</div>
                      <div className="mt-3 text-xs font-medium text-[#66889a]">Available when all assessments are graded</div>
                    </>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-[#d8e6ed] bg-white p-6 text-center shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-[#63889b]">Attendance</div>
                <div className="mt-1 text-3xl font-black text-[#203e4f]">{attendanceRate}%</div>
                <div className="mt-1 text-xs font-medium text-[#66889a]">{attendanceRate >= 90 ? 'Excellent consistency' : 'Keep it up'}</div>
              </div>
            </section>
          </div>

          {/* Recent grades */}
          <section className="mt-6 rounded-2xl border border-[#d8e6ed] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#203e4f]">Recent Grades</h2>
              <Link to="/student/academics" className="text-xs font-bold text-[#3b6b82] hover:underline">View All</Link>
            </div>
            <div className="divide-y divide-[#edf3f6]">
              {grades.slice(0, 5).map((g, i) => {
                const pct = Number(g.percentage || 0);
                return (
                  <div key={g._id || i} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black ${
                        pct >= 80 ? 'bg-[#dcf5eb] text-[#2d7a64]' : pct >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-[#fdf3f2] text-[#c53929]'
                      }`}>
                        {pct.toFixed(0)}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-[#203e4f]">{g.subject || 'Subject'}</div>
                        <div className="text-[11px] text-[#66889a]">{g.examName || g.class || ''}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-[#203e4f]">{pct.toFixed(0)}/100</div>
                      <div className="text-[10px] text-[#66889a]">{g.class || ''}</div>
                    </div>
                  </div>
                );
              })}
              {grades.length === 0 && <p className="py-8 text-center text-xs text-[#66889a]">No grades published yet.</p>}
            </div>
          </section>

          {/* Attendance history */}
          <section className="mt-6 rounded-2xl border border-[#d8e6ed] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#203e4f]">Attendance History</h2>
              <Link to="/student/attendance" className="text-xs font-bold text-[#3b6b82] hover:underline">View Full History</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e2edf2] text-[10px] font-bold uppercase tracking-wider text-[#63889b]">
                    <th className="py-2.5 pr-4">Date</th>
                    <th className="py-2.5 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f6f9]">
                  {(stats?.attendance || []).slice(0, 8).map((a, i) => (
                    <tr key={i} className="hover:bg-[#f7fafc]">
                      <td className="py-2.5 pr-4 font-bold text-[#203e4f]">{a.date ? new Date(a.date).toLocaleDateString() : '—'}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          a.status === 'Absent' ? 'bg-[#fdf3f2] text-[#c53929]' : a.status === 'Late' ? 'bg-amber-50 text-amber-700' : 'bg-[#dcf5eb] text-[#2d7a64]'
                        }`}>
                          {(a.status || 'Unknown').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(stats?.attendance || []).length === 0 && (
                    <tr><td colSpan="2" className="py-8 text-center text-xs text-[#66889a]">No attendance records available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </StudentLayout>
  );
}