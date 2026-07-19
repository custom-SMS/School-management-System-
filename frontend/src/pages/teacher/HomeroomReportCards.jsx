import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../../api/axios';
import TeacherLayout from '../../components/TeacherLayout';
import { toast } from 'react-toastify';
import { useBranch } from '../../hooks/useBranch';

const statusBadge = (wf) => {
  const map = {
    Draft: 'bg-slate-100 text-slate-500',
    HomeroomReview: 'bg-amber-50 text-amber-700 border border-amber-200',
    BranchAdminReview: 'bg-blue-50 text-blue-700 border border-blue-200',
    AdminReview: 'bg-blue-50 text-blue-700 border border-blue-200',
    Published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };
  return map[wf] || 'bg-slate-100 text-slate-500';
};

/**
 * HomeroomReportCards — READ-ONLY view of compiled report cards for a class.
 *
 * Conduct, promotion, and remarks editing now live in HomeroomGradeReview.
 * This page is for reviewing the final compiled results after Admin has run
 * the compile step, and for submitting approved cards to Branch Admin.
 */
export default function HomeroomReportCards() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const classId = params.get('classId');
  const { activeSemester } = useBranch();

  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState(null);
  const [classes, setClasses] = useState([]);

  // Selected cards for bulk submit
  const [selected, setSelected] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const yrs = await axios.get('/academic-years');
      const ay = (yrs.data || []).find((y) => y.isActive) || (yrs.data || [])[0] || null;
      setActiveYear(ay);

      const statsRes = await axios.get('/stats/teacher/me');
      setClasses(statsRes.data?.classSummaries || []);

      if (!classId || !ay) { setReportCards([]); return; }
      const semParam = activeSemester?.id ? `?semesterId=${activeSemester.id}` : '';
      const res = await axios.get(`/report-cards/class/${classId}/${ay.id}${semParam}`);
      setReportCards(res.data || []);
    } catch {
      toast.error('Failed to load compiled report cards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [classId, activeSemester]);

  const handleSubmitToAdmin = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) { toast.error('Select at least one report card.'); return; }
    setSubmitting(true);
    try {
      await axios.post('/report-cards/submit-to-admin', { reportCardIds: ids });
      toast.success(`${ids.length} report card(s) submitted to Branch Admin.`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === reportCards.length) setSelected(new Set());
    else setSelected(new Set(reportCards.map((rc) => rc.id)));
  };

  const stats = useMemo(() => ({
    total: reportCards.length,
    submitted: reportCards.filter((rc) =>
      ['BranchAdminReview', 'AdminReview', 'Published'].includes(rc.workflowStatus)
    ).length,
    pending: reportCards.filter((rc) => rc.workflowStatus === 'Draft' || rc.workflowStatus === 'HomeroomReview').length,
  }), [reportCards]);

  const activeClass = classes.find((c) => c.classId === classId);

  return (
    <TeacherLayout searchPlaceholder="Search students...">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
          Back
        </button>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Compiled Report Cards{activeClass ? `: ${activeClass.className}${activeClass.stream ? ` (${activeClass.stream})` : ''}` : ''}
        </h1>
        <p className="text-sm text-slate-500">
          Academic Year: <span className="font-semibold">{activeYear?.year || '—'}</span>
          {' · '}Read-only view of report cards compiled by Admin. Use "Review Grades" to edit conduct &amp; remarks.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: 'Total Students', value: stats.total },
          { label: 'Submitted to Admin', value: stats.submitted, color: 'text-blue-700' },
          { label: 'Pending Submission', value: stats.pending, color: 'text-amber-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`mt-1 text-2xl font-black ${s.color || 'text-slate-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Bulk actions */}
      {reportCards.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {selected.size > 0 ? `${selected.size} selected` : 'Select report cards to submit to Branch Admin'}
          </span>
          <button
            onClick={handleSubmitToAdmin}
            disabled={submitting || selected.size === 0}
            className="ml-auto rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            {submitting ? 'Submitting…' : `Submit ${selected.size > 0 ? selected.size : ''} to Branch Admin`}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <div className="mr-3 h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
          Loading compiled report cards…
        </div>
      ) : reportCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-400">No compiled report cards found.</p>
          <p className="mt-2 text-sm text-slate-400">
            Ask Admin to compile report cards. Use the <strong>Review Grades</strong> page to approve grades and add conduct remarks first.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select all header */}
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              checked={selected.size === reportCards.length && reportCards.length > 0}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Select All
            </span>
          </div>

          {reportCards.map((rc) => (
            <div
              key={rc.id}
              className={`rounded-2xl border bg-white shadow-sm transition ${
                selected.has(rc.id) ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'
              }`}
            >
              {/* Card header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(rc.id)}
                    onChange={() => toggleSelect(rc.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <div>
                    <div className="font-bold text-slate-900">
                      {rc.student?.user?.name || 'Unknown'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {rc.student?.studentId || '—'} · Grade {rc.grade}
                    </div>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadge(rc.workflowStatus)}`}>
                  {rc.workflowStatus || 'Draft'}
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Avg Score</div>
                  <div className="mt-1 text-lg font-black text-slate-900">{rc.averageScore}%</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attendance</div>
                  <div className="mt-1 text-lg font-black text-slate-900">{rc.attendancePercentage}%</div>
                  <div className="text-[10px] text-slate-400">
                    P:{rc.attendancePresent} A:{rc.attendanceAbsent} L:{rc.attendanceLate}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</div>
                  <div className={`mt-1 text-sm font-bold ${rc.status === 'Pass' ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {rc.status}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rank</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {rc.rank ? `#${rc.rank}` : '—'}
                  </div>
                </div>
              </div>

              {/* Read-only conduct summary (if set) */}
              {(rc.conductGrade || rc.promotionStatus || rc.homeroomRemarks) && (
                <div className="grid grid-cols-1 gap-2 border-t border-slate-50 px-5 py-3 sm:grid-cols-3 text-sm">
                  {rc.conductGrade && (
                    <div>
                      <span className="text-xs font-semibold uppercase text-slate-400 block mb-0.5">Conduct</span>
                      <span className="font-medium text-slate-800">{rc.conductGrade}</span>
                    </div>
                  )}
                  {rc.promotionStatus && (
                    <div>
                      <span className="text-xs font-semibold uppercase text-slate-400 block mb-0.5">Promotion</span>
                      <span className="font-medium text-slate-800">{rc.promotionStatus}</span>
                    </div>
                  )}
                  {rc.homeroomRemarks && (
                    <div className="sm:col-span-3">
                      <span className="text-xs font-semibold uppercase text-slate-400 block mb-0.5">Homeroom Remarks</span>
                      <span className="text-slate-700 italic">{rc.homeroomRemarks}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </TeacherLayout>
  );
}
