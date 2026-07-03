import { useEffect, useMemo, useState } from 'react';
import { showPromptDialog } from '../../utils/sweetAlert';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import TeacherLayout from '../../components/TeacherLayout';

export default function StudentProfile() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [perf, setPerf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [notifyingParent, setNotifyingParent] = useState(false);
  const [gradingSettings, setGradingSettings] = useState({ gpaEnabled: false, passMark: 50 });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('/students').then((r) => (r.data || []).find((s) => (s._id || s.id) === studentId) || null).catch(() => null),
      axios.get(`/students/${studentId}/performance`).then((r) => r.data).catch(() => null),
      axios.get('/settings/public').then((r) => setGradingSettings(r.data?.grading || { gpaEnabled: false, passMark: 50 })).catch(() => {}),
    ])
      .then(([found, performance]) => {
        setStudent(found || (performance?.student ? { ...performance.student, user: { name: performance.student.name, email: performance.student.email } } : null));
        setPerf(performance);
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  const trend = perf?.trend || [];
  const subjects = useMemo(
    () => (perf?.subjects || []).map((s) => ({ name: s.subject, score: s.percentage })),
    [perf],
  );
  const attendanceCalendar = perf?.attendanceCalendar || [];
  const studentAverage = perf?.studentAverage ?? 0;
  const gpa = (studentAverage / 100 * 4).toFixed(2);
  const passStatus = studentAverage >= gradingSettings.passMark ? 'Pass' : 'Fail';

  const name = student?.user?.name || perf?.student?.name || 'Student';
  const initials = name.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

  const contactParent = async () => {
    const { value: message } = await showPromptDialog({
      title: `Message to ${name}'s parent`,
      inputPlaceholder: 'Type your message…',
    });
    if (!message?.trim()) return;

    setNotifyingParent(true);
    try {
      const res = await axios.post('/notifications/parents', {
        studentIds: [studentId],
        title: 'Message from teacher',
        message: message.trim(),
      });
      toast.success(res.data?.message || 'Notification sent to parent.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to notify parent.');
    } finally {
      setNotifyingParent(false);
    }
  };

  if (loading) {
    return <TeacherLayout><div className="py-20 text-center text-slate-400">Loading profile…</div></TeacherLayout>;
  }

  if (!student) {
    return (
      <TeacherLayout>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400">
          Student not found in your assigned roster. <Link to="/teacher/students" className="font-semibold text-slate-700 underline">Back to directory</Link>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout searchPlaceholder="Search student by name or ID...">
      {/* Back */}
      <div className="mb-4">
        <Link to="/teacher/students" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
          Back to Assigned Students
        </Link>
      </div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-xl font-black text-white">{initials}</span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{name}</h1>
            <p className="text-sm text-slate-500">ID: {student.studentId} · {student.grade}</p>
            <p className="text-sm text-slate-400">{student.user?.email || '—'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/teacher/students/${studentId}/attendance`} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
            Attendance Detail
          </Link>
          <button
            onClick={contactParent}
            disabled={notifyingParent}
            className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 6 12 13 22 6v12H2V6zm2-1h16l-8 5-8-5z" /></svg>
            {notifyingParent ? 'Sending...' : 'Contact Parent'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">
            {gradingSettings.gpaEnabled ? 'Current GPA' : 'Average Score'}
          </div>
          <div className="mt-1 text-3xl font-black text-slate-900">
            {gradingSettings.gpaEnabled ? (perf ? perf.gpa.toFixed(2) : '—') : `${studentAverage}%`}
          </div>
          {!gradingSettings.gpaEnabled && (
            <div className={`mt-1 text-xs font-semibold ${passStatus === 'Pass' ? 'text-emerald-600' : 'text-rose-600'}`}>Status: {passStatus}</div>
          )}
          <div className="mt-1 text-xs font-semibold text-slate-400">
            {gradingSettings.gpaEnabled ? `Average ${studentAverage}% · 4.0 scale` : `Pass mark: ${gradingSettings.passMark}%`}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Attendance %</div>
          <div className="mt-1 text-3xl font-black text-slate-900">{perf?.attendance?.rate ?? 0}%</div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: `${perf?.attendance?.rate ?? 0}%` }} /></div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Class Rank</div>
          <div className="mt-1 text-3xl font-black text-slate-900">{perf?.classRank?.rank ? `${String(perf.classRank.rank).padStart(2, '0')} / ${perf.classRank.total}` : '—'}</div>
          <div className="mt-1 text-xs text-slate-400">By average across Grade {perf?.student?.grade || student?.grade || '—'}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Academic trend */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Academic Trend</h2>
          {trend.length === 0 ? (
            <div className="mt-6 flex h-48 items-center justify-center text-sm text-slate-400">No grades recorded yet.</div>
          ) : (
            <div className="mt-6 flex h-48 items-end gap-6">
              {trend.map((t, i) => (
                <div key={`${t.label}-${i}`} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full items-end justify-center" style={{ height: '100%' }}>
                    <div className="w-full max-w-16 rounded-t-lg bg-slate-900" style={{ height: `${t.percentage}%`, opacity: 0.4 + (i / Math.max(1, trend.length)) * 0.5 }} />
                  </div>
                  <span className="text-xs font-medium text-slate-400">{t.label}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-center text-xs text-slate-400">Average percentage per month</p>
        </section>

        {/* Subject breakdown */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Subject Breakdown</h2>
          {subjects.length === 0 && <p className="mt-4 text-sm text-slate-400">No subject grades recorded yet.</p>}
          <div className="mt-5 space-y-4">
            {subjects.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{s.name}</span>
                  <span className="font-bold text-slate-900">{s.score}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: `${s.score}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Attendance heatmap */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Attendance Heatmap</h2>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-rose-500" /> Absent</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-yellow-400" /> Late</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-600" /> Present</span>
            </div>
          </div>
          {attendanceCalendar.length === 0 ? (
            <p className="text-sm text-slate-400">No attendance recorded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {attendanceCalendar.map((rec, i) => {
                const tone = rec.status === 'Present' ? 'bg-emerald-600' : rec.status === 'Late' ? 'bg-yellow-400' : 'bg-rose-500';
                return <span key={i} title={`${new Date(rec.date).toLocaleDateString()} · ${rec.status}`} className={`h-4 w-4 rounded-sm ${tone}`} />;
              })}
            </div>
          )}
        </section>

        {/* Teacher observations */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Teacher's Observations</h2>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <div className="text-xs font-semibold uppercase text-slate-400">Latest Grade Remark</div>
            <p className="mt-1">{perf?.latestComment || 'No remarks recorded yet.'}</p>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Type qualitative feedback for next parent meeting..."
            rows={3}
            className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-slate-300 focus:bg-white"
          />
          <button
            onClick={() => setNote('')}
            className="mt-3 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h11l5 5v13H5V3zm2 2v5h8V7.8L13.2 5H7z" /></svg>
            Save Progress Note
          </button>
        </section>
      </div>
    </TeacherLayout>
  );
}
