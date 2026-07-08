import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import TeacherLayout from '../../components/TeacherLayout';

const STATUSES = ['Present', 'Absent', 'Late'];

export default function TeacherAttendance() {
  const { user } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const endpoint = user?.role === 'Admin' ? '/assignments' : '/assignments/me';
    axios
      .get(endpoint)
      .then((res) => {
        const list = Array.from(
          new Map(
            (res.data || [])
              .map((a) => a.class)
              .filter(Boolean)
              .map((k) => [k._id, k]),
          ).values(),
        );
        setClasses(list);
        if (list.length) setSelectedClassId((c) => c || list[0]._id);
        // If a classId is present in the query params, prefer that
        try {
          const qp = new URLSearchParams(window.location.search);
          const qClass = qp.get('classId');
          if (qClass && list.some(l => l._id === qClass)) setSelectedClassId(qClass);
        } catch (e) { /* ignore */ }
      })
      .catch((err) => {
        setError(true);
        toast.error(err.response?.data?.message || 'Failed to load classes');
      });
  }, [user]);

  const selectedClass = classes.find((k) => k._id === selectedClassId);
  const students = useMemo(() => selectedClass?.students || [], [selectedClass]);

  useEffect(() => {
    const initial = {};
    students.forEach((s) => { initial[s._id] = 'Present'; });
    setAttendance(initial);
  }, [students]);

  const counts = useMemo(() => {
    const c = { Present: 0, Absent: 0, Late: 0 };
    Object.values(attendance).forEach((v) => { if (c[v] != null) c[v] += 1; });
    return c;
  }, [attendance]);

  const setAll = (status) => {
    const next = {};
    students.forEach((s) => { next[s._id] = status; });
    setAttendance(next);
  };

  const handleSubmit = async () => {
    if (!selectedClassId) return toast.error('Select a class first.');
    setSaving(true);
    try {
      const records = Object.keys(attendance).map((studentId) => ({ student: studentId, status: attendance[studentId] }));
      await axios.post('/classroom/attendance', { classId: selectedClassId, date, records, teacherId: user._id || user.id });
      toast.success('Attendance submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const toneFor = (status, active) => {
    if (!active) return 'bg-white text-slate-500 hover:bg-slate-50';
    if (status === 'Present') return 'bg-slate-900 text-white';
    if (status === 'Absent') return 'bg-rose-600 text-white';
    return 'bg-amber-500 text-white';
  };

  return (
    <TeacherLayout searchPlaceholder="Search students...">
      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-400">Section</label>
          <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none">
            <option value="">Select class</option>
            {classes.map((k) => <option key={k._id} value={k._id}>{k.name}{k.subject ? ` - ${k.subject}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-400">Subject</label>
          <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{selectedClass?.subject || '—'}</div>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-400">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none" />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Link
            to={selectedClassId ? `/teacher/attendance-records?classId=${selectedClassId}` : '/teacher/attendance-records'}
            className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-bold transition ${
              selectedClassId
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                : 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400'
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5zm2 0v14h12V9h-4V5H6zm2 7h8v2H8v-2zm0-4h5v2H8V8zm0 8h8v2H8v-2z" /></svg>
            View Attendance
          </Link>
          <button onClick={() => setAll('Present')} className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
            Mark All Present
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Total Students</div>
          <div className="mt-1 text-3xl font-black text-slate-900">{students.length}</div>
        </div>
        <div className="rounded-2xl border-l-4 border-emerald-500 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Present</div>
          <div className="mt-1 text-3xl font-black text-emerald-600">{counts.Present}</div>
        </div>
        <div className="rounded-2xl border-l-4 border-rose-500 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Absent</div>
          <div className="mt-1 text-3xl font-black text-rose-600">{counts.Absent}</div>
        </div>
        <div className="rounded-2xl border-l-4 border-amber-500 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Late</div>
          <div className="mt-1 text-3xl font-black text-amber-600">{counts.Late}</div>
        </div>
      </div>

      {/* Register */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Student Register</h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {error ? (
            <div className="col-span-full py-12 text-center text-sm font-semibold text-rose-500">Failed to load classes or students.</div>
          ) : !selectedClass ? (
            <div className="col-span-full py-12 text-center text-slate-400">Select a class to mark attendance.</div>
          ) : students.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400">No students in this class.</div>
          ) : (
            students.map((s) => (
              <div key={s._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                    {(s.user?.name || 'NA').split(' ').map((x) => x[0]).slice(0, 2).join('')}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{s.user?.name || 'Student'}</div>
                    <div className="text-xs text-slate-400">ID: {s.studentId}</div>
                  </div>
                </div>
                <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-bold uppercase">
                  {STATUSES.map((st) => (
                    <button
                      key={st}
                      onClick={() => setAttendance((a) => ({ ...a, [s._id]: st }))}
                      className={`px-3 py-2 transition ${toneFor(st, attendance[s._id] === st)}`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-xs text-slate-400">Auto-saved locally · submit to record</span>
          <button onClick={handleSubmit} disabled={saving || students.length === 0} className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-40">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h11l5 5v13H5V3zm2 2v5h8V7.8L13.2 5H7zm0 9v5h10v-5H7z" /></svg>
            {saving ? 'Submitting…' : 'Submit Attendance'}
          </button>
        </div>
      </div>
    </TeacherLayout>
  );
}
