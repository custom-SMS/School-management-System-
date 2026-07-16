import { useEffect, useMemo, useState } from 'react';
import { showConfirmDialog } from '../utils/sweetAlert';
import axios from '../api/axios';
import AdminLayout from '../components/AdminLayout';
import { toast } from 'react-toastify';
import { useBranding } from '../context/SettingsContext';
import { printReportCard } from '../utils/printReportCard';
import { useBranch } from '../context/BranchContext';

const getStudentOptionId = (s) => s?._id || s?.id || '';
const getStudentDisplayName = (s) => s?.user?.name || s?.name || 'Student';
const getGradeSubjectLabel = (g) => g?.subjectRef?.name || g?.subject || g?.class?.subject || 'Subject';
const getGradeClassLabel = (g) => g?.class ? `${g.class.name}${g.class.stream ? ` (${g.class.stream})` : ''}` : '—';

const WORKFLOW_LABELS = {
  Draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-500' },
  HomeroomReview: { label: 'Homeroom Review', cls: 'bg-amber-50 text-amber-700' },
  BranchAdminReview: { label: 'Branch Admin Review', cls: 'bg-blue-50 text-blue-700' },
  AdminReview: { label: 'Branch Admin Review', cls: 'bg-blue-50 text-blue-700' },
  Published: { label: 'Published', cls: 'bg-emerald-50 text-emerald-700' },
};

function WorkflowBadge({ status }) {
  const { label, cls } = WORKFLOW_LABELS[status] || WORKFLOW_LABELS.Draft;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{label}</span>
  );
}

