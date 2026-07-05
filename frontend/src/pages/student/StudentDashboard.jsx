import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import StudentLayout from '../../components/StudentLayout';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const letterFor = (p) => (p >= 90 ? 'A' : p >= 85 ? 'A-' : p >= 80 ? 'B+' : p >= 70 ? 'B' : p >= 60 ? 'C' : 'D');

function FetchError({ onRetry }) {
  return (
    <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <svg className="mx-auto mb-3 h-10 w-10 text-rose-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-5h2v2h-2zm0-8h2v6h-2z" />
      </svg>
      <p className="text-lg font-bold text-rose-700">Could not load dashboard data</p>
      <p className="mt-1 text-sm text-rose-500">The server may be unavailable or you may be offline.</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-rose-700">Retry</button>
    </div>
  );
}

export default function StudentDashboard() {
  const [stats, setStats] = useState(null);
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
      .catch(() => {});
    const p2 = axios.get('/timetables/student/me')
      .then((r) => setTimetable(r.data?.timetable || []))
      .catch(() => {});
    const p3 = axios.get('/settings/public')
      .then((r) => setGradingSettings(r.data?.grading || { gpaEnabled: false, passMark: 50 }))
      .catch(() => {});
    Promise.all([p1, p2, p3]).finally(() => {
      if (!statsOk) setError(true);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const name = stats?.profile?.user?.name || 'Student';
  const firstName = name.split(' ')[0];
  const grades = stats?.grades || [];
  const avgPct = grades.length ? grades.reduce((s, g) => s + Number(g.percentage || 0), 0) / grades.length : 0;
  const gpa = (avgPct / 100 * 4).toFixed(2);
  const attendanceRate = stats?.attendanceRate ?? 0;
  const passStatus = avgPct >= gradingSettings.passMark ? 'Pass' : 'Fail';

  const todayName = dayNames[new Date().getDay()] || 'Monday';
  const todaySlots = timetable.filter((s) => s.dayOfWeek === todayName).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

  return (
    <StudentLayout searchPlaceholder="Search...">
      {/* Hero — always visible */}
      <div className="rounded-2xl bg-slate-900 p-8 text-white shadow-sm">
        <h1 className="text-3xl font-black tracking-tight">Hello, {firstName}!</h1>
        <p className="mt-1 text-sm text-slate-300">Ready to tackle your studies? You're doing great!</p>
        <Link to="/student/academics" className="mt-5 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100">View Academics</Link>
      </div>

      {loading ? (
        <div className="mt-6 flex flex-col items-center py-20 text-slate-400">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
          Loading your dashboard…
        </div>
      ) : error ? (
        <FetchError onRetry={load} />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
            {/* Today's schedule */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Today's Schedule</h2>
                <Link to="/student/academics" className="text-sm font-semibold text-slate-500 hover:text-slate-900">Full Timetable</Link>
              </div>
              <div className="space-y-3">
                {todaySlots.length ? todaySlots.slice(0, 4).map((s, i) => (
                  <div key={s.id || i} className={`rounded-xl border p-4 ${i === 0 ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}>
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{i === 0 ? 'Up Next' : `Period ${i + 1}`}</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{s.subject?.name || s.class?.name}</div>
                    <div className="text-sm text-slate-500">{s.startTime} – {s.endTime}{s.room ? ` · Room ${s.room}` : ''}</div>
                  </div>
                )) : (
                  <p className="py-8 text-center text-sm text-slate-400">No classes scheduled for {todayName}.</p>
                )}
              </div>
            </section>

            {/* GPA/Pass-Fail + attendance */}
            <section className="space-y-6">
              {gradingSettings.gpaEnabled ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current GPA</div>
                  <div className="mx-auto mt-3 flex h-28 w-28 items-center justify-center rounded-full border-8 border-slate-900 text-3xl font-black text-slate-900">{gpa}</div>
                  <div className="mt-3 text-xs text-slate-400">Based on {grades.length} graded item{grades.length === 1 ? '' : 's'}</div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Average Score</div>
                  <div className="mx-auto mt-3 flex h-28 w-28 items-center justify-center rounded-full border-8 border-slate-900 text-3xl font-black text-slate-900">{avgPct.toFixed(0)}%</div>
                  <div className={`mt-3 text-xs font-semibold ${passStatus === 'Pass' ? 'text-emerald-600' : 'text-rose-600'}`}>Status: {passStatus}</div>
                  <div className="mt-1 text-xs text-slate-400">Pass mark: {gradingSettings.passMark}%</div>
                </div>
              )}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attendance</div>
                <div className="mt-1 text-4xl font-black text-slate-900">{attendanceRate}%</div>
                <div className="text-xs text-slate-400">{attendanceRate >= 90 ? 'Excellent consistency' : 'Keep it up'}</div>
              </div>
            </section>
          </div>

          {/* Recent grades */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Recent Grades</h2>
              <Link to="/student/academics" className="text-sm font-semibold text-slate-500 hover:text-slate-900">View All</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {grades.slice(0, 5).map((g, i) => {
                const pct = Number(g.percentage || 0);
                return (
                  <div key={g._id || i} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-700">{letterFor(pct)}</span>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{g.subject || 'Subject'}</div>
                        <div className="text-xs text-slate-400">{g.class || ''}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">{pct.toFixed(0)}/100</div>
                      <div className="text-xs text-slate-400">Grade: {letterFor(pct)}</div>
                    </div>
                  </div>
                );
              })}
              {grades.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No grades published yet.</p>}
            </div>
          </section>
        </>
      )}
    </StudentLayout>
  );
}
