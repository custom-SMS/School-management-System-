import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../../api/axios';
import TeacherLayout from '../../components/TeacherLayout';
import { toast } from 'react-toastify';
import { useBranch } from '../../context/BranchContext';

const CONDUCT_OPTIONS = ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'];
const PROMOTION_OPTIONS = ['Promoted', 'Conditional Promotion', 'Not Promoted', 'Pending'];

const statusBadge = (wf) => {
  const map = {
    Draft: 'bg-slate-100 text-slate-500',
    HomeroomReview: 'bg-amber-50 text-amber-700',
    BranchAdminReview: 'bg-blue-50 text-blue-700',
    AdminReview: 'bg-blue-50 text-blue-700',
    Published: 'bg-emerald-50 text-emerald-700',
  };
  return map[wf] || 'bg-slate-100 text-slate-500';
};

export default function HomeroomReportCards() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const classId = params.get('classId');
  const { activeSemester } = useBranch();

  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState(null);
  const [classes, setClasses] = useState([]);

  // Per-card editing state: { [rcId]: { homeroomRemarks, conductGrade, promotionStatus } }
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Selected cards for bulk submit
  const [selected, setSelected] = useState(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const yrs = await axios.get('/academic-years');
      const ay = (yrs.data || []).find((y) => y.isActive) || (yrs.data || [])[0];
      setActiveYear(ay || null);
      // Fetch classes details
      const statsRes = await axios.get('/stats/teacher/me');
      const classSummaries = statsRes.data?.classSummaries || [];
      setClasses(classSummaries);

      if (!classId || !ay) { setReportCards([]); return; }
      const semParam = activeSemester?.id ? `?semesterId=${activeSemester.id}` : '';
      const res = await axios.get(`/report-cards/class/${classId}/${ay.id}${semParam}`);
      const cards = res.data || [];
      setReportCards(cards);
      // Seed edits from existing data
      const initial = {};
      cards.forEach((rc) => {
        initial[rc.id] = {
          homeroomRemarks: rc.homeroomRemarks || '',
          conductGrade: rc.conductGrade || '',
          promotionStatus: rc.promotionStatus || 'Pending',
        };
      });
      setEdits(initial);
    } catch {
      toast.error('Failed to load report cards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [classId]);

  const setEdit = (rcId, field, value) => {
    setEdits((prev) => ({ ...prev, [rcId]: { ...prev[rcId], [field]: value } }));
  };

  const handleSaveOne = async (rcId) => {
    setSavingId(rcId);
    try {
      await axios.patch(`/report-cards/${rcId}/homeroom-review`, edits[rcId] || {});
      toast.success('Saved.');
      // Update local card
      setReportCards((prev) => prev.map((rc) =>
        rc.id === rcId ? { ...rc, ...edits[rcId] } : rc
      ));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSavingId(null);
    }
  };

  const handleSubmitToAdmin = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) { toast.error('Select at least one student.'); return; }
    setSubmitting(true);
    try {
      await axios.post('/report-cards/submit-to-admin', { reportCardIds: ids });
      toast.success(`${ids.length} report card(s) submitted to Admin.`);
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

  // Stats
  const stats = useMemo(() => ({
    total: reportCards.length,
    reviewed: reportCards.filter((rc) => rc.workflowStatus === 'BranchAdminReview' || rc.workflowStatus === 'AdminReview' || rc.workflowStatus === 'Published').length,
    draft: reportCards.filter((rc) => rc.workflowStatus === 'Draft').length,
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
          Class Report Cards{activeClass ? `: ${activeClass.className}${activeClass.stream ? ` (${activeClass.stream})` : ''}` : ''}
        </h1>
        <p className="text-sm text-slate-500">
          Academic Year: <span className="font-semibold">{activeYear?.year || '—'}</span>
          {' · '}Review each student, add remarks and conduct grade, then submit to Admin.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: 'Total Students', value: stats.total },
          { label: 'Submitted to Admin', value: stats.reviewed, color: 'text-blue-700' },
          { label: 'Pending Review', value: stats.draft, color: 'text-amber-700' },
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
            {selected.size > 0 ? `${selected.size} selected` : 'Select students to submit'}
          </span>
          <button
            onClick={handleSubmitToAdmin}
            disabled={submitting || selected.size === 0}
            className="ml-auto rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            {submitting ? 'Submitting…' : `Submit ${selected.size > 0 ? selected.size : ''} to Admin`}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <div className="mr-3 h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
          Loading report cards…
        </div>
      ) : reportCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
          No report cards found. Ask Admin to compile report cards first.
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

          {reportCards.map((rc) => {
            const edit = edits[rc.id] || {};
            const isDirty =
              edit.homeroomRemarks !== (rc.homeroomRemarks || '') ||
              edit.conductGrade !== (rc.conductGrade || '') ||
              edit.promotionStatus !== (rc.promotionStatus || 'Pending');

            return (
              <div
                key={rc.id}
                className={`rounded-2xl border bg-white shadow-sm transition ${selected.has(rc.id) ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'
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
                      <div className="text-xs text-slate-400">{rc.student?.studentId || '—'} · Grade {rc.grade}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadge(rc.workflowStatus)}`}>
                      {rc.workflowStatus || 'Draft'}
                    </span>
                    {isDirty && (
                      <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-bold text-orange-600">
                        Unsaved
                      </span>
                    )}
                  </div>
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

                {/* Review inputs */}
                <div className="grid grid-cols-1 gap-3 border-t border-slate-50 px-5 py-4 sm:grid-cols-3">
                  {/* Conduct */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Conduct Grade</label>
                    <select
                      value={edit.conductGrade || ''}
                      onChange={(e) => setEdit(rc.id, 'conductGrade', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300 focus:bg-white"
                    >
                      <option value="">— Select —</option>
                      {CONDUCT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  {/* Promotion */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Promotion Status</label>
                    <select
                      value={edit.promotionStatus || 'Pending'}
                      onChange={(e) => setEdit(rc.id, 'promotionStatus', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300 focus:bg-white"
                    >
                      {PROMOTION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  {/* Save button */}
                  <div className="flex items-end">
                    <button
                      onClick={() => handleSaveOne(rc.id)}
                      disabled={savingId === rc.id || !isDirty}
                      className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-40"
                    >
                      {savingId === rc.id ? 'Saving…' : 'Save'}
                    </button>
                  </div>

                  {/* Remarks — full width */}
                  <div className="sm:col-span-3">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Homeroom Remarks</label>
                    <textarea
                      rows={2}
                      value={edit.homeroomRemarks || ''}
                      onChange={(e) => setEdit(rc.id, 'homeroomRemarks', e.target.value)}
                      placeholder="Optional remarks about the student's overall performance, behaviour, goals…"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </TeacherLayout>
  );
}
