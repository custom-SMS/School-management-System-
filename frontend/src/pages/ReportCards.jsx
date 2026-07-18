import { useEffect, useMemo, useState, useContext } from 'react';
import { showConfirmDialog, showDangerConfirmDialog, showPromptDialog } from '../utils/sweetAlert';
import axios from '../api/axios';
import AdminLayout from '../components/AdminLayout';
import { toast } from 'react-toastify';
import { useBranding } from '../context/SettingsContext';
import { printReportCard } from '../utils/printReportCard';
import { useBranch } from '../context/BranchContext';
import { AuthContext } from '../context/AuthContext';

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
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState('');

  // Historical editing state
  const [historicalEditEnabled, setHistoricalEditEnabled] = useState(false);
  const [historicalReason, setHistoricalReason] = useState('');

  const activeYear = useMemo(
    () => years.find((y) => y.id === selectedYear) || years.find((y) => y.isActive) || null,
    [years, selectedYear]
  );

  // Derive whether the selected year is archived
  const isArchivedYear = useMemo(() => activeYear && !activeYear.isActive, [activeYear]);

  // Historical editing is only valid for SuperAdmin when viewing an archived year
  const canEditHistorical = isSuperAdmin && isArchivedYear;

  // In historical mode, all mutating calls must include the reason header
  const getHistoricalHeaders = () =>
    historicalEditEnabled && historicalReason
      ? { 'x-modification-reason': historicalReason }
      : {};

  // When year switches, disable historical editing
  useEffect(() => {
    setHistoricalEditEnabled(false);
    setHistoricalReason('');
  }, [selectedYear]);

  // Class-level report card list for pipeline view
  const [classCards, setClassCards] = useState([]);
  const [loadingClassCards, setLoadingClassCards] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');

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
    if (isArchivedYear && !historicalEditEnabled) {
      toast.error('Enable Historical Editing first to compile archived report cards.');
      return;
    }
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
      }, { headers: getHistoricalHeaders() });
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
    if (isArchivedYear && !historicalEditEnabled) {
      toast.error('Enable Historical Editing to modify archived records.');
      return;
    }
    setBusy('comments');
    try {
      await axios.patch(`/report-cards/${preview.reportCard.id}/comments`, { comments }, { headers: getHistoricalHeaders() });
      toast.success('Comments saved.');
      loadPreview(selectedStudent);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save comments.');
    } finally {
      setBusy('');
    }
  };

  const getStudentClassSize = (rc) => {
    if (!rc) return 0;
    if (classCards.length && classCards.some(c => c.studentId === rc.studentId)) {
      return classCards.length;
    }
    const student = students.find(s => getStudentOptionId(s) === rc.studentId);
    if (student) {
      const classSiblings = students.filter(s => s.grade === student.grade && s.stream === student.stream);
      return classSiblings.length || 1;
    }
    return 1;
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
      classSize: getStudentClassSize(card),
    });
  };

  const handlePrintSingleClassCard = async (rc) => {
    if (!rc.studentId || !selectedYear) return;
    try {
      const params = selectedSemesterId ? `?semesterId=${selectedSemesterId}` : '';
      const res = await axios.get(`/report-cards/${rc.studentId}/${selectedYear}${params}`);
      if (res.data) {
        printReportCard({
          reportCard: { ...res.data.reportCard, academicYear: activeYear },
          grades: res.data.grades || [],
          branding,
          logoUrl,
          passMark: Number(grading?.passMark || 50),
          gpaEnabled: Boolean(grading?.gpaEnabled),
          classSize: classCards.length || getStudentClassSize(rc),
        });
      }
    } catch (err) {
      toast.error('Failed to fetch grades for report card PDF generation.');
    }
  };

  // ── Historical Editing Mode ───────────────────────────────────────────────
  const handleEnableHistoricalEdit = async () => {
    const { isConfirmed } = await showDangerConfirmDialog({
      title: 'Enable Historical Editing?',
      html: `<p class="text-left text-sm text-slate-600 mb-3">You are about to edit <strong>archived academic records</strong> for <strong>${activeYear?.year}</strong>.</p><p class="text-left text-sm text-slate-600">This action will be fully audited. Every change will be permanently logged with your account and reason.</p>`,
      confirmButtonText: 'Continue',
    });
    if (!isConfirmed) return;

    const { value: reason, isConfirmed: reasonConfirmed } = await showPromptDialog({
      title: 'Reason for modification',
      inputLabel: 'Provide a brief explanation (required)',
      inputPlaceholder: 'e.g. Correcting data entry error — student grade was entered incorrectly on 2024-03-15',
      inputValidator: (v) => !v || v.trim().length < 10 ? 'Please provide a clear reason (minimum 10 characters)' : null,
      confirmButtonText: 'Enable Historical Editing',
    });
    if (!reasonConfirmed || !reason) return;

    setHistoricalReason(reason.trim());
    setHistoricalEditEnabled(true);
    toast.success('Historical editing enabled. All changes will be audited.', { icon: '⚠️' });
  };

  const handleDisableHistoricalEdit = () => {
    setHistoricalEditEnabled(false);
    setHistoricalReason('');
    toast.info('Historical editing disabled. Viewing in read-only mode.');
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

      {/* Historical Read-Only Banner */}
      {isArchivedYear && (
        <div className={`mb-5 rounded-2xl border px-5 py-4 ${
          historicalEditEnabled
            ? 'border-amber-300 bg-amber-50'
            : 'border-slate-300 bg-slate-100'
        }`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800">
              {historicalEditEnabled
                ? <svg className="h-4 w-4 text-amber-300" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                : <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm ${ historicalEditEnabled ? 'text-amber-800' : 'text-slate-700' }`}>
                {historicalEditEnabled
                  ? `⚠️  Historical Editing Enabled — ${activeYear?.year}`
                  : `🔒  Viewing: ${activeYear?.year} — Read Only`
                }
              </p>
              <p className={`text-xs mt-0.5 ${ historicalEditEnabled ? 'text-amber-700' : 'text-slate-500' }`}>
                {historicalEditEnabled
                  ? `Reason: "${historicalReason}" — Every change is being permanently logged.`
                  : 'This is an archived academic year. All records are read-only.'}
              </p>
            </div>
            {canEditHistorical && (
              historicalEditEnabled ? (
                <button
                  onClick={handleDisableHistoricalEdit}
                  className="shrink-0 rounded-xl border border-amber-400 bg-white px-4 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-50"
                >
                  Exit Historical Editing
                </button>
              ) : (
                <button
                  onClick={handleEnableHistoricalEdit}
                  className="shrink-0 rounded-xl border border-slate-400 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Enable Historical Editing
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Academic year + top actions */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Academic Year — read-only pill for normal users, dropdown for SuperAdmin */}
          <div className="min-w-[180px] flex-1">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Academic Year</span>
            {isSuperAdmin ? (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year} {y.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <svg className="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 2v2H5a2 2 0 0 0-2 2v14h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 8H5V6h14v4z" />
                </svg>
                <span className="font-bold text-slate-800">
                  {activeYear ? activeYear.year : 'No year'}
                </span>
                {activeYear?.isActive && (
                  <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Active</span>
                )}
                {isArchivedYear && (
                  <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">Archived</span>
                )}
              </div>
            )}
          </div>

          {/* Semester — pill tab toggle */}
          <div className="min-w-[220px] flex-1">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Semester</span>
            {yearSemesters.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400">
                No semesters available
              </div>
            ) : (
              <div className="flex gap-1.5">
                {yearSemesters.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSemesterId(s.id)}
                    className={`relative flex-1 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                      selectedSemesterId === s.id
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    {s.name}
                    {s.isActive && (
                      <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                        selectedSemesterId === s.id ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                      }`}>ACTIVE</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleCompile}
            disabled={!selectedYear || busy === 'compile'}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 14.5-4.5-4.5 1.41-1.41L13 13.67l6.09-6.08 1.41 1.41L13 16.5z" />
            </svg>
            {busy === 'compile' ? 'Compiling…' : 'Compile Report Cards'}
          </button>
        </div>
      </div>

      {/* Class pipeline view */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Class Overview</h3>
            <p className="text-xs text-slate-400">Select a class to see the report card pipeline</p>
          </div>
          {/* Class selector */}
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6h16v2H4V6zm4 5h8v2H8v-2zm2 5h4v2h-4v-2z" />
            </svg>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="min-w-[220px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5 cursor-pointer"
            >
              {classes.length === 0 ? (
                <option value="">No classes available</option>
              ) : (
                classes.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.name}{c.stream ? ` (${c.stream})` : ''}{c.subject ? ` · ${c.subject}` : ''}
                  </option>
                ))
              )}
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
                    <td className="px-4 py-3 text-center">{rc.rank ? `${rc.rank}/${classCards.length}` : '—'}</td>
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
                          onClick={() => handlePrintSingleClassCard(rc)}
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

      {/* Individual preview + comments */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Preview &amp; Edit Student Report Card</h3>
              <p className="text-xs text-slate-400">Search and select a student to view or edit their report card</p>
            </div>
            {selectedStudent && (
              <button
                type="button"
                onClick={() => { setSelectedStudent(''); setStudentSearch(''); setStudentPickerOpen(false); }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:border-slate-400 hover:text-slate-800"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                Clear selection
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* ── Student search-and-select ───────────────────────────────────── */}
          <div className="mb-6">
            {/* Selected student badge */}
            {selectedStudent ? (() => {
              const s = sortedStudents.find(s => getStudentOptionId(s) === selectedStudent);
              const name = s ? getStudentDisplayName(s) : 'Student';
              const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
              return (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{initials}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 truncate">{name}</div>
                    <div className="text-xs text-slate-500">
                      ID: {s?.studentId || '—'}
                      {s?.grade && <span className="ml-2 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">{s.grade}{s.stream ? ` · ${s.stream}` : ''}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStudentPickerOpen(true)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-slate-400"
                  >
                    Change
                  </button>
                </div>
              );
            })() : (
              <button
                type="button"
                onClick={() => setStudentPickerOpen(true)}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-slate-400 hover:bg-white"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 text-slate-400">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z"/></svg>
                </span>
                <span className="text-sm font-semibold text-slate-500">Click to select a student…</span>
                <svg className="ml-auto h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
              </button>
            )}

            {/* Picker dropdown */}
            {studentPickerOpen && (
              <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                {/* Search bar */}
                <div className="border-b border-slate-100 p-3">
                  <div className="relative">
                    <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 4a6 6 0 1 0 3.5 10.9l4.3 4.3 1.4-1.4-4.3-4.3A6 6 0 0 0 10 4zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
                    </svg>
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search by name, ID, or grade…"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                    {studentSearch && (
                      <button type="button" onClick={() => setStudentSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                      </button>
                    )}
                  </div>
                </div>
                {/* Results */}
                <div className="max-h-64 overflow-y-auto">
                  {(() => {
                    const q = studentSearch.toLowerCase().trim();
                    const filtered = q
                      ? sortedStudents.filter(s =>
                          getStudentDisplayName(s).toLowerCase().includes(q) ||
                          (s.studentId || '').toLowerCase().includes(q) ||
                          (s.grade || '').toLowerCase().includes(q) ||
                          (s.stream || '').toLowerCase().includes(q)
                        )
                      : sortedStudents;
                    if (filtered.length === 0) return (
                      <div className="flex flex-col items-center py-10 text-slate-400">
                        <svg className="mb-2 h-8 w-8" viewBox="0 0 24 24" fill="currentColor"><path d="M11 5a6 6 0 1 0 0 12A6 6 0 0 0 11 5zm7.07 12.66 3.54 3.53-1.41 1.41-3.54-3.53A8 8 0 1 1 18.07 17.66z"/></svg>
                        <span className="text-sm font-semibold">No students match "{studentSearch}"</span>
                      </div>
                    );
                    return filtered.map((s) => {
                      const sid = getStudentOptionId(s);
                      const name = getStudentDisplayName(s);
                      const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
                      const isSelected = selectedStudent === sid;
                      return (
                        <button
                          key={sid}
                          type="button"
                          onClick={() => { handleStudentChange(sid); setStudentPickerOpen(false); setStudentSearch(''); }}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                            isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-900 text-white'
                          }`}>
                            {initials}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className={`truncate text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{name}</div>
                            <div className={`text-xs ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>{s.studentId || ''}</div>
                          </div>
                          {(s.grade || s.stream) && (
                            <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {s.grade}{s.stream ? ` · ${s.stream}` : ''}
                            </span>
                          )}
                          {isSelected && (
                            <svg className="h-4 w-4 shrink-0 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2.5">
                  <span className="text-xs text-slate-400">{sortedStudents.length} students total</span>
                  <button
                    type="button"
                    onClick={() => { setStudentPickerOpen(false); setStudentSearch(''); }}
                    className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

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
                  { label: 'Rank', value: card.rank ? `${card.rank}/${getStudentClassSize(card)}` : '—' },
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
