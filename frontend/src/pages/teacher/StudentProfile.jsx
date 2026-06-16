import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from '../../api/axios';
import TeacherLayout from '../../components/TeacherLayout';

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4'];

export default function StudentProfile() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => {
    axios
      .get('/students')
      .then((r) => setStudent((r.data || []).find((s) => (s._id || s.id) === studentId) || null))
      .catch(() => setStudent(null))
      .finally(() => setLoading(false));
  }, [studentId]);

  // Representative academic visuals (no per-student teacher analytics endpoint yet).
  const trend = useMemo(() => [62, 71, 80, 92], []);
  const subjects = useMemo(
    () => [
      { name: 'Amharic Literature', score: 92 },
      { name: 'Advanced Mathematics', score: 88 },
      { name: 'Physics', score: 95 },
      { name: 'Ethiopian History', score: 78 },
      { name: 'ICT & Programming', score: 98 },
    ],
    [],
  );
  const months = ['September', 'October', 'November', 'December'];

  const name = student?.user?.name || 'Student';
  const initials = name.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

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
          <button className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 6 12 13 22 6v12H2V6zm2-1h16l-8 5-8-5z" /></svg>
            Contact Parent
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Current GPA</div>
          <div className="mt-1 text-3xl font-black text-slate-900">3.82</div>
          <div className="mt-1 text-xs font-semibold text-emerald-600">↗ +0.15 from Term 1</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Attendance %</div>
          <div className="mt-1 text-3xl font-black text-slate-900">96.4%</div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: '96%' }} /></div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Class Rank</div>
          <div className="mt-1 text-3xl font-black text-slate-900">04 / 42</div>
          <div className="mt-1 text-xs text-slate-400">Top 10% Percentile</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Academic trend */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Academic Trend</h2>
          <div className="mt-6 flex h-48 items-end gap-6">
            {trend.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full items-end justify-center" style={{ height: '100%' }}>
                  <div className="w-full max-w-16 rounded-t-lg bg-slate-900" style={{ height: `${v}%`, opacity: 0.35 + i * 0.18 }} />
                </div>
                <span className="text-xs font-medium text-slate-400">{TERMS[i]}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">GPA based on 4.0 weighted scale</p>
        </section>

        {/* Subject breakdown */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Subject Breakdown</h2>
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
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-slate-200" /> Absent</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-slate-400" /> Late</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-slate-900" /> Present</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {months.map((m, mi) => (
              <div key={m}>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{m.slice(0, 3)}</div>
                <div className="grid grid-cols-5 gap-1">
                  {Array.from({ length: 20 }).map((_, i) => {
                    const r = (i * 7 + mi * 3) % 11;
                    const tone = r === 0 ? 'bg-slate-200' : r === 1 ? 'bg-slate-400' : 'bg-slate-900';
                    return <span key={i} className={`h-3.5 w-3.5 rounded-sm ${tone}`} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Teacher observations */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Teacher's Observations</h2>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <div className="text-xs font-semibold uppercase text-slate-400">Recent Remark</div>
            <p className="mt-1">{name.split(' ')[0]} shows strong aptitude in STEM subjects. Encourage more focus on presentation skills.</p>
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
