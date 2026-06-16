import { useEffect, useMemo, useState, useContext } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import TeacherLayout from '../../components/TeacherLayout';

const emptyMarks = { quiz: 0, assignment: 0, midterm: 0, final: 0 };
const clampMark = (v) => Math.min(100, Math.max(0, Number.isNaN(Number(v)) ? 0 : Number(v)));

export default function Gradebook() {
  const { user } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState({ quizWeight: 10, assignmentWeight: 20, midtermWeight: 30, finalWeight: 40 });

  const components = useMemo(() => [
    { field: 'quiz', label: 'Quiz', weight: weights.quizWeight },
    { field: 'assignment', label: 'Assignment', weight: weights.assignmentWeight },
    { field: 'midterm', label: 'Midterm', weight: weights.midtermWeight },
    { field: 'final', label: 'Final', weight: weights.finalWeight },
  ], [weights]);

  const selectedClass = useMemo(() => classes.find((k) => k._id === selectedClassId) || null, [classes, selectedClassId]);

  const calcTotal = (marks) => components.reduce((sum, c) => sum + (Number(marks?.[c.field]) || 0) * (Number(c.weight) / 100), 0);
  const letter = (t) => (t >= 90 ? 'A' : t >= 80 ? 'B' : t >= 70 ? 'C' : t >= 60 ? 'D' : 'F');

  useEffect(() => {
    axios.get('/classroom/grading-structure').then((r) => { if (r.data) setWeights(r.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    const endpoint = user?.role === 'Admin' ? '/assignments' : '/assignments/me';
    axios.get(endpoint).then((r) => {
      const list = Array.from(new Map((r.data || []).map((a) => a.class).filter(Boolean).map((k) => [k._id, k])).values());
      setClasses(list);
      if (list.length) setSelectedClassId((c) => c || list[0]._id);
    }).catch((e) => toast.error(e.response?.data?.message || 'Failed to load classes'));
  }, [user]);

  useEffect(() => {
    if (!selectedClass) { setRows([]); return; }
    let active = true;
    axios.get(`/classroom/grades/${selectedClass._id}/${encodeURIComponent(selectedClass.subject)}`)
      .then((r) => {
        const map = new Map((r.data || []).map((g) => [g.student?._id || g.student, g]));
        const roster = (selectedClass.students || []).map((s) => ({ student: s, marks: { ...emptyMarks, ...(map.get(s._id)?.marks || {}) } }));
        if (active) setRows(roster);
      })
      .catch(() => { if (active) setRows((selectedClass.students || []).map((s) => ({ student: s, marks: { ...emptyMarks } }))); });
    return () => { active = false; };
  }, [selectedClass]);

  const handleChange = (sid, field, value) =>
    setRows((cur) => cur.map((row) => (row.student._id === sid ? { ...row, marks: { ...row.marks, [field]: clampMark(value) } } : row)));

  const handleSave = async () => {
    if (!selectedClass || !rows.length) return toast.error('Select a class with students first.');
    setSaving(true);
    try {
      await axios.post('/classroom/grades', {
        classId: selectedClass._id,
        subject: selectedClass.subject,
        gradesData: rows.map((r) => ({ student: r.student._id, marks: r.marks })),
      });
      toast.success('Grades saved & published.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  // Analytics
  const totals = rows.map((r) => calcTotal(r.marks));
  const graded = totals.filter((t) => t > 0);
  const classAvg = graded.length ? (graded.reduce((a, b) => a + b, 0) / graded.length).toFixed(1) : '0.0';
  const highest = graded.length ? Math.max(...graded).toFixed(0) : 0;
  const lowest = graded.length ? Math.min(...graded).toFixed(0) : 0;
  const ranges = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  totals.forEach((t) => { if (t > 0) ranges[letter(t)] += 1; });

  return (
    <TeacherLayout searchPlaceholder="Search students...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Gradebook</h1>
          <p className="text-sm text-slate-500">Grade management and academic assessment entry.</p>
        </div>
        <button onClick={handleSave} disabled={saving || !selectedClass} className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-40">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10l3-3 1.4 1.4L12 16.8 7.6 11.4 9 10l3 3V3zM4 19h16v2H4z" transform="rotate(180 12 12)" /></svg>
          {saving ? 'Saving…' : 'Save & Publish'}
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-400">Class</label>
          <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none">
            <option value="">Select class</option>
            {classes.map((k) => <option key={k._id} value={k._id}>{k.name} · {k.subject}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-400">Weights</label>
          <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
            Q{weights.quizWeight} · A{weights.assignmentWeight} · M{weights.midtermWeight} · F{weights.finalWeight}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs font-semibold uppercase text-slate-400">Total / Graded</div>
          <div className="text-lg font-black text-slate-900">{rows.length} / {graded.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        {/* Score entry */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <th className="rounded-l-lg px-3 py-3 font-semibold">Student</th>
                  {components.map((c) => <th key={c.field} className="px-3 py-3 text-center font-semibold">{c.label} ({c.weight}%)</th>)}
                  <th className="px-3 py-3 text-center font-semibold">Total</th>
                  <th className="rounded-r-lg px-3 py-3 text-center font-semibold">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const total = calcTotal(row.marks);
                  const g = letter(total);
                  return (
                    <tr key={row.student._id} className="text-slate-700">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-900">{row.student.user?.name || row.student.studentId}</div>
                        <div className="text-xs text-slate-400">{row.student.studentId}</div>
                      </td>
                      {components.map((c) => (
                        <td key={c.field} className="px-3 py-3 text-center">
                          <input
                            type="number" min="0" max="100"
                            value={row.marks[c.field] || ''}
                            onChange={(e) => handleChange(row.student._id, c.field, e.target.value)}
                            className="w-16 rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-center outline-none focus:border-slate-400 focus:bg-white"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-bold text-slate-900">{total.toFixed(1)}%</td>
                      <td className={`px-3 py-3 text-center font-black ${g === 'F' ? 'text-rose-600' : 'text-emerald-600'}`}>{g}</td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={components.length + 3} className="py-10 text-center text-slate-400">Select a class to load its roster.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analytics */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Analytics</h3>
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase text-slate-400">Class Average</div>
              <div className="text-3xl font-black text-slate-900">{classAvg}%</div>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="font-semibold text-slate-600">Highest Score</span><span className="font-bold text-slate-900">{highest}%</span></div>
              <div className="flex items-center justify-between"><span className="font-semibold text-slate-600">Lowest Score</span><span className="font-bold text-slate-900">{lowest}%</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Grade Range</h3>
            <div className="space-y-2">
              {[['A', '90-100%', 'text-emerald-600'], ['B', '80-89%', 'text-blue-600'], ['C', '70-79%', 'text-amber-600'], ['D', '60-69%', 'text-orange-600'], ['F', '< 60%', 'text-rose-600']].map(([g, range, tone]) => (
                <div key={g} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 font-black ${tone}`}>{g}</span>
                    <span className="text-sm text-slate-500">{range}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{ranges[g]} Students</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            Grades publish to the Student Portal &amp; Parent App immediately after clicking <span className="font-bold text-slate-700">Save &amp; Publish</span>.
          </div>
        </aside>
      </div>
    </TeacherLayout>
  );
}
