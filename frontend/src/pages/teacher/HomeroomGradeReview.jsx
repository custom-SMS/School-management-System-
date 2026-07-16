import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../../api/axios';
import TeacherLayout from '../../components/TeacherLayout';
import { toast } from 'react-toastify';
import { useBranch } from '../../context/BranchContext';

const statusBadge = (status) => {
  const map = {
    Draft: 'bg-slate-100 text-slate-500',
    SubmittedToHomeroom: 'bg-amber-50 text-amber-700',
    ApprovedByHomeroom: 'bg-emerald-50 text-emerald-700',
  };
  return map[status] || 'bg-slate-100 text-slate-500';
};

export default function HomeroomGradeReview() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const classId = params.get('classId');
  const { activeSemester } = useBranch();

  const [submittedGrades, setSubmittedGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [approving, setApproving] = useState(false);

  // Selected grades for bulk approve
  const [selected, setSelected] = useState(new Set());

  const load = async () => {
    setLoading(true);
    try {
      // Fetch classes details
      const statsRes = await axios.get('/stats/teacher/me');
      const classSummaries = statsRes.data?.classSummaries || [];
      setClasses(classSummaries);

      if (!classId) { setSubmittedGrades([]); return; }
      
      const semParam = activeSemester?.id ? `?semesterId=${activeSemester.id}` : '';
      const res = await axios.get(`/classroom/grades/submitted/${classId}${semParam}`);
      setSubmittedGrades(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load submitted grades.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [classId, activeSemester]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === submittedGrades.length) setSelected(new Set());
    else setSelected(new Set(submittedGrades.map((g) => g.id)));
  };

  const handleApprove = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) { toast.error('Select at least one grade to approve.'); return; }
    setApproving(true);
    try {
      await axios.post('/classroom/grades/approve', { gradeIds: ids });
      toast.success(`${ids.length} grade(s) approved successfully.`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve grades.');
    } finally {
      setApproving(false);
    }
  };

  // Group grades by subject
  const groupedGrades = useMemo(() => {
    const groups = {};
    submittedGrades.forEach((grade) => {
      const subject = grade.subject || 'General';
      if (!groups[subject]) groups[subject] = [];
      groups[subject].push(grade);
    });
    return groups;
  }, [submittedGrades]);

  const activeClass = classes.find((c) => c.classId === classId);

  return (
    <TeacherLayout searchPlaceholder="Search grades...">
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
          Grade Review{activeClass ? `: ${activeClass.className}${activeClass.stream ? ` (${activeClass.stream})` : ''}` : ''}
        </h1>
        <p className="text-sm text-slate-500">
          Review and approve grades submitted by subject teachers.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: 'Total Submitted', value: submittedGrades.length },
          { label: 'Selected', value: selected.size, color: 'text-indigo-700' },
          { label: 'Pending Review', value: submittedGrades.length, color: 'text-amber-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`mt-1 text-2xl font-black ${s.color || 'text-slate-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Bulk actions */}
      {submittedGrades.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {selected.size > 0 ? `${selected.size} selected` : 'Select grades to approve'}
          </span>
          <button
            onClick={handleApprove}
            disabled={approving || selected.size === 0}
            className="ml-auto rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-40"
          >
            {approving ? 'Approving…' : `Approve ${selected.size > 0 ? selected.size : ''} Selected`}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <div className="mr-3 h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
          Loading submitted grades…
        </div>
      ) : submittedGrades.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
          No submitted grades found. Subject teachers need to submit grades for your review.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Select all header */}
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              checked={selected.size === submittedGrades.length && submittedGrades.length > 0}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Select All
            </span>
          </div>

          {/* Group by subject */}
          {Object.entries(groupedGrades).map(([subject, grades]) => (
            <div key={subject} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <h3 className="font-bold text-slate-900">{subject}</h3>
                <p className="text-xs text-slate-400">{grades.length} grade(s) submitted</p>
              </div>
              <div className="divide-y divide-slate-50">
                {grades.map((grade) => (
                  <div
                    key={grade.id}
                    className={`flex items-center gap-4 px-5 py-4 transition ${selected.has(grade.id) ? 'bg-indigo-50' : 'hover:bg-slate-50'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(grade.id)}
                      onChange={() => toggleSelect(grade.id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">
                        {grade.student?.user?.name || 'Unknown'}
                      </div>
                      <div className="text-xs text-slate-400">{grade.student?.studentId || '—'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{grade.percentage?.toFixed(1) || 0}%</div>
                      <div className="text-xs text-slate-400">
                        Q: {grade.quiz?.toFixed(1) || 0} · A: {grade.assignment?.toFixed(1) || 0} · M: {grade.midterm?.toFixed(1) || 0} · F: {grade.final?.toFixed(1) || 0}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadge(grade.submissionStatus)}`}>
                      {grade.submissionStatus || 'Draft'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </TeacherLayout>
  );
}
