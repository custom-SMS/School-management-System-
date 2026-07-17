import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../../api/axios';
import TeacherLayout from '../../components/TeacherLayout';
import { toast } from 'react-toastify';
import { useBranch } from '../../context/BranchContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const CONDUCT_OPTIONS = ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'];
const PROMOTION_OPTIONS = ['Pending', 'Promoted', 'Conditional Promotion', 'Not Promoted'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const gradeStatusBadge = (status) => {
  const map = {
    Draft: 'bg-slate-100 text-slate-500',
    SubmittedToHomeroom: 'bg-amber-50 text-amber-700 border border-amber-200',
    ApprovedByHomeroom: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };
  return map[status] || 'bg-slate-100 text-slate-500';
};

const rcStatusBadge = (wf) => {
  const map = {
    Draft: 'bg-slate-100 text-slate-500',
    HomeroomReview: 'bg-amber-50 text-amber-700 border border-amber-200',
    BranchAdminReview: 'bg-blue-50 text-blue-700 border border-blue-200',
    AdminReview: 'bg-blue-50 text-blue-700 border border-blue-200',
    Published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };
  return map[wf] || 'bg-slate-100 text-slate-500';
};

// ─── Collapsible student row ──────────────────────────────────────────────────
function StudentCard({ studentId, studentMap, edit, onEditChange, onApproveAndSave, isSaving }) {
  const [open, setOpen] = useState(false);
  const { student, grades = [], rc } = studentMap[studentId] || {};

  const pendingGrades = grades.filter((g) => g.submissionStatus === 'SubmittedToHomeroom');
  const approvedGrades = grades.filter((g) => g.submissionStatus === 'ApprovedByHomeroom');

  const isDirty =
    pendingGrades.length > 0 ||
    (edit?.conductGrade || '') !== (rc?.conductGrade || '') ||
    (edit?.promotionStatus || 'Pending') !== (rc?.promotionStatus || 'Pending') ||
    (edit?.homeroomRemarks || '') !== (rc?.homeroomRemarks || '');

  const rcStatus = rc?.workflowStatus || null;

  // Group grades by subject
  const gradesBySubject = grades.reduce((acc, g) => {
    const subj = g.subject || 'General';
    if (!acc[subj]) acc[subj] = [];
    acc[subj].push(g);
    return acc;
  }, {});

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm transition-all ${
        rcStatus === 'BranchAdminReview' || rcStatus === 'Published'
          ? 'border-emerald-200'
          : 'border-slate-200'
      }`}
    >
      {/* ── Clickable header row ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-slate-50 rounded-2xl"
      >
        {/* Left: avatar + name + ID */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
            {(student?.user?.name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 truncate">{student?.user?.name || 'Unknown'}</div>
            <div className="text-xs text-slate-400">ID: {student?.studentId || '—'}</div>
          </div>
        </div>

        {/* Right: status badges + chevron */}
        <div className="flex flex-shrink-0 items-center gap-2 ml-3">
          {pendingGrades.length > 0 && (
            <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
              {pendingGrades.length} pending
            </span>
          )}
          {approvedGrades.length > 0 && pendingGrades.length === 0 && (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              ✓ {approvedGrades.length} approved
            </span>
          )}
          {rcStatus && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${rcStatusBadge(rcStatus)}`}>
              {rcStatus}
            </span>
          )}
          {isDirty && !isSaving && (
            <span className="rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-xs font-bold text-orange-600">
              Unsaved
            </span>
          )}
          {/* Chevron */}
          <svg
            className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* ── Expandable body ── */}
      {open && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
          {/* Grades */}
          {grades.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
              No grades submitted for this student yet.
            </div>
          ) : (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Subject Grades
              </h4>
              <div className="space-y-2">
                {Object.entries(gradesBySubject).map(([subject, subjectGrades]) => (
                  <div key={subject} className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                    <div className="border-b border-slate-100 px-4 py-2">
                      <span className="text-xs font-bold text-slate-700">{subject}</span>
                    </div>
                    {subjectGrades.map((grade) => (
                      <div key={grade.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="text-sm space-x-2">
                          <span className="font-semibold text-slate-900">
                            {grade.percentage?.toFixed(1) ?? 0}%
                          </span>
                          <span className="text-xs text-slate-400">
                            Q:{grade.quiz ?? 0} · A:{grade.assignment ?? 0} · M:{grade.midterm ?? 0} · F:{grade.final ?? 0}
                          </span>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${gradeStatusBadge(grade.submissionStatus)}`}>
                          {grade.submissionStatus === 'ApprovedByHomeroom'
                            ? '✓ Approved'
                            : grade.submissionStatus === 'SubmittedToHomeroom'
                            ? 'Pending'
                            : grade.submissionStatus || 'Draft'}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conduct & Remarks */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Conduct Grade</label>
              <select
                value={edit?.conductGrade || ''}
                onChange={(e) => onEditChange(studentId, 'conductGrade', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              >
                <option value="">— Select —</option>
                {CONDUCT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Promotion Status</label>
              <select
                value={edit?.promotionStatus || 'Pending'}
                onChange={(e) => onEditChange(studentId, 'promotionStatus', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              >
                {PROMOTION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => onApproveAndSave(studentId)}
                disabled={isSaving || !isDirty}
                className="w-full rounded-xl bg-indigo-600 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-300 border-t-white" />
                    Saving…
                  </>
                ) : pendingGrades.length > 0 ? '✓ Approve & Save' : 'Save Review'}
              </button>
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Homeroom Remarks</label>
              <textarea
                rows={2}
                value={edit?.homeroomRemarks || ''}
                onChange={(e) => onEditChange(studentId, 'homeroomRemarks', e.target.value)}
                placeholder="Optional remarks about the student's performance, behaviour, goals…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HomeroomGradeReview() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const classId = params.get('classId');
  const { activeSemester } = useBranch();

  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState(null);
  const [activeClass, setActiveClass] = useState(null);
  const [studentMap, setStudentMap] = useState({});
  const [studentOrder, setStudentOrder] = useState([]);
  const [edits, setEdits] = useState({});
  const [savingStudentId, setSavingStudentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ─── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const yrsRes = await axios.get('/academic-years');
      const ay = (yrsRes.data || []).find((y) => y.isActive) || (yrsRes.data || [])[0] || null;
      setActiveYear(ay);

      const statsRes = await axios.get('/stats/teacher/me');
      const found = (statsRes.data?.classSummaries || []).find((c) => c.classId === classId);
      setActiveClass(found || null);

      // 403 guard — enforced by backend
      const semParam = activeSemester?.id ? `?semesterId=${activeSemester.id}` : '';
      let gradesList = [];
      try {
        const gradesRes = await axios.get(`/classroom/grades/submitted/${classId}${semParam}`);
        gradesList = gradesRes.data || [];
      } catch (err) {
        if (err.response?.status === 403) {
          toast.error('Access denied: you are not the homeroom teacher for this class.');
          navigate('/teacher/homeroom');
          return;
        }
        throw err;
      }

      // Fetch all students via sections
      const seen = new Set();
      const allStudents = [];
      const sectionsRes = await axios.get(`/classroom/sections/${classId}`);
      for (const sec of sectionsRes.data || []) {
        try {
          const studRes = await axios.get(`/classroom/sections/detail/${sec.id}/students`);
          (studRes.data?.enrollments || []).forEach((e) => {
            if (e.student && !seen.has(e.student.id)) {
              seen.add(e.student.id);
              allStudents.push(e.student);
            }
          });
        } catch { /* ignore per-section errors */ }
      }
      gradesList.forEach((g) => {
        if (g.student && !seen.has(g.student.id)) {
          seen.add(g.student.id);
          allStudents.push(g.student);
        }
      });

      // Fetch existing report cards
      let rcList = [];
      if (ay) {
        try {
          const rcRes = await axios.get(`/report-cards/class/${classId}/${ay.id}${semParam}`);
          rcList = rcRes.data || [];
        } catch { /* not fatal */ }
      }

      allStudents.sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''));

      const map = {};
      allStudents.forEach((student) => {
        const rc = rcList.find((r) => r.studentId === student.id) || null;
        map[student.id] = { student, grades: [], rc };
      });
      gradesList.forEach((grade) => {
        const sid = grade.student?.id;
        if (sid && map[sid]) map[sid].grades.push(grade);
      });

      const initialEdits = {};
      allStudents.forEach((student) => {
        const rc = map[student.id]?.rc;
        initialEdits[student.id] = {
          conductGrade: rc?.conductGrade || '',
          promotionStatus: rc?.promotionStatus || 'Pending',
          homeroomRemarks: rc?.homeroomRemarks || '',
        };
      });

      setStudentMap(map);
      setStudentOrder(allStudents.map((s) => s.id));
      setEdits(initialEdits);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load class data.');
    } finally {
      setLoading(false);
    }
  }, [classId, activeSemester, navigate]);

  useEffect(() => { load(); }, [load]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const setStudentEdit = useCallback((studentId, field, value) => {
    setEdits((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  }, []);

  const handleApproveAndSave = useCallback(async (studentId) => {
    const { student, grades, rc } = studentMap[studentId] || {};
    const edit = edits[studentId] || {};

    const pendingGradeIds = grades
      .filter((g) => g.submissionStatus === 'SubmittedToHomeroom')
      .map((g) => g.id);

    const hasGrades = pendingGradeIds.length > 0;
    const hasChanges =
      hasGrades ||
      (edit.conductGrade || '') !== (rc?.conductGrade || '') ||
      (edit.promotionStatus || 'Pending') !== (rc?.promotionStatus || 'Pending') ||
      (edit.homeroomRemarks || '') !== (rc?.homeroomRemarks || '');

    if (!hasChanges) { toast.info('Nothing to save.'); return; }

    setSavingStudentId(studentId);
    try {
      if (hasGrades) {
        await axios.post('/classroom/grades/approve', { gradeIds: pendingGradeIds });
      }

      const payload = {
        studentId,
        academicYearId: activeYear?.id,
        semesterId: activeSemester?.id || null,
        conductGrade: edit.conductGrade || '',
        promotionStatus: edit.promotionStatus || 'Pending',
        homeroomRemarks: edit.homeroomRemarks || '',
      };
      const rcRes = await axios.patch('/report-cards/homeroom-review/upsert', payload);
      const updatedRC = rcRes.data;

      toast.success(
        hasGrades
          ? `Approved ${pendingGradeIds.length} grade(s) + saved review for ${student?.user?.name || 'student'}.`
          : `Review saved for ${student?.user?.name || 'student'}.`
      );

      setStudentMap((prev) => {
        const entry = { ...prev[studentId] };
        entry.grades = entry.grades.map((g) =>
          pendingGradeIds.includes(g.id) ? { ...g, submissionStatus: 'ApprovedByHomeroom' } : g
        );
        entry.rc = updatedRC;
        return { ...prev, [studentId]: entry };
      });
      setEdits((prev) => ({
        ...prev,
        [studentId]: {
          conductGrade: updatedRC.conductGrade || '',
          promotionStatus: updatedRC.promotionStatus || 'Pending',
          homeroomRemarks: updatedRC.homeroomRemarks || '',
        },
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save student review.');
    } finally {
      setSavingStudentId(null);
    }
  }, [studentMap, edits, activeYear, activeSemester]);

  const handleSubmitToAdmin = async () => {
    const rcIds = studentOrder.map((sid) => studentMap[sid]?.rc?.id).filter(Boolean);
    if (rcIds.length === 0) {
      toast.error('No saved student reviews to submit. Approve & Save each student first.');
      return;
    }
    const unapproved = studentOrder.filter((sid) =>
      (studentMap[sid]?.grades || []).some((g) => g.submissionStatus === 'SubmittedToHomeroom')
    );
    if (unapproved.length > 0) {
      toast.warn(
        `${unapproved.length} student(s) still have unapproved grades. Submitting anyway.`,
        { autoClose: 5000 }
      );
    }
    setSubmitting(true);
    try {
      await axios.post('/report-cards/submit-to-admin', { reportCardIds: rcIds });
      toast.success(`${rcIds.length} student review(s) submitted to Branch Admin.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit to Branch Admin.');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const total = studentOrder.length;
    let reviewed = 0;
    let pendingGrades = 0;
    studentOrder.forEach((sid) => {
      const { rc, grades } = studentMap[sid] || {};
      if (rc) reviewed++;
      pendingGrades += (grades || []).filter((g) => g.submissionStatus === 'SubmittedToHomeroom').length;
    });
    return { total, reviewed, pendingGrades };
  }, [studentOrder, studentMap]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <TeacherLayout searchPlaceholder="Search homeroom...">
      {/* Header */}
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

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Homeroom Review
              {activeClass
                ? `: ${activeClass.className}${activeClass.stream ? ` (${activeClass.stream})` : ''}`
                : ''}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Click a student name to expand. Approve grades &amp; add conduct remarks, then submit to Branch Admin.
            </p>
          </div>

          {studentOrder.length > 0 && (
            <button
              onClick={handleSubmitToAdmin}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-white" />
                  Submitting…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                  Submit All to Branch Admin
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Total Students', value: stats.total },
          { label: 'Reviewed', value: stats.reviewed, color: 'text-emerald-700' },
          { label: 'Grades Pending Approval', value: stats.pendingGrades, color: 'text-amber-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`mt-1 text-2xl font-black ${s.color || 'text-slate-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Student list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <div className="mr-3 h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
          Loading…
        </div>
      ) : studentOrder.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
          No students found in this homeroom class.
        </div>
      ) : (
        <div className="space-y-2">
          {studentOrder.map((sid) => (
            <StudentCard
              key={sid}
              studentId={sid}
              studentMap={studentMap}
              edit={edits[sid]}
              onEditChange={setStudentEdit}
              onApproveAndSave={handleApproveAndSave}
              isSaving={savingStudentId === sid}
            />
          ))}
        </div>
      )}
    </TeacherLayout>
  );
}
