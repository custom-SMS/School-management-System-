import { useEffect, useMemo, useState } from 'react';
import { showPromptDialog } from '../../utils/sweetAlert';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import StudentLayout from '../../components/StudentLayout';
import { downloadStudentReportPdf, downloadTranscriptCsv } from '../../utils/studentDocuments';

function FetchError({ onRetry }) {
  return (
    <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <svg className="mx-auto mb-3 h-10 w-10 text-rose-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-5h2v2h-2zm0-8h2v6h-2z" />
      </svg>
      <p className="text-lg font-bold text-rose-700">Could not load report data</p>
      <p className="mt-1 text-sm text-rose-500">The server may be unavailable or you may be offline.</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-rose-700">Retry</button>
    </div>
  );
}

export default function StudentReports() {
  const [stats, setStats] = useState(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
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
    const p2 = axios.get('/settings/public')
      .then((r) => setGradingSettings(r.data?.grading || { gpaEnabled: false, passMark: 50 }))
      .catch(() => {});
    Promise.all([p1, p2]).finally(() => {
      if (!statsOk) setError(true);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const grades = stats?.grades || [];
  const avgPct = grades.length ? grades.reduce((s, g) => s + Number(g.percentage || 0), 0) / grades.length : 0;
  const gpa = (avgPct / 100 * 4).toFixed(2);
  const passStatus = avgPct >= gradingSettings.passMark ? 'Pass' : 'Fail';

  const history = useMemo(() => {
    return grades.slice(0, 6).map((g, i) => ({
      term: g.subject || `Record ${i + 1}`,
      level: stats?.grade || '—',
      gpa: gradingSettings.gpaEnabled ? (Number(g.percentage || 0) / 100 * 4).toFixed(2) : `${Number(g.percentage || 0).toFixed(0)}%`,
      status: Number(g.percentage || 0) >= gradingSettings.passMark ? 'PASSED' : 'REVIEW',
    }));
  }, [grades, stats, gradingSettings]);

  const progression = useMemo(() => {
    const vals = grades.slice(-4).map((g) => Number(g.percentage || 0));
    while (vals.length < 4) vals.unshift(Math.max(40, avgPct - 8));
    return vals;
  }, [grades, avgPct]);

  const handleExportTranscript = () => {
    if (!stats) { toast.info('Academic records are still loading.'); return; }
    downloadTranscriptCsv(stats, gradingSettings);
    toast.success('Transcript exported.');
  };

  const handleDownloadPdf = () => {
    if (!stats) { toast.info('Academic report is still loading.'); return; }
    downloadStudentReportPdf(stats, gradingSettings);
    toast.success('PDF downloaded.');
  };

  const handleSubmitRequest = async () => {
    const { value: reason } = await showPromptDialog({
      title: 'Request a review',
      input: 'textarea',
      inputPlaceholder: 'Describe what you want reviewed in your academic record',
    });
    if (!reason?.trim()) return;
    setSubmittingRequest(true);
    try {
      const res = await axios.post('/notifications/student-request', { reason: reason.trim() });
      toast.success(res.data?.message || 'Request submitted.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <StudentLayout searchPlaceholder="Search records...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Student Reports</h1>
          <p className="text-sm text-slate-500">View, track, and download official academic records.</p>
        </div>
        <button
          type="button"
          onClick={handleExportTranscript}
          disabled={!stats || error}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10l3-3 1.4 1.4L12 16.8 7.6 11.4 9 10l3 3V3zM4 19h16v2H4z" /></svg>
          Export Transcript
        </button>
      </div>

      {loading ? (
        <div className="mt-6 flex flex-col items-center py-20 text-slate-400">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
          Loading report data…
        </div>
      ) : error ? (
        <FetchError onRetry={load} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
            {/* Official report card hero */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="inline-block rounded-md bg-slate-900 px-3 py-1 text-xs font-bold text-white">OFFICIAL RELEASE</span>
              <h2 className="mt-3 text-2xl font-black text-slate-900">Academic Performance Report</h2>
              <div className="mt-5 flex flex-wrap gap-10 border-t border-slate-100 pt-5">
                {gradingSettings.gpaEnabled && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cumulative GPA</div>
                    <div className="text-3xl font-black text-slate-900">{gpa}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Average Score</div>
                  <div className="text-3xl font-black text-slate-900">{avgPct.toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</div>
                  <div className={`text-3xl font-black ${passStatus === 'Pass' ? 'text-emerald-600' : 'text-rose-600'}`}>{passStatus}</div>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={handleDownloadPdf} disabled={!stats} className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" /></svg>
                  View Detailed Report
                </button>
                <button type="button" onClick={handleDownloadPdf} disabled={!stats} className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50">Download PDF</button>
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
                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  disabled={submittingRequest}
                  className="mt-4 w-full rounded-xl bg-white py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60"
                >
                  {submittingRequest ? 'Submitting...' : 'Submit Request'}
                </button>
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
                    <th className="py-3 pr-4 text-right font-semibold">{gradingSettings.gpaEnabled ? 'GPA' : 'Score'}</th>
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
        </>
      )}
    </StudentLayout>
  );
}
