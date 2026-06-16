import { useEffect, useMemo, useState } from 'react';
import axios from '../../api/axios';
import StudentLayout from '../../components/StudentLayout';

export default function StudentReports() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get('/stats/student/me').then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const grades = stats?.grades || [];
  const avgPct = grades.length ? grades.reduce((s, g) => s + Number(g.percentage || 0), 0) / grades.length : 0;
  const gpa = (avgPct / 100 * 4).toFixed(2);

  // Group grades into a term-ish history by subject for a simple academic record.
  const history = useMemo(() => {
    return grades.slice(0, 6).map((g, i) => ({
      term: g.subject || `Record ${i + 1}`,
      level: stats?.grade || '—',
      gpa: (Number(g.percentage || 0) / 100 * 4).toFixed(2),
      status: Number(g.percentage || 0) >= 50 ? 'PASSED' : 'REVIEW',
    }));
  }, [grades, stats]);

  // Representative GPA progression bars (last 4 buckets) from real averages where available.
  const progression = useMemo(() => {
    const vals = grades.slice(-4).map((g) => Number(g.percentage || 0));
    while (vals.length < 4) vals.unshift(Math.max(40, avgPct - 8));
    return vals;
  }, [grades, avgPct]);

  return (
    <StudentLayout searchPlaceholder="Search records...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Student Reports</h1>
          <p className="text-sm text-slate-500">View, track, and download official academic records.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10l3-3 1.4 1.4L12 16.8 7.6 11.4 9 10l3 3V3zM4 19h16v2H4z" /></svg>
          Export Transcript
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        {/* Official report card hero */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="inline-block rounded-md bg-slate-900 px-3 py-1 text-xs font-bold text-white">OFFICIAL RELEASE</span>
          <h2 className="mt-3 text-2xl font-black text-slate-900">Academic Performance Report</h2>
          <div className="mt-5 flex flex-wrap gap-10 border-t border-slate-100 pt-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cumulative GPA</div>
              <div className="text-3xl font-black text-slate-900">{gpa}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Average Score</div>
              <div className="text-3xl font-black text-slate-900">{avgPct.toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</div>
              <div className="text-3xl font-black text-slate-900">{avgPct >= 85 ? 'Honors' : 'Active'}</div>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" /></svg>
              View Detailed Report
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700">Download PDF</button>
          </div>
        </section>

        {/* Performance insights */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Performance Insights</h3>
            <div className="mt-5 flex h-32 items-end gap-3">
              {progression.map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full items-end justify-center" style={{ height: '100%' }}>
                    <div className="w-full max-w-10 rounded-t-lg bg-slate-900" style={{ height: `${Math.max(8, v)}%`, opacity: 0.35 + i * 0.18 }} />
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">#{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="font-semibold text-slate-600">Trend</span>
              <span className="font-bold text-emerald-600">↗ improving</span>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
            <h3 className="text-lg font-bold">Request Re-evaluation</h3>
            <p className="mt-1 text-sm text-slate-400">Discrepancy in your marks? Open a formal review ticket.</p>
            <button className="mt-4 w-full rounded-xl bg-white py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100">Submit Request</button>
          </div>
        </aside>
      </div>

      {/* Academic history */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Academic History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-3 pr-4 font-semibold">Subject / Record</th>
                <th className="py-3 pr-4 font-semibold">Grade Level</th>
                <th className="py-3 pr-4 text-right font-semibold">GPA</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((h, i) => (
                <tr key={i} className="text-slate-700">
                  <td className="py-4 pr-4 font-bold text-slate-900">{h.term}</td>
                  <td className="py-4 pr-4">{h.level}</td>
                  <td className="py-4 pr-4 text-right font-bold text-slate-900">{h.gpa}</td>
                  <td className="py-4 pr-4"><span className={`rounded-md px-2.5 py-1 text-xs font-bold ${h.status === 'PASSED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{h.status}</span></td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan="4" className="py-8 text-center text-slate-400">No published records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </StudentLayout>
  );
}
