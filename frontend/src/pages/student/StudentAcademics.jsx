import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import StudentLayout from '../../components/StudentLayout';
import { downloadTranscriptCsv } from '../../utils/studentDocuments';

const letterFor = (p) => (p >= 90 ? 'A+' : p >= 85 ? 'A' : p >= 80 ? 'A-' : p >= 75 ? 'B+' : p >= 70 ? 'B' : p >= 60 ? 'C' : 'D');

export default function StudentAcademics() {
  const [stats, setStats] = useState(null);
  const [timetable, setTimetable] = useState([]);

  useEffect(() => {
    axios.get('/stats/student/me').then((r) => setStats(r.data)).catch(() => {});
    axios.get('/timetables/student/me').then((r) => setTimetable(r.data?.timetable || [])).catch(() => {});
  }, []);

  const grades = stats?.grades || [];

  // Aggregate per-subject performance (average percentage).
  const subjects = useMemo(() => {
    const map = new Map();
    grades.forEach((g) => {
      const key = g.subject || 'Subject';
      const prev = map.get(key) || { name: key, total: 0, count: 0 };
      prev.total += Number(g.percentage || 0);
      prev.count += 1;
      map.set(key, prev);
    });
    return Array.from(map.values()).map((s) => ({ name: s.name, score: Math.round(s.total / s.count) }));
  }, [grades]);

  const avgPct = grades.length ? grades.reduce((s, g) => s + Number(g.percentage || 0), 0) / grades.length : 0;
  const gpa = (avgPct / 100 * 4).toFixed(2);

  const handleDownloadTranscript = () => {
    if (!stats) {
      toast.info('Academic records are still loading.');
      return;
    }

    downloadTranscriptCsv(stats);
    toast.success('Transcript exported.');
  };

  return (
    <StudentLayout searchPlaceholder="Search records...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Academic Performance</h1>
          <p className="text-sm text-slate-500">Student ID: {stats?.studentId || '—'} · {stats?.grade || ''}</p>
        </div>
        <button
          type="button"
          onClick={handleDownloadTranscript}
          disabled={!stats}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10l3-3 1.4 1.4L12 16.8 7.6 11.4 9 10l3 3V3zM4 19h16v2H4z" /></svg>
          Transcript
        </button>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cumulative GPA</div>
          <div className="mt-1 text-3xl font-black text-slate-900">{gpa}</div>
          <div className="mt-5 grid grid-cols-3 gap-4">
            <div><div className="text-xs font-semibold uppercase text-slate-400">Graded Items</div><div className="text-lg font-bold text-slate-900">{grades.length}</div></div>
            <div><div className="text-xs font-semibold uppercase text-slate-400">Avg Score</div><div className="text-lg font-bold text-slate-900">{avgPct.toFixed(0)}%</div></div>
            <div><div className="text-xs font-semibold uppercase text-slate-400">Status</div><div className="text-lg font-bold text-slate-900">{avgPct >= 85 ? 'Honors' : 'Active'}</div></div>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-8 border-white/80 text-2xl font-black">{Math.round(avgPct)}%</div>
          <div className="mt-3 text-center text-lg font-bold">Target Goal</div>
          <div className="text-center text-xs text-slate-400">Term performance average</div>
        </div>
      </div>

      {/* Subject performance */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Subject Performance</h2>
        <div className="space-y-4">
          {subjects.map((s) => (
            <div key={s.name} className="flex items-center gap-4 rounded-xl border border-slate-100 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm0 6h18v2H3v-2zm0 6h12v2H3v-2z" /></svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900">{s.name}</div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: `${s.score}%` }} /></div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold uppercase text-slate-400">Progress</div>
                <div className="font-bold text-slate-900">{s.score}%</div>
              </div>
              <div className="w-12 text-center">
                <div className="text-xs font-semibold uppercase text-slate-400">Grade</div>
                <div className="text-xl font-black text-slate-900">{letterFor(s.score)}</div>
              </div>
            </div>
          ))}
          {subjects.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No subject grades published yet.</p>}
        </div>
      </section>

      {/* Upcoming (from timetable) */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">This Week's Classes</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {timetable.slice(0, 6).map((s, i) => (
            <div key={s.id || i} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
              <div>
                <div className="font-bold text-slate-900">{s.subject?.name || s.class?.name}</div>
                <div className="text-xs text-slate-400">{s.dayOfWeek} · {s.startTime}–{s.endTime}{s.room ? ` · Room ${s.room}` : ''}</div>
              </div>
              <span className="text-xs font-semibold text-slate-400">{s.class?.name}</span>
            </div>
          ))}
          {timetable.length === 0 && <p className="py-6 text-center text-sm text-slate-400 sm:col-span-2">No timetable published yet.</p>}
        </div>
      </section>
    </StudentLayout>
  );
}
