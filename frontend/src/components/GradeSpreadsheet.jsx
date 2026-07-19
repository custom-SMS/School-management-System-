import { useEffect, useMemo, useState, useContext } from 'react';
import axios from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import Navbar from './Navbar';

// emptyMarks is now built dynamically from components

// Each component is scored out of 100; weights (which sum to 100%) determine the final total.
const clampMark = (value) => {
  // Treat empty/whitespace/null/undefined as null (teacher intentionally left blank)
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const nextValue = Number(value);
  if (Number.isNaN(nextValue)) return null;
  if (nextValue < 0) return 0;
  if (nextValue > 100) return 100;
  return nextValue;
};

import { useAppSelector } from '../store/hooks';

export default function GradeSpreadsheet() {
  const user = useAppSelector((state) => state.auth.user);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gradingConfig, setGradingConfig] = useState({ components: [
    { name: 'Quiz', weight: 10 }, { name: 'Assignment', weight: 20 },
    { name: 'Midterm', weight: 30 }, { name: 'Final', weight: 40 },
  ] });

  const selectedClass = useMemo(
    () => classes.find((klass) => klass._id === selectedClassId) || null,
    [classes, selectedClassId],
  );

  const components = useMemo(
    () => gradingConfig.components.map(c => ({ field: c.name, label: c.name, weight: c.weight })),
    [gradingConfig],
  );

  const emptyMarks = useMemo(
    () => Object.fromEntries(components.map(c => [c.field, null])),
    [components],
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

  // Load the active grading structure so the weights match the backend computation.
  useEffect(() => {
    axios
      .get('/classroom/grading-structure')
      .then((res) => {
        if (res.data?.components) setGradingConfig({ components: res.data.components });
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const loadClasses = async () => {
      setLoadingClasses(true);
      setMessage('');

      try {
        const endpoint = (user?.role === 'Admin' || user?.role === 'SuperAdmin') ? '/assignments' : '/assignments/me';
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
  }, []);

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
          const existingMarks = existing?.marks || {};
          const normalized = Object.fromEntries(Object.entries(existingMarks).map(([k, v]) => [k, (typeof v === 'string' && v.trim() === '') ? null : v]));
          return {
            student,
            marks: { ...emptyMarks, ...normalized },
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
        marks: Object.fromEntries(
          components.map(c => [c.field, row.marks[c.field] != null ? row.marks[c.field] : null])
        ),
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

  const selectedClassName = selectedClass ? `${selectedClass.name}${selectedClass.stream ? ` (${selectedClass.stream})` : ''} • ${selectedClass.subject}` : 'No class selected';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-4xl border border-white/50 bg-white/75 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 border-b border-slate-200 pb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Classroom</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Gradebook: {selectedClassName}</h2>
            <p className="mt-2 text-sm text-slate-500">
              Enter each component out of 100. Final totals are computed using the active weights
              ({components.map(c => `${c.label} ${c.weight}%`).join(' • ')}).
            </p>
          </div>

          {message && (
            <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
              {message}
            </div>
          )}

          <div className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Select Class</span>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={loadingClasses}
              >
                <option value="">{loadingClasses ? 'Loading classes…' : 'Select a class'}</option>
                {classes.map((klass) => (
                  <option key={klass._id} value={klass._id}>
                    {klass.name} {klass.stream ? `(${klass.stream})` : ''} • {klass.subject}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="font-semibold text-slate-900">Class info</div>
              <div>{selectedClass ? `${selectedClass.students?.length || 0} students` : 'Choose a class to begin'}</div>
            </div>
          </div>

          <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-200 w-full divide-y divide-slate-200 text-sm sm:text-base">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Student Name</th>
                  {components.map((c) => (
                    <th key={c.field} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {c.label} ({c.weight}%)
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total (100%)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((row) => {
                  const total = calculateTotal(row.marks);
                  const percentage = total.toFixed(2);
                  const letterGrade = getLetterGrade(total);

                  return (
                    <tr key={row.student._id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 border-r border-slate-100">
                        <div>{row.student.user?.name || row.student.studentId}</div>
                        <div className="text-xs font-normal text-slate-500">{row.student.studentId}</div>
                      </td>
                      {components.map((c) => (
                        <td key={c.field} className="px-4 py-4 whitespace-nowrap text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.marks[c.field] ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              handleChange(row.student._id, c.field, raw === '' ? null : raw);
                            }}
                            className="w-16 p-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center"
                          />
                        </td>
                      ))}
                      <td className="bg-slate-50 px-4 py-4 whitespace-nowrap text-center font-bold text-slate-700">
                        {percentage}%
                      </td>
                      <td className={`bg-slate-50 px-4 py-4 whitespace-nowrap text-center font-bold ${letterGrade === 'F' ? 'text-red-600' : 'text-green-600'
                        }`}>
                        {letterGrade}
                      </td>
                    </tr>
                  );
                })}
                {!loadingGrades && rows.length === 0 && (
                  <tr>
                    <td colSpan={components.length + 3} className="px-6 py-8 text-center text-slate-500">
                      No grade records available for this class.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || loadingGrades || !selectedClass}
              className="rounded-2xl bg-linear-to-r from-indigo-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save to Database'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

