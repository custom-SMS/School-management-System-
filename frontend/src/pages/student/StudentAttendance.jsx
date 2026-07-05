import { useEffect, useMemo, useState } from 'react';
import axios from '../../api/axios';
import StudentLayout from '../../components/StudentLayout';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function FetchError({ onRetry }) {
  return (
    <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <svg className="mx-auto mb-3 h-10 w-10 text-rose-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-5h2v2h-2zm0-8h2v6h-2z" />
      </svg>
      <p className="text-lg font-bold text-rose-700">Could not load attendance data</p>
      <p className="mt-1 text-sm text-rose-500">The server may be unavailable or you may be offline.</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-rose-700">Retry</button>
    </div>
  );
}

export default function StudentAttendance() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    axios.get('/stats/student/me')
      .then((r) => setStats(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const bd = stats?.attendanceBreakdown || {};
  const present = bd.presentCount ?? 0;
  const absent = bd.absentCount ?? 0;
  const late = bd.lateCount ?? 0;
  const totalSessions = bd.totalSessions ?? present + absent + late;
  const rate = stats?.attendanceRate ?? 0;

  const statusByDate = useMemo(() => {
    const map = {};
    (stats?.attendance || []).forEach((a) => {
      const d = a.date ? new Date(a.date) : null;
      if (d) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        map[`${year}-${month}-${day}`] = a.status || a.records?.[0]?.status;
      }
    });
    return map;
  }, [stats]);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const tone = (status) => {
    if (status === 'Present') return 'bg-emerald-100 text-emerald-700';
    if (status === 'Absent') return 'bg-rose-100 text-rose-700';
    if (status === 'Late') return 'bg-amber-100 text-amber-700';
    return 'text-slate-600';
  };

  const recent = (stats?.attendance || []).filter((a) => a.status !== 'Present').slice(0, 5);

  return (
    <StudentLayout searchPlaceholder="Search records...">
      <h1 className="text-3xl font-black tracking-tight text-slate-900">Student Attendance Record</h1>
      <p className="text-sm text-slate-500">Track your presence, absences, and patterns.</p>

      {loading ? (
        <div className="mt-6 flex flex-col items-center py-20 text-slate-400">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
          Loading attendance data…
        </div>
      ) : error ? (
        <FetchError onRetry={load} />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.6fr]">
            {/* Left: rate + breakdown */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Overall Attendance Rate</div>
                <div className="mt-1 text-4xl font-black text-slate-900">{rate}%</div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${rate >= 85 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${rate}%` }} />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-xs font-semibold uppercase text-slate-400">Present</div><div className="text-lg font-black text-slate-900">{present}</div></div>
                  <div><div className="text-xs font-semibold uppercase text-slate-400">Absent</div><div className="text-lg font-black text-rose-600">{absent}</div></div>
                  <div><div className="text-xs font-semibold uppercase text-slate-400">Late</div><div className="text-lg font-black text-amber-600">{late}</div></div>
                </div>
              </div>

              {rate < 85 && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                  <div className="flex items-center gap-2 font-bold text-rose-700"><span>⚠</span> Low Attendance Alert</div>
                  <p className="mt-1 text-sm text-rose-600">Your attendance has dropped below the 85% institutional threshold. Please review immediate actions.</p>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Summary</div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="font-semibold text-slate-600">Total Sessions</span><span className="font-bold text-slate-900">{totalSessions}</span></div>
                  <div className="flex items-center justify-between"><span className="font-semibold text-slate-600">Recorded</span><span className="font-bold text-slate-900">{bd.recordedCount ?? present + absent + late}</span></div>
                </div>
              </div>
            </div>

            {/* Right: calendar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">{today.toLocaleString('en-US', { month: 'long' })} {year}</h2>
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-emerald-400" /> Present</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-rose-400" /> Absent</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-amber-400" /> Late</span>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {WEEKDAYS.map((d) => <div key={d} className="text-center text-xs font-bold uppercase text-slate-400">{d}</div>)}
                {cells.map((day, i) => {
                  if (!day) return <div key={`e${i}`} />;
                  const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const status = statusByDate[key];
                  const isToday = day === today.getDate();
                  return (
                    <div key={day} className={`flex h-14 flex-col items-center justify-center rounded-lg text-sm font-bold ${tone(status)} ${isToday ? 'ring-2 ring-slate-900' : ''}`}>
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent absences */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Recent Absences &amp; Late Arrivals</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-3 pr-4 font-semibold">Date</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent.map((a, i) => (
                    <tr key={i} className="text-slate-700">
                      <td className="py-3 pr-4 font-semibold text-slate-900">{a.date ? new Date(a.date).toLocaleDateString() : '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${a.status === 'Absent' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{(a.status || 'Absent').toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                  {recent.length === 0 && <tr><td colSpan="2" className="py-8 text-center font-semibold text-emerald-600">✅ No recent absences — perfect record!</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </StudentLayout>
  );
}
