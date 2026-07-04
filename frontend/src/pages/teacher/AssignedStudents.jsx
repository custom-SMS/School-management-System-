import { useEffect, useMemo, useState } from 'react';
import { showPromptDialog } from '../../utils/sweetAlert';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import TeacherLayout from '../../components/TeacherLayout';

export default function AssignedStudents() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [selected, setSelected] = useState(() => new Set());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    axios
      .get('/assignments/me')
      .then((r) => {
        const list = Array.from(
          new Map(
            (r.data || [])
              .map((a) => a.class)
              .filter(Boolean)
              .map((k) => [k._id, k]),
          ).values(),
        );
        setClasses(list);
      })
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  // Flatten to a unique student directory, tagging each with its class/grade.
  const students = useMemo(() => {
    const map = new Map();
    classes.forEach((k) => {
      (k.students || []).forEach((s) => {
        if (!map.has(s._id)) {
          map.set(s._id, {
            id: s._id,
            name: s.user?.name || 'Student',
            studentId: s.studentId,
            grade: s.grade || k.name,
            className: k.name,
            subject: k.subject,
            guardians: s.guardians || s.guardianContacts || [],
          });
        }
      });
    });
    return Array.from(map.values());
  }, [classes]);

  const grades = useMemo(() => Array.from(new Set(students.map((s) => s.grade).filter(Boolean))), [students]);
  const classNames = useMemo(() => Array.from(new Set(classes.map((c) => c.name).filter(Boolean))), [classes]);

  const filtered = students.filter(
    (s) => (gradeFilter === 'all' || s.grade === gradeFilter) && (classFilter === 'all' || s.className === classFilter),
  );

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const messageSelectedParents = async () => {
    const { value: message } = await showPromptDialog({
      title: 'Message selected parents',
      inputPlaceholder: 'Message to send to selected parents',
    });
    if (!message?.trim()) return;

    setSending(true);
    try {
      const res = await axios.post('/notifications/parents', {
        studentIds: Array.from(selected),
        title: 'Message from teacher',
        message: message.trim(),
      });
      toast.success(res.data?.message || 'Notification sent to parents.');
      setSelected(new Set());
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to notify parents.');
    } finally {
      setSending(false);
    }
  };

  return (
    <TeacherLayout searchPlaceholder="Search student name or ID...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Assigned Students</h1>
          <p className="text-sm text-slate-500">Directory of students across your current academic workload.</p>
        </div>
        <button
          onClick={messageSelectedParents}
          disabled={selected.size === 0 || sending}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-40"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 6 12 13 22 6v12H2V6zm2-1h16l-8 5-8-5z" /></svg>
          {sending ? 'Sending...' : `Message Selected Parents${selected.size ? ` (${selected.size})` : ''}`}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-xs font-semibold uppercase text-slate-400">Filter by Grade</label>
          <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none">
            <option value="all">All Grades</option>
            {grades.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-xs font-semibold uppercase text-slate-400">Filter by Class</label>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none">
            <option value="all">All Classes</option>
            {classNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase text-slate-400">Total Students</div>
              <div className="text-2xl font-black text-slate-900">{students.length}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase text-slate-400">Classes</div>
              <div className="text-2xl font-black text-emerald-600">{classes.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Directory */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <th className="rounded-l-lg px-4 py-3"></th>
                <th className="px-4 py-3 font-semibold">Student Name</th>
                <th className="px-4 py-3 font-semibold">ID Number</th>
                <th className="px-4 py-3 font-semibold">Grade / Class</th>
                <th className="px-4 py-3 font-semibold">Parent Info</th>
                <th className="rounded-r-lg px-4 py-3 font-semibold">Subject</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="py-10 text-center text-slate-400">Loading students…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="py-10 text-center text-slate-400">No students match the current filters.</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="text-slate-700">
                    <td className="px-4 py-4"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} /></td>
                    <td className="px-4 py-4">
                      <Link to={`/teacher/students/${s.id}`} className="flex items-center gap-3 group">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                          {(s.name || 'NA').split(' ').map((x) => x[0]).slice(0, 2).join('')}
                        </span>
                        <span className="font-semibold text-slate-900 group-hover:underline">{s.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-4 font-mono">{s.studentId}</td>
                    <td className="px-4 py-4">{s.grade}</td>
                    <td className="px-4 py-4">
                      {s.guardians?.length > 0 ? (
                        <div className="flex flex-col text-xs text-slate-500">
                          {s.guardians.map(g => (
                            <span key={g.id || g._id}>{g.fullName} ({g.phone || 'No phone'})</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-slate-400">No parent info</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Link to={`/teacher/students/${s.id}`} className="font-semibold text-slate-500 hover:text-slate-900">{s.subject || 'View'}</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-400">Showing {filtered.length} of {students.length} students</p>
      </div>
    </TeacherLayout>
  );
}