// Simple progress bar showing workflow pipeline
function WorkflowPipeline({ counts }) {
  const steps = [
    { key: 'Draft', label: 'Draft' },
    { key: 'HomeroomReview', label: 'Homeroom Review' },
    { key: 'BranchAdminReview', label: 'Branch Admin Review' },
    { key: 'Published', label: 'Published' },
  ];
  const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-slate-700">Workflow Pipeline</h3>
      <div className="flex gap-2">
        {steps.map((step) => {
          const n = counts[step.key] || 0;
          const pct = Math.round((n / total) * 100);
          const { cls } = WORKFLOW_LABELS[step.key];
          return (
            <div key={step.key} className="flex-1 text-center">
              <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-2 rounded-full transition-all ${cls.split(' ')[0]}`} style={{ width: `${pct}%`, backgroundColor: undefined }} />
              </div>
              <div className={`text-xs font-bold ${cls.split(' ')[1]}`}>{n}</div>
              <div className="mt-0.5 text-[10px] text-slate-400 leading-tight">{step.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportCards() {
  const { branding, logoUrl, grading } = useBranding();
  const { activeSemester } = useBranch();
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState('');

  // Class-level report card list for pipeline view
  const [classCards, setClassCards] = useState([]);
  const [loadingClassCards, setLoadingClassCards] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  const activeYear = useMemo(
    () => years.find((y) => y.id === selectedYear) || years.find((y) => y.isActive) || null,
    [years, selectedYear]
  );

  // Semesters available for the chosen year
  const yearSemesters = useMemo(
    () => activeYear?.semesters || [],
    [activeYear]
  );

  // Auto-select active semester when year or activeSemester changes
  useEffect(() => {
    if (!yearSemesters.length) return;
    // Prefer the globally active semester if it belongs to this year
    const match = yearSemesters.find((s) => s.id === activeSemester?.id);
    if (match) {
      setSelectedSemesterId(match.id);
    } else {
      // Fall back to Semester 1
      const sem1 = yearSemesters.find((s) => s.order === 1) || yearSemesters[0];
      if (sem1) setSelectedSemesterId(sem1.id);
    }
  }, [yearSemesters, activeSemester]);

  const sortedStudents = useMemo(() => (
    [...students].sort((a, b) => getStudentDisplayName(a).localeCompare(getStudentDisplayName(b)))
  ), [students]);

  useEffect(() => {
    axios.get('/academic-years').then((r) => {
      setYears(r.data || []);
      const active = (r.data || []).find((y) => y.isActive) || (r.data || [])[0];
      if (active) setSelectedYear(active.id);
    }).catch(console.error);

    axios.get('/students').then((r) => {
      const payload = r.data;
      setStudents(Array.isArray(payload) ? payload : (payload?.students || []));
    }).catch(console.error);

    // Load classes for pipeline view
    axios.get('/classroom/classes').then((r) => {
      setClasses(r.data || []);
      if ((r.data || []).length > 0) setSelectedClassId(r.data[0]._id || r.data[0].id);
    }).catch(() => { });
  }, []);

  // Load class-level cards when class, year, or semester changes
  useEffect(() => {
    if (!selectedClassId || !selectedYear) return;
    setLoadingClassCards(true);
    const params = selectedSemesterId ? `?semesterId=${selectedSemesterId}` : '';
    axios.get(`/report-cards/class/${selectedClassId}/${selectedYear}${params}`)
      .then((r) => setClassCards(r.data || []))
      .catch(() => setClassCards([]))
      .finally(() => setLoadingClassCards(false));
  }, [selectedClassId, selectedYear, selectedSemesterId]);

  const workflowCounts = useMemo(() => {
    const counts = { Draft: 0, HomeroomReview: 0, BranchAdminReview: 0, Published: 0 };
    classCards.forEach((rc) => {
      let key = rc.workflowStatus || 'Draft';
      if (key === 'AdminReview') key = 'BranchAdminReview';
      if (counts[key] !== undefined) counts[key]++;
    });
    return counts;
  }, [classCards]);

  // ── Compile ────────────────────────────────────────────────────────────────
  const handleCompile = async () => {
    if (!selectedYear) return;
    const semLabel = yearSemesters.find((s) => s.id === selectedSemesterId)?.name || 'current semester';
    const { isConfirmed } = await showConfirmDialog({
      title: 'Compile report cards?',
      text: `This will compile ${semLabel} report cards. Averages, ranks and attendance will be recalculated.`,
      confirmButtonText: 'Compile',
    });
    if (!isConfirmed) return;
    setBusy('compile');
    try {
      const res = await axios.post('/report-cards/compile', {
        academicYearId: selectedYear,
        semesterId: selectedSemesterId || undefined,
      });
      toast.success(res.data?.message || 'Report cards compiled.');
      if (selectedClassId) {
        const params = selectedSemesterId ? `?semesterId=${selectedSemesterId}` : '';
        const r = await axios.get(`/report-cards/class/${selectedClassId}/${selectedYear}${params}`);
        setClassCards(r.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to compile report cards.');
    } finally {
      setBusy('');
    }
  };

  // ── Publish all ────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!selectedYear) return;
    const { isConfirmed } = await showConfirmDialog({
      title: 'Publish all report cards?',
      text: 'Students and parents will be notified immediately.',
      confirmButtonText: 'Publish All',
    });
    if (!isConfirmed) return;
    setBusy('publish');
    try {
      const res = await axios.post('/report-cards/publish', {
        academicYearId: selectedYear,
        semesterId: selectedSemesterId || undefined,
      });
      toast.success(res.data?.message || 'Report cards published.');
      if (preview && selectedStudent) loadPreview(selectedStudent);
      if (selectedClassId) {
        const params = selectedSemesterId ? `?semesterId=${selectedSemesterId}` : '';
        const r = await axios.get(`/report-cards/class/${selectedClassId}/${selectedYear}${params}`);
        setClassCards(r.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish.');
    } finally {
      setBusy('');
    }
  };

  // ── Unpublish all ──────────────────────────────────────────────────────────
  const handleUnpublish = async () => {
    if (!selectedYear) return;
    const { isConfirmed } = await showConfirmDialog({
      title: 'Unpublish all report cards?',
      text: 'Report cards will be hidden from students and parents.',
      confirmButtonText: 'Unpublish',
    });
    if (!isConfirmed) return;
    setBusy('unpublish');
    try {
      await axios.post('/report-cards/unpublish', {
        academicYearId: selectedYear,
        semesterId: selectedSemesterId || undefined,
      });
      toast.success('Report cards unpublished.');
      if (preview && selectedStudent) loadPreview(selectedStudent);
      if (selectedClassId) {
        const params = selectedSemesterId ? `?semesterId=${selectedSemesterId}` : '';
        const r = await axios.get(`/report-cards/class/${selectedClassId}/${selectedYear}${params}`);
        setClassCards(r.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unpublish.');
    } finally {
      setBusy('');
    }
  };

  // ── Toggle single card ─────────────────────────────────────────────────────
  const handleToggleOne = async (rc) => {
    const nextPublished = !rc.published;
    try {
      await axios.patch(`/report-cards/${rc.id}/publish`, { published: nextPublished });
      toast.success(nextPublished ? 'Report card published.' : 'Report card unpublished.');
      setClassCards((prev) => prev.map((c) =>
        c.id === rc.id ? { ...c, published: nextPublished, workflowStatus: nextPublished ? 'Published' : 'BranchAdminReview' } : c
      ));
      if (preview?.reportCard?.id === rc.id) loadPreview(selectedStudent);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle publish.');
    }
  };

  // ── Preview ────────────────────────────────────────────────────────────────
  const loadPreview = async (studentId) => {
    setPreview(null);
    setPreviewError('');
    if (!studentId || !selectedYear) return;
    try {
      const params = selectedSemesterId ? `?semesterId=${selectedSemesterId}` : '';
      const res = await axios.get(`/report-cards/${studentId}/${selectedYear}${params}`);
      setPreview(res.data);
      setComments(res.data?.reportCard?.teacherComments || '');
    } catch (err) {
      setPreviewError(err.response?.data?.message || 'No compiled report card found for this student/year.');
    }
  };

  const handleStudentChange = (id) => { setSelectedStudent(id); };

  useEffect(() => {
    if (selectedStudent) {
      loadPreview(selectedStudent);
    } else {
      setPreview(null);
    }
  }, [selectedStudent, selectedYear, selectedSemesterId]);

  const handleSaveComments = async () => {
    if (!preview?.reportCard?.id) return;
    setBusy('comments');
    try {
      await axios.patch(`/report-cards/${preview.reportCard.id}/comments`, { comments });
      toast.success('Comments saved.');
      loadPreview(selectedStudent);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save comments.');
    } finally {
      setBusy('');
    }
  };

  const handleDownload = () => {
    if (!card) return;
    printReportCard({
      reportCard: { ...card, academicYear: activeYear },
      grades,
      branding,
      logoUrl,
      passMark: Number(grading?.passMark || 50),
      gpaEnabled: Boolean(grading?.gpaEnabled),
    });
  };

  const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-500/10';
  const card = preview?.reportCard;
  const grades = preview?.grades || [];

  return (
    <AdminLayout pageTitle="Report Cards">
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Report Cards</h2>
        <p className="text-sm font-medium text-slate-500">
          Compile → review homeroom submissions → publish to students and parents.
        </p>
      </div>

      {/* Academic year + top actions */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <span className="mb-2 block text-sm font-bold text-slate-700">Academic Year</span>
            <div className={`${inputClass} flex items-center font-semibold text-slate-800`}>
              {activeYear ? `${activeYear.year}${activeYear.isActive ? ' (Active)' : ''}` : 'No academic year available'}
            </div>
          </div>
          <div className="flex-1">
            <span className="mb-2 block text-sm font-bold text-slate-700">Semester</span>
            <select
              className={`${inputClass} font-semibold text-slate-800 cursor-pointer`}
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              disabled={!yearSemesters.length}
            >
              {yearSemesters.length === 0 ? (
                <option value="">No semesters available</option>
              ) : (
                yearSemesters.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.isActive ? '(Active)' : ''}</option>
                ))
              )}
            </select>
          </div>
          <button onClick={handleCompile} disabled={!selectedYear || busy === 'compile'}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
            {busy === 'compile' ? 'Compiling…' : '⚙ Compile Report Cards'}
          </button>
          {/* Publish/Unpublish buttons removed */}

        </div>
      </div>

      {/* Class pipeline view */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <h3 className="text-lg font-bold text-slate-900">Class Overview</h3>
          <div className="ml-auto">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
            >
              {classes.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>{c.name} {c.stream ? `(${c.stream})` : ''} · {c.subject}</option>
              ))}
            </select>
          </div>
        </div>

        <WorkflowPipeline counts={workflowCounts} />

        {loadingClassCards ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
            Loading…
          </div>
        ) : classCards.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No report cards compiled yet for this class.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3 text-center">Avg</th>
                  <th className="px-4 py-3 text-center">Rank</th>
                  <th className="px-4 py-3 text-center">Attendance</th>
                  <th className="px-4 py-3 text-center">Conduct</th>
                  <th className="px-4 py-3 text-center">Promotion</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {classCards.map((rc) => (
                  <tr key={rc.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {rc.student?.user?.name || '—'}
                      <div className="text-xs font-normal text-slate-400">{rc.student?.studentId}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold">{rc.averageScore}%</td>
                    <td className="px-4 py-3 text-center">{rc.rank ? `#${rc.rank}` : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <div>{rc.attendancePercentage}%</div>
                      <div className="text-[10px] text-slate-400">
                        P:{rc.attendancePresent} A:{rc.attendanceAbsent} L:{rc.attendanceLate}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs">{rc.conductGrade || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold ${rc.promotionStatus === 'Promoted' ? 'text-emerald-700'
                        : rc.promotionStatus === 'Not Promoted' ? 'text-rose-600'
                          : rc.promotionStatus === 'Conditional Promotion' ? 'text-amber-600'
                            : 'text-slate-400'
                        }`}>
                        {rc.promotionStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold ${rc.status === 'Pass' ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {rc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          title="Download PDF"
                          onClick={() => printReportCard({
                            reportCard: { ...rc, academicYear: activeYear },
                            grades: [],
                            branding,
                            logoUrl,
                            passMark: Number(grading?.passMark || 50),
                            gpaEnabled: Boolean(grading?.gpaEnabled),
                          })}
                          className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Individual preview + comme\nts */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 p-6">
          <h3 className="text-lg font-bold text-slate-900">Preview & Edit Student Report Card</h3>
        </div>

        <div className="p-6">
          <select
            className={`${inputClass} mb-6 max-w-md`}
            value={selectedStudent}
            onChange={(e) => handleStudentChange(e.target.value)}
          >
            <option value="">Select a student…</option>
            {sortedStudents.map((s) => (
              <option key={getStudentOptionId(s)} value={getStudentOptionId(s)}>
                {getStudentDisplayName(s)} ({s.studentId}) — {s.grade} {s.stream ? `(${s.stream})` : ''}
              </option>
            ))}
          </select>

          {previewError && (
            <p className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
              {previewError}
            </p>
          )}

          {card && (
            <div className="space-y-6">
              {/* KPI strip */}
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  { label: 'Average', value: `${Math.round(card.averageScore)}%` },
                  { label: 'Rank', value: card.rank ? `#${card.rank}` : '—' },
                  { label: 'Attendance', value: `${Math.round(card.attendancePercentage)}%` },
                  { label: 'Result', value: card.status || 'Pending' },
                  { label: 'Promotion', value: card.promotionStatus || 'Pending' },
                  { label: 'Published', value: card.published ? 'Yes' : 'Draft' },
                ].map((k) => (
                  <div key={k.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{k.label}</div>
                    <div className="mt-1 text-xl font-black text-slate-900">{k.value}</div>
                  </div>
                ))}
              </div>

              {/* Workflow status */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-600">Workflow:</span>
                <WorkflowBadge status={card.workflowStatus} />
                {card.homeroomRemarks && (
                  <span className="ml-4 text-sm text-slate-500">
                    <span className="font-semibold text-slate-700">Homeroom:</span> {card.homeroomRemarks}
                  </span>
                )}
                {card.conductGrade && (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                    Conduct: {card.conductGrade}
                  </span>
                )}
              </div>

              {/* Attendance breakdown */}
              {card.attendanceTotal > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total Sessions', value: card.attendanceTotal, cls: 'text-slate-900' },
                    { label: 'Present', value: card.attendancePresent, cls: 'text-emerald-700' },
                    { label: 'Absent', value: card.attendanceAbsent, cls: 'text-rose-600' },
                    { label: 'Late', value: card.attendanceLate, cls: 'text-amber-600' },
                  ].map((a) => (
                    <div key={a.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                      <div className="text-xs text-slate-400">{a.label}</div>
                      <div className={`text-lg font-black ${a.cls}`}>{a.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Grades table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3">Subject</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3 text-center">Quiz</th>
                      <th className="px-4 py-3 text-center">Assign.</th>
                      <th className="px-4 py-3 text-center">Midterm</th>
                      <th className="px-4 py-3 text-center">Final</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">Total</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {grades.length > 0 ? grades.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3 font-semibold text-slate-900">{getGradeSubjectLabel(g)}</td>
                        <td className="px-4 py-3 text-slate-500">{getGradeClassLabel(g)}</td>
                        <td className="px-4 py-3 text-center">{g.quiz ?? '—'}</td>
                        <td className="px-4 py-3 text-center">{g.assignment ?? '—'}</td>
                        <td className="px-4 py-3 text-center">{g.midterm ?? '—'}</td>
                        <td className="px-4 py-3 text-center">{g.final ?? '—'}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">{g.total ?? '—'}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">{g.percentage != null ? `${g.percentage}%` : '—'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="8" className="px-5 py-8 text-center text-slate-400">No grades recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Admin comments */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Admin / Teacher Comments</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add comments visible on the student's report card…"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleSaveComments}
                    disabled={busy === 'comments'}
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {busy === 'comments' ? 'Saving…' : 'Save Comments'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                    </svg>
                    Download / Print PDF
                  </button>
                  {/* <button
                    onClick={() => handleToggleOne(card)}
                    className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${card.published
                      ? 'border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                  >
                    {card.published ? 'Unpublish This Card' : 'Publish This Card'}
                  </button> */}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
