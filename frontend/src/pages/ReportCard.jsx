import { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { usePublicSettings } from '../context/SettingsContext';

export default function ReportCard() {
  const { user } = useContext(AuthContext);
  const { grading: gradingSettings = {} } = usePublicSettings() || {};
  const passMark = Number(gradingSettings.passMark || 50);
  const gpaEnabled = Boolean(gradingSettings.gpaEnabled);

  const [studentStats, setStudentStats] = useState(null);
  const [reportCard, setReportCard] = useState(null); // { reportCard, grades }
  const [activeYear, setActiveYear] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [gradingConfig, setGradingConfig] = useState({ components: [
    { name: 'Quiz', weight: 10 }, { name: 'Assignment', weight: 20 },
    { name: 'Midterm', weight: 30 }, { name: 'Final', weight: 40 },
  ] });

  const gradingComponents = useMemo(() =>
    gradingConfig.components.map(c => ({ field: c.name, label: c.name, weight: c.weight })),
    [gradingConfig]
  );

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Report Card | School Management System';

    const load = async () => {
      if (user?.role !== 'Student') { setLoading(false); return; }

      try {
        const [statsRes, yearsRes, gradingRes] = await Promise.all([
          axios.get('/stats/student/me'),
          axios.get('/academic-years'),
          axios.get('/classroom/grading-structure').catch(() => ({ data: null })),
        ]);

        if (gradingRes.data?.components) {
          setGradingConfig({ components: gradingRes.data.components });
        }

        setStudentStats(statsRes.data);

        const active = (yearsRes.data || []).find((y) => y.isActive) || (yearsRes.data || [])[0] || null;
        setActiveYear(active);

        const studentId = statsRes.data?.profile?._id;
        if (active && studentId) {
          try {
            const rcRes = await axios.get(`/report-cards/${studentId}/${active.id}`);
            setReportCard(rcRes.data);
          } catch (rcErr) {
            const status = rcErr.response?.status;
            if (status === 403) setNotice('Your report card has not been published yet. Showing your current grade summary.');
            else if (status === 404) setNotice('No compiled report card is available yet. Showing your current grade summary.');
          }
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    };

    load();
    return () => { document.title = prevTitle; };
  }, [user]);

  // Normalise grade rows from either source
  const rawGrades = reportCard?.grades || studentStats?.grades || [];
  const gradeRows = rawGrades.map((g) => {
    const marks = g.marks || g;
    const pct = Number(g.percentage ?? 0);
    return {
      _id: g._id || g.id,
      subject: g.subject || '—',
      marks,
      total: Number(g.total ?? 0),
      percentage: pct,
      pass: pct >= passMark,
    };
  });

  const card = reportCard?.reportCard || null;
  const computedAvg = gradeRows.length
    ? Math.round(gradeRows.reduce((s, g) => s + g.percentage, 0) / gradeRows.length)
    : 0;
  const avgScore = card ? Math.round(Number(card.averageScore || 0)) : computedAvg;
  const gpa = (avgScore / 100 * 4).toFixed(2);

  const studentName = studentStats?.profile?.user?.name || '—';
  const studentId = studentStats?.studentId || studentStats?.profile?.studentId || '—';
  const gradeLevel = card?.grade || studentStats?.grade || studentStats?.profile?.grade || '—';
  const yearLabel = activeYear?.year || card?.academicYear?.year || '—';

  const attPct = card ? Math.round(Number(card.attendancePercentage || 0)) : (studentStats?.attendanceRate != null ? Math.round(Number(studentStats.attendanceRate)) : null);
  const present = card?.attendancePresent ?? null;
  const absent = card?.attendanceAbsent ?? null;
  const late = card?.attendanceLate ?? null;
  const total = card?.attendanceTotal ?? null;

  const bestSubject = gradeRows.reduce((best, g) => (!best || g.percentage > best.percentage ? g : best), null);

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex items-center justify-center py-32 text-slate-400">Loading report card…</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header card */}
        <div className="no-print mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Academic Record</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
            {card ? 'Official Report Card' : 'Grade Summary'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {card ? 'Compiled report card including class rank, attendance breakdown, and homeroom review.'
              : 'Current grade summary — official report card not yet published.'}
          </p>
          {notice && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              {notice}
            </div>
          )}
          {card?.published && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              ✓ Published report card
            </div>
          )}
          {card && !card.published && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600">
              ⏳ Awaiting publication
            </div>
          )}
        </div>

        {/* Printable area */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 10mm; }
              html, body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              nav, .no-print { display: none !important; }
              .printable { box-shadow: none !important; border: 0 !important; border-radius: 0 !important; }
              table th, table td { font-size: 10px !important; padding: 5px 8px !important; }
            }
          `}</style>

          {/* Print button */}
          <div className="no-print flex justify-end border-b border-slate-100 px-6 py-4">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
              </svg>
              Print Report Card
            </button>
          </div>

          <div className="printable p-6 sm:p-10">
            {/* School header */}
            <div className="mb-8 border-b-2 border-slate-900 pb-6 text-center">
              <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900">
                {card ? 'Official Report Card' : 'Grade Summary'}
              </h1>
              <p className="mt-2 text-base text-slate-500">Academic Year: <strong>{yearLabel}</strong></p>
            </div>

            {/* Student info */}
            <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Student Name', value: studentName },
                { label: 'Student ID', value: studentId },
                { label: 'Grade Level', value: gradeLevel },
                { label: 'Average Score', value: `${avgScore}%`, extra: gpaEnabled ? `GPA: ${gpa}` : null },
              ].map((f) => (
                <div key={f.label} className="rounded-xl bg-slate-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{f.label}</div>
                  <div className="mt-1 text-lg font-black text-slate-900">{f.value}</div>
                  {f.extra && <div className="text-xs text-slate-400">{f.extra}</div>}
                </div>
              ))}
            </div>

            {/* Summary strip */}
            <div className="mb-8 grid gap-3 sm:grid-cols-3">
              {/* Rank */}
              <div className="rounded-xl bg-indigo-50 px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Class Rank</div>
                <div className="mt-1 text-2xl font-black text-indigo-800">
                  {card?.rank ? `#${card.rank}` : '—'}
                </div>
              </div>

              {/* Attendance */}
              <div className="rounded-xl bg-blue-50 px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">Attendance</div>
                <div className="mt-1 text-2xl font-black text-blue-800">
                  {attPct != null ? `${attPct}%` : '—'}
                </div>
                {total != null && total > 0 && (
                  <div className="mt-1 text-xs text-blue-600">
                    Present: {present} · Absent: {absent} · Late: {late} · Total: {total}
                  </div>
                )}
              </div>

              {/* Promotion */}
              <div className={`rounded-xl px-5 py-4 ${card?.promotionStatus === 'Promoted' ? 'bg-emerald-50'
                  : card?.promotionStatus === 'Not Promoted' ? 'bg-rose-50'
                    : card?.promotionStatus === 'Conditional Promotion' ? 'bg-amber-50'
                      : 'bg-slate-50'
                }`}>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Promotion Status</div>
                <div className={`mt-1 text-xl font-black ${card?.promotionStatus === 'Promoted' ? 'text-emerald-700'
                    : card?.promotionStatus === 'Not Promoted' ? 'text-rose-700'
                      : card?.promotionStatus === 'Conditional Promotion' ? 'text-amber-700'
                        : 'text-slate-500'
                  }`}>
                  {card?.promotionStatus && card.promotionStatus !== 'Pending'
                    ? card.promotionStatus
                    : 'Pending Review'}
                </div>
              </div>
            </div>

            {/* Best subject + conduct */}
            {(bestSubject || card?.conductGrade) && (
              <div className="mb-8 grid gap-3 sm:grid-cols-2">
                {bestSubject && (
                  <div className="rounded-xl bg-emerald-50 px-5 py-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Top Subject</div>
                    <div className="mt-1 text-lg font-black text-emerald-800">
                      {bestSubject.subject} <span className="font-normal text-emerald-600">({bestSubject.percentage}%)</span>
                    </div>
                  </div>
                )}
                {card?.conductGrade && (
                  <div className="rounded-xl bg-violet-50 px-5 py-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-violet-600">Conduct Grade</div>
                    <div className="mt-1 text-lg font-black text-violet-800">{card.conductGrade}</div>
                  </div>
                )}
              </div>
            )}

            {/* Grades table */}
            <div className="mb-8 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-center text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="border border-slate-800 px-4 py-3 font-semibold">Subject</th>
                    {gradingComponents.map((c) => (
                      <th key={c.field} className="border border-slate-800 px-4 py-3 font-semibold">{c.label}</th>
                    ))}
                    {['Total', '%', 'Status'].map((h) => (
                      <th key={h} className="border border-slate-800 px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {gradeRows.length > 0 ? gradeRows.map((g) => (
                    <tr key={g._id} className="hover:bg-slate-50 transition">
                      <td className="border border-slate-100 px-4 py-3 text-left font-semibold text-slate-900">{g.subject}</td>
                      {gradingComponents.map((c) => (
                        <td key={c.field} className="border border-slate-100 px-4 py-3">{g.marks?.[c.field] ?? '—'}</td>
                      ))}
                      <td className="border border-slate-100 px-4 py-3 font-bold text-slate-900">{g.total}</td>
                      <td className="border border-slate-100 px-4 py-3 font-bold text-slate-900">{g.percentage}%</td>
                      <td className={`border border-slate-100 px-4 py-3 font-bold ${g.pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {g.pass ? 'Pass' : 'Fail'}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={gradingComponents.length + 4} className="px-4 py-8 text-slate-400">No grades available yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Comments section */}
            {(card?.teacherComments || card?.homeroomRemarks) && (
              <div className="mb-8 space-y-3">
                {card.teacherComments && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Teacher Comments</div>
                    <p className="text-sm text-slate-700">{card.teacherComments}</p>
                  </div>
                )}
                {card.homeroomRemarks && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">Homeroom Teacher Remarks</div>
                    <p className="text-sm text-indigo-800">{card.homeroomRemarks}</p>
                  </div>
                )}
              </div>
            )}

            {/* Signature row */}
            <div className="grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-3">
              {['Class Teacher Signature', 'Principal Signature', 'Date Generated'].map((label, i) => (
                <div key={label} className="text-center">
                  {i === 2
                    ? <p className="mb-2 text-sm text-slate-600">{new Date().toLocaleDateString()}</p>
                    : <div className="mb-4 h-8" />}
                  <div className="border-b border-slate-900" />
                  <p className="mt-2 text-xs font-semibold text-slate-600">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
