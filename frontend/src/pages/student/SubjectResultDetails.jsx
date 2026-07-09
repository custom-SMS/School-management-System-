import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../../api/axios';
import StudentLayout from '../../components/StudentLayout';
import { toast } from 'react-toastify';
import { usePublicSettings } from '../../context/SettingsContext';

const DEFAULT_PASS_MARK = 50;

export default function SubjectResultDetails() {
  const { subjectKey } = useParams();
  const { grading } = usePublicSettings();
  const passMark = grading?.passMark ?? DEFAULT_PASS_MARK;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((isRefresh = false) => {
    if (!subjectKey) return;
    if (isRefresh) setRefreshing(true);
    setError(false);

    // Use the dedicated subject-results endpoint — already recalculates from raw marks
    axios.get(`/students/me/subjects/${encodeURIComponent(subjectKey)}/results`)
      .then((r) => {
        const { subject, assessments, summary } = r.data;

        // assessments from backend already have score=contribution, max=weight, percentage
        // Map them for display — show null score/percentage as — in the table
        setData({
          subject: {
            name: subject?.name,
            courseCode: subject?.courseCode,
            className: subject?.className,
          },
          assessments: (assessments || []).map((a) => ({
            id: a.id || a.type,
            name: a.name,
            score: a.score != null ? a.score : null,
            max: a.max,
            percentage: a.percentage != null ? a.percentage : null,
            date: a.date || a.recordedAt,
          })),
          summary: {
            totalMarks: summary?.totalMarks ?? null,
            percentage: summary?.percentage ?? null,
            maxTotal: summary?.maxTotal ?? 100,
            assessmentsCount: summary?.assessmentsCount ?? 0,
            updatedAt: summary?.updatedAt,
          },
        });
        if (isRefresh) toast.success('Grades refreshed successfully');
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          // No grades recorded yet — show empty state, not error
          const decoded = decodeURIComponent(subjectKey || '');
          setData({
            subject: { name: decoded },
            assessments: [],
            summary: {},
          });
        } else {
          setError(true);
          toast.error('Failed to load grades');
        }
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [subjectKey]);

  useEffect(() => { load(false); }, [load]);

  // Re-fetch when the tab regains focus so teacher updates appear immediately
  useEffect(() => {
    const onFocus = () => load(false);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  const subject = data?.subject || {};
  const assessments = data?.assessments || [];
  const summary = data?.summary || {};
  const totalMarks = summary.totalMarks;
  const percentage = summary.percentage;
  const passStatus = percentage != null ? (percentage >= passMark ? 'Pass' : 'Fail') : '—';

  return (
    <StudentLayout searchPlaceholder="Search records...">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            {subject.name || decodeURIComponent(subjectKey || 'Subject')}
          </h1>
          <p className="text-sm text-slate-500">
            Course Code: {subject.courseCode || '—'}
            {subject.className ? ` · ${subject.className}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <svg className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link to="/student/academics" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
            Back to Subjects
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex flex-col items-center py-20 text-slate-400">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
          Loading subject results…
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
          <p className="text-lg font-bold text-rose-700">Could not load subject results</p>
          <button onClick={() => load(false)} className="mt-4 rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-rose-700">
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Assessment Results Table */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Assessment Results</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-3 pr-4 font-semibold">Assessment</th>
                    <th className="py-3 pr-4 font-semibold">Score</th>
                    <th className="py-3 pr-4 font-semibold">Max</th>
                    <th className="py-3 pr-4 font-semibold">Percentage</th>
                    <th className="py-3 pr-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assessments.length > 0 ? (
                    assessments.map((r) => (
                      <tr key={r.id} className="text-slate-700">
                        <td className="py-3 pr-4 font-semibold">{r.name}</td>
                        <td className="py-3 pr-4">
                          {r.score != null
                            ? Number(r.score).toFixed(2)
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-3 pr-4">{r.max}</td>
                        <td className="py-3 pr-4">
                          {r.percentage != null
                            ? Number(r.percentage).toFixed(2) + '%'
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-400">
                          {r.date ? new Date(r.date).toLocaleDateString() : ''}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-sm text-slate-400">
                        No results published for this subject yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Summary */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Summary</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Total Marks</div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {totalMarks != null
                    ? `${Number(totalMarks).toFixed(2)} / ${summary.maxTotal ?? 100}`
                    : '—'}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Overall Percentage</div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {percentage != null ? `${Number(percentage).toFixed(2)}%` : '—'}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Assessments</div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {summary.assessmentsCount ?? 0}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Pass Status</div>
                <div className="mt-2 text-lg font-bold text-slate-900">{passStatus}</div>
              </div>
            </div>
            {summary.updatedAt && (
              <p className="mt-4 text-xs text-slate-400">
                Last updated: {new Date(summary.updatedAt).toLocaleString()}
              </p>
            )}
          </section>
        </div>
      )}
    </StudentLayout>
  );
}
