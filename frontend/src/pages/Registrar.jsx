import { useState, useEffect } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';

export default function Registrar() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);

  const [feeGrade, setFeeGrade] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [gradeFees, setGradeFees] = useState([]);

  const [filterGrade, setFilterGrade] = useState('All');
  const [message, setMessage] = useState('');
  const [deletingStudentId, setDeletingStudentId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const fetchStudents = async () => {
    try {
      const res = await axios.get('/students');
      setStudents(res.data);
    } catch (error) {
      console.error('Failed to fetch students', error);
    }
  };

  const fetchGradeFees = async () => {
    try {
      const res = await axios.get('/students/grade-fee');
      setGradeFees(res.data);
    } catch (error) {
      console.error('Failed to fetch grade fees', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const studentsRes = await axios.get('/students');
      const availableGrades = Array.from(
        new Set((studentsRes.data || []).map((student) => student.grade).filter(Boolean)),
      ).map((grade) => ({ _id: grade, name: grade, subject: '' }));
      setClasses(availableGrades);
    } catch (error) {
      console.error('Failed to fetch classes', error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchGradeFees();
    fetchClasses();
  }, []);

  const availableGrades = [...new Set(classes.map((klass) => klass.name).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
  );

  const handleSetGradeFee = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/students/grade-fee', { grade: feeGrade, amount: Number(feeAmount) });
      setMessage(`Fee successfully configured for ${feeGrade}`);
      setFeeGrade(''); setFeeAmount('');
      fetchGradeFees();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error configuring grade fee.');
    }
  };

  const handleDeleteStudent = async (student) => {
    const confirmed = window.confirm(`Delete ${student.user?.name || student.studentId}? This will remove the student and related records.`);
    if (!confirmed) return;

    setDeletingStudentId(student._id);
    setMessage('');

    try {
      const res = await axios.delete(`/students/${student._id}`);
      setMessage(res.data.message || 'Student deleted successfully');
      await fetchStudents();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to delete student');
    } finally {
      setDeletingStudentId('');
    }
  };

  const sortedStudents = [...students].sort((a, b) => {
    const gradeCompare = String(a.grade || '').localeCompare(String(b.grade || ''), undefined, { numeric: true, sensitivity: 'base' });
    if (gradeCompare !== 0) return gradeCompare;
    return String(a.user?.name || '').localeCompare(String(b.user?.name || ''), undefined, { numeric: true, sensitivity: 'base' });
  });

  const uniqueGrades = ['All', ...new Set(sortedStudents.map((student) => student.grade))];
  const filteredStudents = filterGrade === 'All'
    ? sortedStudents
    : sortedStudents.filter((student) => student.grade === filterGrade);

  const selectedStudent = filteredStudents.find((student) => student._id === selectedStudentId) || null;

  const openStudentDetails = (student) => {
    setSelectedStudentId(student._id);
  };

  return (
    <div className="min-h-screen bg-transparent pb-10">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-4xl border border-white/50 bg-white/75 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Registrar</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Registrar Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">Manage fee settings and student records from one place.</p>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <div className="mb-6 border-b border-slate-200 pb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Billing rules</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Grade Fee Configuration</h2>
            </div>
            <form onSubmit={handleSetGradeFee} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Grade / Class Level</label>
                <select
                  required
                  value={feeGrade}
                  onChange={(e) => setFeeGrade(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="">Select a class</option>
                  {availableGrades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
                {availableGrades.length === 0 && (
                  <p className="mt-2 text-sm text-slate-500">No classes available yet.</p>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Monthly Tuition (ETB)</label>
                <input type="number" required placeholder="e.g. 500" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"/>
              </div>
              <button type="submit" className="w-full rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5">
                Set Grade Fee
              </button>
            </form>

            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Current Fee Settings</h3>
              <ul className="space-y-3">
                {gradeFees.map(gf => (
                  <li key={gf._id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="font-medium text-slate-700">{gf.grade}</span>
                    <span className="font-semibold text-emerald-600">ETB {gf.amount}</span>
                  </li>
                ))}
                {gradeFees.length === 0 && <li className="text-sm text-slate-500">No fee rules configured.</li>}
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Records</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Enrolled Students</h2>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <label className="text-sm font-semibold text-slate-600">Choose Grade:</label>
                <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:w-auto">
                  {uniqueGrades.map((grade) => <option key={`filt-${grade}`} value={grade}>{grade}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-3 sm:hidden">
              {filteredStudents.map((std) => (
                <div key={std._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <button
                    type="button"
                    onClick={() => openStudentDetails(std)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">ID</div>
                        <div className="mt-1 font-semibold text-blue-700">{std.studentId}</div>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">View details</span>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-slate-700">
                      <div><span className="font-semibold text-slate-900">Name:</span> {std.user?.name}</div>
                      <div><span className="font-semibold text-slate-900">Grade:</span> {std.grade}</div>
                    </div>
                  </button>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDeleteStudent(std)}
                      disabled={deletingStudentId === std._id}
                      className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingStudentId === std._id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
              {filteredStudents.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-500">No students found for this grade.</div>}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 sm:block">
              <table className="min-w-190 w-full border-collapse text-left text-sm sm:text-base">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-4">ID</th>
                    <th className="px-4 py-4">Name</th>
                    <th className="px-4 py-4">Email</th>
                    <th className="px-4 py-4">Grade</th>
                    <th className="px-4 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredStudents.map(std => (
                    <tr key={std._id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold text-blue-700">{std.studentId}</td>
                      <td className="px-4 py-4 text-slate-700">{std.user?.name}</td>
                      <td className="px-4 py-4 text-slate-500">{std.user?.email}</td>
                      <td className="px-4 py-4 font-medium text-slate-700">{std.grade}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openStudentDetails(std)}
                            className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                          >
                            View details
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(std)}
                            disabled={deletingStudentId === std._id}
                            className="rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingStudentId === std._id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-slate-500">No students found for this grade.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {selectedStudent && (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Student details</p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">{selectedStudent.user?.name || 'Selected student'}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId('')}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Student ID</div>
                    <div className="mt-1 font-semibold text-slate-900">{selectedStudent.studentId}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Grade</div>
                    <div className="mt-1 font-semibold text-slate-900">{selectedStudent.grade || '—'}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Email</div>
                    <div className="mt-1 font-semibold text-slate-900">{selectedStudent.user?.email || '—'}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Enrollment Date</div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {selectedStudent.enrollmentDate ? new Date(selectedStudent.enrollmentDate).toLocaleDateString() : '—'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-4">
                    <div className="text-sm font-bold text-slate-900">Personal details</div>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <div><span className="font-semibold text-slate-900">Gender:</span> {selectedStudent.personalDetails?.gender || '—'}</div>
                      <div><span className="font-semibold text-slate-900">Phone:</span> {selectedStudent.personalDetails?.phone || '—'}</div>
                      <div><span className="font-semibold text-slate-900">Address:</span> {selectedStudent.personalDetails?.address || '—'}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white px-4 py-4">
                    <div className="text-sm font-bold text-slate-900">Family background</div>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <div><span className="font-semibold text-slate-900">Father:</span> {selectedStudent.familyBackground?.fatherName || '—'}</div>
                      <div><span className="font-semibold text-slate-900">Mother:</span> {selectedStudent.familyBackground?.motherName || '—'}</div>
                      <div><span className="font-semibold text-slate-900">Guardian:</span> {selectedStudent.familyBackground?.guardianName || '—'}</div>
                      <div><span className="font-semibold text-slate-900">Occupation:</span> {selectedStudent.familyBackground?.occupation || '—'}</div>
                    </div>
                  </div>
                </div>

                {selectedStudent.familyBackground?.notes && (
                  <div className="mt-4 rounded-2xl bg-white px-4 py-4">
                    <div className="text-sm font-bold text-slate-900">Notes</div>
                    <p className="mt-2 text-sm text-slate-700">{selectedStudent.familyBackground.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}