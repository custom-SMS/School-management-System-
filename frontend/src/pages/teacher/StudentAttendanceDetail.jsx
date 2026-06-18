import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import TeacherLayout from '../../components/TeacherLayout';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function StudentAttendanceDetail() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [perf, setPerf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifyingParent, setNotifyingParent] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('/students').then((r) => (r.data || []).find((s) => (s._id || s.id) === studentId) || null).catch(() => null),
      axios.get(`/students/${studentId}/performance`).then((r) => r.data).catch(() => null),
    ])
      .then(([found, performance]) => {
        setStudent(found || (performance?.student ? { ...performance.student, user: { name: performance.student.name } } : null));
        setPerf(performance);
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  const attendance = perf?.attendance || { present: 0, late: 0, absent: 0, total: 0, rate: 0 };

  // Real recent register from the attendance feed.
  const days = useMemo(
    () => (perf?.attendanceCalendar || []).map((rec) => ({
      day: new Date(rec.date).getDate(),
      status: rec.status === 'Present' ? 'present' : rec.status === 'Late' ? 'late' : 'absent',
    })),
    [perf],
  );

  const studentAvg = perf?.studentAverage ?? 0;
  const classAvg = perf?.classAverage ?? 0;

  const name = student?.user?.name || perf?.student?.name || 'Student';
  const initials = name.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

  const tone = {
    present: 'bg-emerald-100 text-emerald-700',
    late: 'bg-amber-100 text-amber-700',
    absent: 'bg-rose-100 text-rose-700',
    off: 'bg-slate-50 text-slate-300',
  };

  const notifyParent = async () => {
    const defaultMessage = `${name}'s attendance is currently ${attendance.rate}%. Please check the attendance section for details.`;
    const message = window.prompt(`Message to ${name}'s parent`, defaultMessage);
    if (!message?.trim()) return;

    setNotifyingParent(true);
    try {
      const res = await axios.post('/notifications/parents', {
        studentIds: [studentId],
        title: 'Attendance update',
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
    return <TeacherLayout><div className="py-20 text-center text-slate-400">Loading…</div></TeacherLayout>;
  }
  if (!student) {
    return (
      <TeacherLayout>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400">
          Student not found. <Link to="/teacher/students" className="font-semibold text-slate-700 underline">Back to directory</Link>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout searchPlaceholder="Search students...">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link to="/teacher/students" className="hover:text-slate-700">Students</Link>
          <span>›</span>
          <Link to={`/teacher/students/${studentId}`} className="hover:text-slate-700">{name}</Link>
          <span>›</span>
          <span className="font-semibold text-slate-900">Attendance</span>
        </div>
        <button
          onClick={notifyParent}
          disabled={notifyingParent}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 6 12 13 22 6v12H2V6zm2-1h16l-8 5-8-5z" /></svg>
          {notifyingParent ? 'Sending...' : 'Notify Parent'}
        </button>
      </div>

      {/* Header + status cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-base font-black text-white">{initials}</span>
            <div>
              <div className="font-bold text-slate-900">{name}</div>
              <div className="text-xs text-slate-400">ID: {student.studentId}</div>
            </div>
          </div>
          <div className="mt-4 text-sm">
            <div className="text-xs font-semibold uppercase text-slate-400">Grade</div>
            <div className="font-semibold text-slate-900">{student.grade}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg></span>
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Present</span>
          </div>
          <div className="mt-4 text-3xl font-black text-slate-900">{attendance.present}</div>
          <div className="text-xs text-slate-400">Days Attended</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 11h4v-2h-2V7h-2v6z" /></svg></span>
            <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">Late</span>
          </div>
          <div className="mt-4 text-3xl font-black text-slate-900">{attendance.late}</div>
          <div className="text-xs text-slate-400">Late Arrivals</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm3.5 13.1L13.4 13l2.1-2.1-1.4-1.4L12 11.6 9.9 9.5 8.5 10.9 10.6 13l-2.1 2.1 1.4 1.4L12 14.4l2.1 2.1z" /></svg></span>
            <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">Absent</span>
          </div>
          <div className="mt-4 text-3xl font-black text-slate-900">{attendance.absent}</div>
          <div className="text-xs text-slate-400">Days Missed</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Calendar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Monthly Register</h2>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-200" /> Present</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-200" /> Late</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-rose-200" /> Absent</span>
            </div>
          </div>
          {days.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No attendance recorded yet.</p>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {WEEKDAYS.map((d) => <div key={d} className="text-center text-xs font-bold uppercase text-slate-400">{d}</div>)}
              {days.map((d, i) => (
                <div key={i} className={`flex h-14 items-center justify-center rounded-lg text-sm font-bold ${tone[d.status]}`}>
                  {d.day}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Benchmarking */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Performance Benchmarking</h2>
          <p className="text-sm text-slate-500">Individual vs. class average</p>
          <div className="mt-6 space-y-5">
            <div>
              <div className="flex items-center justify-between text-sm"><span className="font-semibold text-slate-700">{name.split(' ')[0]}</span><span className="font-bold text-slate-900">{studentAvg}%</span></div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: `${studentAvg}%` }} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm"><span className="font-semibold text-slate-700">Class Average</span><span className="font-bold text-slate-900">{classAvg}%</span></div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-400" style={{ width: `${classAvg}%` }} /></div>
            </div>
          </div>
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm italic text-slate-500">
            {perf
              ? `${name.split(' ')[0]} is performing ${Math.abs(studentAvg - classAvg)}% ${studentAvg >= classAvg ? 'above' : 'below'} the Grade ${perf.student?.grade || ''} average across recorded grades.`
              : 'Performance benchmarking will appear once grades are recorded.'}
          </div>
        </section>
      </div>
    </TeacherLayout>
  );
}
