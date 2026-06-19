import { useEffect, useMemo, useState, useContext } from 'react';
import axios from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import AdminLayout from './AdminLayout';

const emptyMarks = { quiz: 0, assignment: 0, midterm: 0, final: 0 };

const clampMark = (value) => {
  let nextValue = Number(value);
  if (Number.isNaN(nextValue)) nextValue = 0;
  if (nextValue < 0) nextValue = 0;
  if (nextValue > 100) nextValue = 100;
  return nextValue;
};

export default function GradeSpreadsheet() {
  const { user } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState({ quizWeight: 10, assignmentWeight: 20, midtermWeight: 30, finalWeight: 40 });

  const selectedClass = useMemo(
    () => classes.find((klass) => klass._id === selectedClassId) || null,
    [classes, selectedClassId],
  );

  const components = useMemo(
    () => [
      { field: 'quiz', label: 'Quiz', weight: weights.quizWeight },
      { field: 'assignment', label: 'Assignment', weight: weights.assignmentWeight },
      { field: 'midterm', label: 'Midterm', weight: weights.midtermWeight },
      { field: 'final', label: 'Final', weight: weights.finalWeight },
    ],
    [weights],
  );

  const calculateTotal = (marks) =>
    components.reduce((sum, c) => sum + (Number(marks?.[c.field]) || 0) * (Number(c.weight) / 100), 0);

  const getLetterGrade = (total) => {
    if (total >= 90) return 'A';
    if (total >= 80) return 'B';
    if (total >= 70) return 'C';
    if (total >= 60) return 'D';
    return 'F';
  };

  useEffect(() => {
    axios
      .get('/classroom/grading-structure')
      .then((res) => {
        if (res.data) setWeights(res.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const loadClasses = async () => {
      setLoadingClasses(true);
      setMessage('');

      try {
        const endpoint = user?.role === 'Admin' ? '/assignments' : '/assignments/me';
        const res = await axios.get(endpoint);
        const availableClasses = Array.from(
          new Map(
            (res.data || [])
              .map((assignment) => assignment.class)
              .filter(Boolean)
              .map((klass) => [klass._id, klass]),
          ).values(),
        );
        setClasses(availableClasses);

        if (availableClasses.length > 0) {
          setSelectedClassId((current) => current || availableClasses[0]._id);
        }
      } catch (error) {
        setMessage(error.response?.data?.message || 'Failed to load classroom options');
      } finally {
        setLoadingClasses(false);
      }
    };

    loadClasses();
  }, [user?.role]);

  useEffect(() => {
    if (!selectedClass) {
      setRows([]);
      return;
    }

    let active = true;

    const loadGrades = async () => {
      setLoadingGrades(true);
      setMessage('');

      try {
        const res = await axios.get(`/classroom/grades/${selectedClass._id}/${encodeURIComponent(selectedClass.subject)}`);
        const existingGrades = res.data || [];
        const gradeMap = new Map(
          existingGrades.map((grade) => [
            grade.student?._id || grade.student,
            grade,
          ]),
        );

        const roster = (selectedClass.students || []).map((student) => {
          const existing = gradeMap.get(student._id);
          return {
            student,
            marks: { ...emptyMarks, ...(existing?.marks || {}) },
          };
        });

        if (active) {
          setRows(roster);
        }
      } catch (error) {
        if (active) {
          setMessage(error.response?.data?.message || 'Failed to load grades');
          setRows((selectedClass.students || []).map((student) => ({ student, marks: { ...emptyMarks } })));
        }
      } finally {
        if (active) {
          setLoadingGrades(false);
        }
      }
    };

    loadGrades();

    return () => {
      active = false;
    };
  }, [selectedClass]);

  const handleChange = (studentId, field, value) => {
    const numValue = clampMark(value);

    setRows((current) =>
      current.map((row) => {
        if (row.student._id !== studentId) return row;
        return {
          ...row,
          marks: {
            ...row.marks,
            [field]: numValue,
          },
        };
      }),
    );
  };

  const handleSave = async () => {
    if (!selectedClass) {
      setMessage('Please select a class first.');
      return;
    }

    if (!rows.length) {
      setMessage('No students available for the selected class.');
      return;
    }

    const payload = {
      classId: selectedClass._id,
      subject: selectedClass.subject,
      gradesData: rows.map((row) => ({
        student: row.student._id,
        marks: {
          quiz: row.marks.quiz,
          assignment: row.marks.assignment,
          midterm: row.marks.midterm,
          final: row.marks.final,
        },
      })),
    };

    try {
      setSaving(true);
      setMessage('');
      await axios.post('/classroom/grades', payload);
      setMessage('Grades saved successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const selectedClassName = selectedClass ? `${selectedClass.name} • ${selectedClass.subject}` : 'No class selected';
  const totalStudents = selectedClass?.students?.length || 0;
  const statusTone = message.toLowerCase().includes('success')
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <AdminLayout
      pageTitle="Class Gradebook"
      pageSubtitle="Manage class assessment entries using the shared academic workspace design."
      searchPlaceholder="Search classes, students, or grade entries..."
      headerAction={
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
            <div className="text-xs font-semibold">Active Weights</div>
            <div className="mt-1 text-sm text-slate-500">
              Quiz {weights.quizWeight}% · Assignment {weights.assignmentWeight}% · Midterm {weights.midtermWeight}% · Final {weights.finalWeight}%
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingGrades || !selectedClass}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save grades'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Classroom</p>
            <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-900">{selectedClassName}</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Enter each component out of 100. Final totals are computed from the active grading structure and match the backend calculation.
            </p>

            {message && (
              <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${statusTone}`}>
                {message}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Class info</div>
            <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">
              {selectedClass ? totalStudents : 0}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {selectedClass ? 'Students currently available for grade entry' : 'Choose a class to begin grade entry'}
            </p>
            {selectedClass && (
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">{selectedClass.name}</div>
                <div className="mt-1">{selectedClass.subject}</div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Select Class</span>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={loadingClasses}
              >
                <option value="">{loadingClasses ? 'Loading classes…' : 'Select a class'}</option>
                {classes.map((klass) => (
                  <option key={klass._id} value={klass._id}>
                    {klass.name} • {klass.subject}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="font-semibold text-slate-900">Grade summary</div>
              <div className="mt-1">
                {selectedClass ? `${totalStudents} students ready for grading` : 'No class selected'}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Student Name</th>
                  {components.map((c) => (
                    <th key={c.field} className="px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                      {c.label} ({c.weight}%)
                    </th>
                  ))}
                  <th className="px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Total</th>
                  <th className="px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((row) => {
                  const total = calculateTotal(row.marks);
                  const percentage = total.toFixed(2);
                  const letterGrade = getLetterGrade(total);

                  return (
                    <tr key={row.student._id} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-6 py-4 align-middle">
                        <div className="font-semibold text-slate-900">{row.student.user?.name || row.student.studentId}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.student.studentId}</div>
                      </td>
                      {components.map((c) => (
                        <td key={c.field} className="px-4 py-4 text-center align-middle">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.marks[c.field] || ''}
                            onChange={(e) => handleChange(row.student._id, c.field, e.target.value)}
                            className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm text-slate-800 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5"
                          />
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-4 py-4 text-center align-middle">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                          {percentage}%
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-center align-middle">
                        <span
                          className={`inline-flex min-w-10 justify-center rounded-full px-3 py-1 text-sm font-bold ${
                            letterGrade === 'F'
                              ? 'bg-rose-50 text-rose-600'
                              : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          {letterGrade}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {loadingGrades && (
                  <tr>
                    <td colSpan={components.length + 3} className="px-6 py-10 text-center text-slate-500">
                      Loading grades…
                    </td>
                  </tr>
                )}

                {!loadingGrades && rows.length === 0 && (
                  <tr>
                    <td colSpan={components.length + 3} className="px-6 py-10 text-center text-slate-500">
                      No grade records available for this class.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}