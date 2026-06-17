import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import StudentLayout from '../../components/StudentLayout';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const letterFor = (p) => (p >= 90 ? 'A' : p >= 85 ? 'A-' : p >= 80 ? 'B+' : p >= 70 ? 'B' : p >= 60 ? 'C' : 'D');

export default function StudentDashboard() {
  const [stats, setStats] = useState(null);
  const [timetable, setTimetable] = useState([]);

  useEffect(() => {
    axios.get('/stats/student/me').then((r) => setStats(r.data)).catch(() => {});
    axios.get('/timetables/student/me').then((r) => setTimetable(r.data?.timetable || [])).catch(() => {});
  }, []);

  const name = stats?.profile?.user?.name || 'Student';
  const firstName = name.split(' ')[0];
  const grades = stats?.grades || [];
  const avgPct = grades.length ? grades.reduce((s, g) => s + Number(g.percentage || 0), 0) / grades.length : 0;
  const gpa = (avgPct / 100 * 4).toFixed(2);
  const attendanceRate = stats?.attendanceRate ?? 0;

  const todayName = dayNames[new Date().getDay ? new Date().getDay() : 1] || 'Monday';
  const todaySlots = timetable.filter((s) => s.dayOfWeek === todayName).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

  return (
    <StudentLayout searchPlaceholder="Search...">
      {/* Hero */}
      <div className="rounded-2xl bg-slate-900 p-8 text-white shadow-sm">
        <h1 className="text-3xl font-black tracking-tight">Hello, {firstName}!</h1>
        <p className="mt-1 text-sm text-slate-300">Ready to tackle your studies? You're doing great!</p>
        <Link to="/student/academics" className="mt-5 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100">View Academics</Link>
      </div>

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

        {/* GPA + attendance */}
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current GPA</div>
            <div className="mx-auto mt-3 flex h-28 w-28 items-center justify-center rounded-full border-8 border-slate-900 text-3xl font-black text-slate-900">{gpa}</div>
            <div className="mt-3 text-xs text-slate-400">Based on {grades.length} graded item{grades.length === 1 ? '' : 's'}</div>
          </div>
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
    </StudentLayout>
  );
}
