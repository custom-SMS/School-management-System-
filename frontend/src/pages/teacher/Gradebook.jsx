import { useEffect, useMemo, useState, useContext } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import TeacherLayout from '../../components/TeacherLayout';
import { useBranch } from '../../context/BranchContext';



const emptyMarks = { quiz: 0, assignment: 0, midterm: 0, final: 0 };

const emptyErrors = { quiz: false, assignment: false, midterm: false, final: false };



export default function Gradebook() {
  const { user } = useContext(AuthContext);
  const { activeSemester } = useBranch();

  const [classes, setClasses] = useState([]);

  const [selectedClassId, setSelectedClassId] = useState('');

  const [rows, setRows] = useState([]);
  const [markErrors, setMarkErrors] = useState({});

  const [saving, setSaving] = useState(false);

  const [publishing, setPublishing] = useState(false);

  const [error, setError] = useState(false);

  const [weights, setWeights] = useState({ quizWeight: 10, assignmentWeight: 20, midtermWeight: 30, finalWeight: 40 });



  const components = useMemo(() => [

    { field: 'quiz', label: 'Quiz', weight: weights.quizWeight },

    { field: 'assignment', label: 'Assignment', weight: weights.assignmentWeight },

    { field: 'midterm', label: 'Midterm', weight: weights.midtermWeight },

    { field: 'final', label: 'Final', weight: weights.finalWeight },

  ], [weights]);



  const selectedClass = useMemo(() => classes.find((k) => k._id === selectedClassId) || null, [classes, selectedClassId]);



  // Calculate total percentage for a row's marks.

  // Teacher enters raw points out of the component weight (e.g., enter 8 for Quiz when weight=10).

  // The total is the sum of weighted contributions.

  const calcTotal = (marks) => components.reduce((sum, c) => {

    const raw = Number(marks?.[c.field]) || 0;

    const weight = Number(c.weight);

    if (weight === 0) return sum;

    // Handle both raw score input and percentage input from saved data

    // If raw > weight, it's likely a percentage (e.g., 80 for 80%), convert back to contribution

    // If raw <= weight, it's raw points (e.g., 8 out of 10), contribution is the raw value

    const contribution = raw > weight ? (raw / 100) * weight : raw;

    return sum + contribution;

  }, 0);



  useEffect(() => {

    axios.get('/classroom/grading-structure').then((r) => { if (r.data) setWeights(r.data); }).catch(() => { });

  }, []);



  useEffect(() => {

    const endpoint = user?.role === 'Admin' ? '/assignments' : '/assignments/me';

    axios.get(endpoint).then((r) => {

      const list = Array.from(new Map((r.data || []).map((a) => a.class).filter(Boolean).map((k) => [k._id, k])).values());

      setClasses(list);

      if (list.length) setSelectedClassId((c) => c || list[0]._id);

    }).catch((e) => {

      setError(true);

      toast.error(e.response?.data?.message || 'Failed to load classes');

    });

  }, [user]);



  useEffect(() => {
    if (!selectedClass) { setRows([]); return; }
    let active = true;
    const semParam = activeSemester?.id ? `?semesterId=${activeSemester.id}` : '';
    axios.get(`/classroom/grades/${selectedClass._id}/${encodeURIComponent(selectedClass.subject)}${semParam}`)

      .then((r) => {

        const map = new Map((r.data || []).map((g) => [g.student?._id || g.student, g]));

        const roster = (selectedClass.students || []).map((s) => {
          const gradeEntry = map.get(s._id);
          const savedMarks = gradeEntry?.marks || {};
          const status = gradeEntry?.submissionStatus || 'Draft';

          const displayMarks = {};

          components.forEach((c) => {

            const pct = Number(savedMarks[c.field]) || 0;

            const weight = Number(c.weight);

            displayMarks[c.field] = weight === 0 ? 0 : (pct / 100) * weight;

          });

          return { student: s, marks: { ...emptyMarks, ...displayMarks }, status };

        });

        if (active) setRows(roster);

      })

      .catch(() => { if (active) setRows((selectedClass.students || []).map((s) => ({ student: s, marks: { ...emptyMarks } }))); });

    return () => { active = false; };

  }, [selectedClass, components]);



  const handleChange = (sid, field, value) => {

    const component = components.find((c) => c.field === field);

    const maxAllowed = Number(component?.weight || 0);

    // Clear error state when field is emptied
    if (value === '') {
      setMarkErrors((prev) => ({ ...prev, [`${sid}_${field}`]: false }));
      setRows((cur) =>
        cur.map((row) => (row.student._id === sid ? { ...row, marks: { ...row.marks, [field]: '' } } : row)),
      );
      return;
    }


    const numValue = Number(value);

    if (Number.isNaN(numValue) || numValue < 0) {
      setRows((cur) =>
        cur.map((row) =>
          row.student._id === sid ? { ...row, marks: { ...row.marks, [field]: 0 } } : row,
        ),
      );
      setMarkErrors((prev) => ({ ...prev, [`${sid}_${field}`]: false }));
      return;
    }

    // If value exceeds max, keep the typed value visible and warn the teacher
    if (numValue > maxAllowed) {
      setRows((cur) =>
        cur.map((row) =>
          row.student._id === sid ? { ...row, marks: { ...row.marks, [field]: numValue } } : row,
        ),
      );
      setMarkErrors((prev) => ({ ...prev, [`${sid}_${field}`]: true }));
      toast.warn(
        `⚠️ ${component.label} mark (${numValue}) exceeds the maximum allowed (${maxAllowed}). Please correct it before saving.`,
        { toastId: `mark-over-${sid}-${field}` }, // prevent duplicate toasts
      );
      return;
    }

    // Valid value — clear any previous error for this cell
    setMarkErrors((prev) => ({ ...prev, [`${sid}_${field}`]: false }));

    setRows((cur) =>
      cur.map((row) =>
        row.student._id === sid
          ? { ...row, marks: { ...row.marks, [field]: numValue } }
          : row,
      ),
    );

  };

  const hasMarkErrors = Object.values(markErrors).some(Boolean);

  const handleSave = async () => {

    if (!selectedClass || !rows.length) return toast.error('Select a class with students first.');
    if (hasMarkErrors) return toast.error('Some marks exceed the allowed maximum. Please fix the highlighted fields before saving.');
    setSaving(true);

    try {

      // Convert raw scores to percentages before sending to backend (backend expects 0-100 values per component)

      const gradesData = rows.map((r) => {

        const marks = {};

        components.forEach((c) => {

          const raw = Number(r.marks[c.field]) || 0;

          const weight = Number(c.weight);

          // Convert raw score to percentage

          const pct = weight === 0 ? 0 : (raw / weight) * 100;

          marks[c.field] = Number(pct.toFixed(2));

        });

        return { student: r.student._id, marks };

      });



      await axios.post('/classroom/grades', {
        classId: selectedClass._id,
        subject: selectedClass.subject,
        gradesData,
        semesterId: activeSemester?.id || undefined,
        publish: false,
      });

      toast.success('Grades saved as draft.');

    } catch (e) {

      toast.error(e.response?.data?.message || 'Failed to save grades');

    } finally {

      setSaving(false);

    }

  };



  const handlePublish = async () => {

    if (!selectedClass || !rows.length) return toast.error('Select a class with students first.');
    if (hasMarkErrors) return toast.error('Some marks exceed the allowed maximum. Please fix the highlighted fields before publishing.');
    setPublishing(true);

    try {

      // Convert raw scores to percentages before sending to backend (backend expects 0-100 values per component)

      const gradesData = rows.map((r) => {

        const marks = {};

        components.forEach((c) => {

          const raw = Number(r.marks[c.field]) || 0;

          const weight = Number(c.weight);

          // Convert raw score to percentage

          const pct = weight === 0 ? 0 : (raw / weight) * 100;

          marks[c.field] = Number(pct.toFixed(2));

        });

        return { student: r.student._id, marks };

      });



      await axios.post('/classroom/grades', {
        classId: selectedClass._id,
        subject: selectedClass.subject,
        gradesData,
        semesterId: activeSemester?.id || undefined,
        submitToHomeroom: true,
      });

      toast.success('Grades submitted to homeroom teacher for review.');

    } catch (e) {

      toast.error(e.response?.data?.message || 'Failed to publish grades');

    } finally {

      setPublishing(false);

    }

  };



  // Analytics

  const totals = rows.map((r) => calcTotal(r.marks));

  const graded = totals.filter((t) => t > 0);

  const classAvg = graded.length ? (graded.reduce((a, b) => a + b, 0) / graded.length).toFixed(1) : '0.0';

  const highest = graded.length ? Math.max(...graded).toFixed(0) : 0;

  const lowest = graded.length ? Math.min(...graded).toFixed(0) : 0;



  return (

    <TeacherLayout searchPlaceholder="Search students...">

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">

        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Gradebook</h1>
          <p className="text-sm text-slate-500">Grade management and academic assessment entry.</p>
          {activeSemester && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs font-bold text-violet-700">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-500"></div>
              {activeSemester.name}{activeSemester.academicYear?.year ? ` · ${activeSemester.academicYear.year}` : ''}
            </div>
          )}
        </div>

        <div className="flex gap-2">

          <button onClick={handleSave} disabled={saving || !selectedClass} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">

            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" /></svg>

            {saving ? 'Saving…' : 'Save Draft'}

          </button>

          <button onClick={handlePublish} disabled={publishing || !selectedClass} className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-40">

            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10l3-3 1.4 1.4L12 16.8 7.6 11.4 9 10l3 3V3zM4 19h16v2H4z" transform="rotate(180 12 12)" /></svg>

            {publishing ? 'Publishing…' : 'Publish to Homeroom'}

          </button>

        </div>

      </div>



      <div className="mb-5 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div>

          <label className="text-xs font-semibold uppercase text-slate-400">Class</label>

          <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none">

            <option value="">Select class</option>

            {classes.map((k) => <option key={k._id} value={k._id}>{k.name} {k.stream ? `(${k.stream})` : ''} · {k.subject}</option>)}

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

                  <th className="px-3 py-3 text-center font-semibold">Total (out of 100)</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {error ? (

                  <tr><td colSpan={components.length + 2} className="py-10 text-center text-sm font-semibold text-rose-500">Failed to load gradebook data.</td></tr>

                ) : rows.length === 0 ? (

                  <tr><td colSpan={components.length + 2} className="py-10 text-center text-slate-400">Select a class to load its roster.</td></tr>

                ) : (

                  rows.map((row) => {

                    const total = calcTotal(row.marks);

                    return (

                      <tr key={row.student._id} className="text-slate-700">

                        <td className="px-3 py-3">

                          <div className="font-semibold text-slate-900">{row.student.user?.name || row.student.studentId}</div>

                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400">{row.student.studentId}</span>
                            {row.status && row.status !== 'Draft' && (
                              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ring-1 ring-inset ${
                                row.status === 'SubmittedToHomeroom'
                                  ? 'bg-amber-50 text-amber-800 ring-amber-600/20'
                                  : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                              }`}>
                                {row.status === 'SubmittedToHomeroom' ? 'Submitted' : 'Approved'}
                              </span>
                            )}
                          </div>

                        </td>

                        {components.map((c) => {
                          const isOverLimit = !!markErrors[`${row.student._id}_${c.field}`];
                          const isLocked = row.status === 'SubmittedToHomeroom' || row.status === 'ApprovedByHomeroom';
                          return (

                            <td key={c.field} className="px-3 py-3 text-center">

                              <input

                                type="number" min="0"

                                value={row.marks[c.field] === 0 ? '' : (row.marks[c.field] || '')}

                                onChange={(e) => handleChange(row.student._id, c.field, e.target.value)}
                                disabled={isLocked}

                                className={`w-16 rounded-lg border p-1.5 text-center outline-none transition-colors ${isOverLimit
                                  ? 'border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:bg-red-50'
                                  : isLocked
                                  ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'border-slate-200 bg-slate-50 focus:border-slate-400 focus:bg-white'
                                  }`}

                              />

                              <div className={`text-[10px] ${isOverLimit ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
                                / {c.weight}{isOverLimit && ' ⚠️'}
                              </div>

                            </td>

                          );
                        })}

                        <td className="px-3 py-3 text-center font-bold text-slate-900">{total.toFixed(2)}/100</td>

                      </tr>

                    );

                  })

                )}

                {rows.length === 0 && <tr><td colSpan={components.length + 2} className="py-10 text-center text-slate-400">Select a class to load its roster.</td></tr>}

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



          {/* Grade range removed per request */}



          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">

            <strong>Save Draft:</strong> Saves grades for later editing (not visible to students/parents).<br />

            <strong>Submit to Homeroom:</strong> Sends grades to homeroom teacher for review and approval.

          </div>

        </aside>

      </div>

    </TeacherLayout>

  );

}

