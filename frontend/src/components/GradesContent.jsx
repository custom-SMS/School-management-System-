/**
 * Shared grades view/edit content used by both AdminGrades and SuperAdminGrades.
 * - Admin: view-only (canEdit=false)
 * - SuperAdmin: view + edit (canEdit=true)
 * Pass canEdit as a prop from the wrapper page.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import axios from '../api/axios';
import { toast } from 'react-toastify';
import { useBranch } from '../context/BranchContext';

// ─── helpers ─────────────────────────────────────────────────────────────────
const clampMark = (value, max = 100) => {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  if (n < 0) return 0;
  if (n > max) return max;
  return n;
};

// ─── component ────────────────────────────────────────────────────────────────
export default function GradesContent({ canEdit = false }) {
  const { selectedBranchId, branches, switchBranch, canSwitchBranch } = useBranch();

  // ── grading weights ──────────────────────────────────────────────────────
  const [weights, setWeights] = useState({
    quizWeight: 10, assignmentWeight: 20, midtermWeight: 30, finalWeight: 40,
  });

  useEffect(() => {
    axios.get('/classroom/grading-structure')
      .then((r) => { if (r.data) setWeights(r.data); })
      .catch(() => { });
  }, []);

  const components = useMemo(() => [
    { field: 'quiz', label: 'Quiz', weight: weights.quizWeight },
    { field: 'assignment', label: 'Assignment', weight: weights.assignmentWeight },
    { field: 'midterm', label: 'Midterm', weight: weights.midtermWeight },
    { field: 'final', label: 'Final', weight: weights.finalWeight },
  ], [weights]);

  const getMaxForField = useCallback((field) => {
    const comp = components.find((c) => c.field === field);
    return comp ? comp.weight : 100;
  }, [components]);

  // ── class list view ──────────────────────────────────────────────────────
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classRows, setClassRows] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingClassGrades, setLoadingClassGrades] = useState(false);
  const [classSearch, setClassSearch] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [editRowMarks, setEditRowMarks] = useState({});
  const [savingRow, setSavingRow] = useState(false);

  const selectedClass = useMemo(
    () => classes.find((c) => c._id === selectedClassId) || null,
    [classes, selectedClassId],
  );

  useEffect(() => {
    setLoadingClasses(true);
    axios.get('/assignments')
      .then((r) => {
        const available = Array.from(
          new Map(
            (r.data || []).map((a) => a.class).filter(Boolean).map((c) => [c._id, c]),
          ).values(),
        );
        // Filter classes by selected branch if SuperAdmin has a branch selected
        const filtered = selectedBranchId
          ? available.filter(c => c.branchId === selectedBranchId)
          : available;
        setClasses(filtered);
        if (filtered.length > 0) setSelectedClassId(filtered[0]._id);
        else setSelectedClassId('');
      })
      .catch(() => toast.error('Failed to load classes.'))
      .finally(() => setLoadingClasses(false));
  }, [selectedBranchId]);

  useEffect(() => {
    if (!selectedClass) { setClassRows([]); return; }
    let active = true;
    setLoadingClassGrades(true);
    axios.get(`/classroom/grades/${selectedClass._id}/${encodeURIComponent(selectedClass.subject)}`)
      .then((r) => {
        if (!active) return;
        const gradeMap = new Map(
          (r.data || []).map((g) => [g.student?._id || g.student, g]),
        );
        const roster = (selectedClass.students || []).map((student) => {
          const grade = gradeMap.get(student._id);
          return { student, marks: grade?.marks || {}, gradeId: grade?._id || null };
        });
        setClassRows(roster);
      })
      .catch(() => toast.error('Failed to load grades.'))
      .finally(() => { if (active) setLoadingClassGrades(false); });
    return () => { active = false; };
  }, [selectedClass]);

  const filteredClassRows = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    if (!q) return classRows;
    return classRows.filter((r) =>
      (r.student.user?.name || '').toLowerCase().includes(q) ||
      (r.student.studentId || '').toLowerCase().includes(q),
    );
  }, [classRows, classSearch]);

  const startEditRow = (row) => {
    setEditingRowId(row.student._id);
    setEditRowMarks({
      quiz: row.marks?.quiz ?? null,
      assignment: row.marks?.assignment ?? null,
      midterm: row.marks?.midterm ?? null,
      final: row.marks?.final ?? null,
    });
  };

  const handleEditRowChange = (field, value) => {
    setEditRowMarks((prev) => ({ ...prev, [field]: clampMark(value, getMaxForField(field)) }));
  };

  const handleSaveRow = async (row) => {
    setSavingRow(true);
    try {
      await axios.post('/classroom/grades', {
        classId: selectedClass._id,
        subject: selectedClass.subject,
        gradesData: [{
          student: row.student._id,
          marks: {
            quiz: editRowMarks.quiz ?? null,
            assignment: editRowMarks.assignment ?? null,
            midterm: editRowMarks.midterm ?? null,
            final: editRowMarks.final ?? null,
          },
        }],
      });
      toast.success('Grade saved. Change recorded in audit log.');
      setEditingRowId(null);
      const r = await axios.get(`/classroom/grades/${selectedClass._id}/${encodeURIComponent(selectedClass.subject)}`);
      const gradeMap = new Map(
        (r.data || []).map((g) => [g.student?._id || g.student, g]),
      );
      const roster = (selectedClass.students || []).map((student) => {
        const grade = gradeMap.get(student._id);
        return { student, marks: grade?.marks || {}, gradeId: grade?._id || null };
      });
      setClassRows(roster);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save grade.');
    } finally {
      setSavingRow(false);
    }
  };

  const handleCancelRow = () => {
    setEditingRowId(null);
    setEditRowMarks({});
  };

  // ── student detail view ──────────────────────────────────────────────────
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentGrades, setStudentGrades] = useState([]);
  const [loadingStudentGrades, setLoadingStudentGrades] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editMarks, setEditMarks] = useState({});
  const [saving, setSaving] = useState(false);

  const openStudent = useCallback((student) => {
    setSelectedStudent(student);
    setStudentGrades([]);
    setEditingId(null);
    setLoadingStudentGrades(true);
    axios.get(`/classroom/grades/student/${student._id}`)
      .then((r) => setStudentGrades(r.data || []))
      .catch(() => toast.error('Failed to load student grades.'))
      .finally(() => setLoadingStudentGrades(false));
  }, []);

  const startEdit = (grade) => {
    setEditingId(grade._id);
    setEditMarks({
      quiz: grade.marks?.quiz ?? null,
      assignment: grade.marks?.assignment ?? null,
      midterm: grade.marks?.midterm ?? null,
      final: grade.marks?.final ?? null,
    });
  };

  const handleEditChange = (field, value) => {
    setEditMarks((prev) => ({ ...prev, [field]: clampMark(value, getMaxForField(field)) }));
  };

  const handleSave = async (grade) => {
    setSaving(true);
    try {
      await axios.post('/classroom/grades', {
        classId: grade.class,
        subject: grade.subject,
        gradesData: [{
          student: selectedStudent._id,
          marks: {
            quiz: editMarks.quiz ?? null,
            assignment: editMarks.assignment ?? null,
            midterm: editMarks.midterm ?? null,
            final: editMarks.final ?? null,
          },
        }],
      });
      toast.success('Grade saved. Change recorded in audit log.');
      setEditingId(null);
      const r = await axios.get(`/classroom/grades/student/${selectedStudent._id}`);
      setStudentGrades(r.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save grade.');
    } finally {
      setSaving(false);
    }
  };

  // ── class summary stats ──────────────────────────────────────────────────
  const gradedRows = classRows.filter((r) => components.some((c) => r.marks?.[c.field] != null));

  // ── render ────────────────────────────────────────────────────────────────
  return selectedStudent ? (
    /* ── Student detail ───────────────────────────────────────────────────── */
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => { setSelectedStudent(null); setEditingId(null); }}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Back to class
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {selectedStudent.user?.name || '—'}
          </h1>
          <p className="text-sm text-slate-500">
            {selectedStudent.studentId} · All subjects
            {canEdit && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                Edit enabled
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Notice */}
      {canEdit ? (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 15.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm1-5h-2V7h2v5.5z" />
          </svg>
          <p className="text-xs font-medium text-amber-800">
            Every edit is permanently recorded in the audit log with your user ID and timestamp.
          </p>
        </div>
      ) : (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 15.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm1-5h-2V7h2v5.5z" />
          </svg>
          <p className="text-xs font-medium text-blue-800">View-only.</p>
        </div>
      )}

      {/* Subject cards */}
      {loadingStudentGrades ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
          Loading grades…
        </div>
      ) : studentGrades.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
          No grade records for this student yet.
        </div>
      ) : (
        <div className="space-y-4">
          {studentGrades.map((grade) => {
            const isEditing = editingId === grade._id;
            const displayMarks = isEditing ? editMarks : (grade.marks || {});

            return (
              <div key={grade._id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Subject header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <div>
                    <div className="font-bold text-slate-900">{grade.subject || 'General'}</div>
                    <div className="text-xs text-slate-400">{grade.classRef?.name || '—'}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {canEdit && (
                      isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSave(grade)}
                            disabled={saving}
                            className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                          >
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(grade)}
                          className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
                        >
                          Edit
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Score tiles */}
                <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                  {components.map((c) => (
                    <div key={c.field} className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {c.label} <span className="font-normal">(out of {c.weight})</span>
                      </div>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max={c.weight}
                          value={displayMarks[c.field] ?? ''}
                          onChange={(e) => handleEditChange(c.field, e.target.value === '' ? null : e.target.value)}
                          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm font-bold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="—"
                        />
                      ) : (
                        <div className={`mt-2 text-xl font-black ${displayMarks[c.field] != null ? 'text-slate-900' : 'text-slate-300'}`}>
                          {displayMarks[c.field] != null ? displayMarks[c.field] : '—'}
                          {displayMarks[c.field] != null && (
                            <span className="ml-1 text-xs font-normal text-slate-400">/ {c.weight}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  ) : (
    /* ── Class list ───────────────────────────────────────────────────────── */
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Grade Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Select a class, then click a student name to view all their subject scores.
          {canEdit && ' SuperAdmin can edit individual subject grades.'}
        </p>
      </div>

      {/* Controls */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        {canSwitchBranch && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</label>
            <select
              value={selectedBranchId || ''}
              onChange={(e) => switchBranch(e.target.value || null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => { setSelectedClassId(e.target.value); setClassSearch(''); }}
            disabled={loadingClasses}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5"
          >
            {classes.length === 0 && <option value="">No classes</option>}
            {classes.map((c) => (
              <option key={c._id} value={c._id}>{c.name} {c.stream ? `(${c.stream})` : ''} · {c.subject}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
          <input
            value={classSearch}
            onChange={(e) => setClassSearch(e.target.value)}
            placeholder="Name or ID…"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5"
          />
        </div>
      </div>

      {/* Summary cards */}
      {gradedRows.length > 0 && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Graded</p>
            <p className="mt-1.5 text-2xl font-black text-slate-900">{gradedRows.length} / {classRows.length}</p>
          </div>
        </div>
      )}

      {/* Student table */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loadingClassGrades ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
            Loading…
          </div>
        ) : filteredClassRows.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">
            {classRows.length === 0 ? 'No students in this class.' : 'No students match your search.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-4 font-semibold">Student</th>
                  {components.map((c) => (
                    <th key={c.field} className="px-4 py-4 font-semibold">
                      {c.label}
                      <span className="ml-1 font-normal text-slate-300">(/{c.weight})</span>
                    </th>
                  ))}
                  {canEdit && <th className="px-4 py-4 font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredClassRows.map((row) => {
                  const isEditing = editingRowId === row.student._id;
                  const displayMarks = isEditing ? editRowMarks : (row.marks || {});

                  return (
                    <tr key={row.student._id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <button onClick={() => openStudent(row.student)} className="group text-left">
                          <div className="font-semibold text-indigo-600 group-hover:underline">
                            {row.student.user?.name || '—'}
                          </div>
                          <div className="text-xs text-slate-400">{row.student.studentId}</div>
                        </button>
                      </td>
                      {components.map((c) => (
                        <td key={c.field} className="px-4 py-3.5">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              max={c.weight}
                              value={displayMarks[c.field] ?? ''}
                              onChange={(e) => handleEditRowChange(c.field, e.target.value === '' ? null : e.target.value)}
                              className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-sm font-semibold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                              placeholder="—"
                            />
                          ) : (
                            <span className={row.marks[c.field] != null ? 'font-semibold text-slate-800' : 'text-slate-300'}>
                              {row.marks[c.field] != null ? `${row.marks[c.field]} / ${c.weight}` : '—'}
                            </span>
                          )}
                        </td>
                      ))}
                      {canEdit && (
                        <td className="px-4 py-3.5">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <button
                                onClick={handleCancelRow}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveRow(row)}
                                disabled={savingRow}
                                className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                              >
                                {savingRow ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditRow(row)}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
          Click a student name to view all their subjects and detailed scores.
        </div>
      </section>
    </div>
  );
}
