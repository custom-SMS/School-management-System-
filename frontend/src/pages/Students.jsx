import { useEffect, useMemo, useState } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';

const normalizeLabel = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const extractClassNumber = (value) => String(value || '').match(/\d+/)?.[0] || '';

const matchesClass = (studentGrade, className) => {
  const studentLabel = normalizeLabel(studentGrade);
  const classLabel = normalizeLabel(className);
  if (!studentLabel || !classLabel) return false;

  const studentNumber = extractClassNumber(studentGrade);
  const classNumber = extractClassNumber(className);

  return (
    studentLabel === classLabel ||
    studentLabel === normalizeLabel(`grade ${classNumber}`) ||
    studentLabel === normalizeLabel(`class ${classNumber}`) ||
    classLabel === normalizeLabel(`grade ${studentNumber}`) ||
    classLabel === normalizeLabel(`class ${studentNumber}`) ||
    (studentNumber && classNumber && studentNumber === classNumber)
  );
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

export default function Students() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const studentsRes = await axios.get('/students');
        const allStudents = studentsRes.data || [];
        setStudents(allStudents);

        const derivedClasses = Array.from(
          new Map(
            allStudents
              .map((student) => String(student.grade || '').trim())
              .filter(Boolean)
              .map((grade) => [grade, { _id: grade, name: grade, subject: '' }]),
          ).values(),
        );

        setClasses(derivedClasses);
      } catch (error) {
        console.error('Failed to load students page data', error);
        toast.error(error.response?.data?.message || 'Failed to load student records');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const availableClasses = useMemo(() => (
    [...classes].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' }))
  ), [classes, students]);

  const sortedStudents = useMemo(() => (
    [...students].sort((a, b) => {
      const classCompare = String(a.grade || '').localeCompare(String(b.grade || ''), undefined, { numeric: true, sensitivity: 'base' });
      if (classCompare !== 0) return classCompare;
      return String(a.user?.name || '').localeCompare(String(b.user?.name || ''), undefined, { numeric: true, sensitivity: 'base' });
    })
  ), [students]);

  const filteredStudents = useMemo(() => {
    const term = normalizeLabel(searchTerm);

    return sortedStudents.filter((student) => {
      const matchesSelectedClass = selectedClass === 'All' || matchesClass(student.grade, selectedClass);
      if (!matchesSelectedClass) return false;

      if (!term) return true;

      const haystacks = [
        student.user?.name,
        student.studentId,
        student.user?.email,
        student.grade,
        student.personalDetails?.phone,
        student.personalDetails?.address,
      ]
        .map(normalizeLabel)
        .join(' | ');

      return haystacks.includes(term);
    });
  }, [searchTerm, selectedClass, sortedStudents]);

  useEffect(() => {
    if (!filteredStudents.some((student) => student._id === selectedStudentId)) {
      setSelectedStudentId('');
    }
  }, [filteredStudents, selectedStudentId]);

  const selectedStudent = filteredStudents.find((student) => student._id === selectedStudentId) || null;

  return (
    <div className="min-h-screen bg-transparent pb-10">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-4xl border border-white/50 bg-white/75 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Students</h1>
          <p className="mt-2 text-sm text-slate-500">Browse every student, filter by class, and open each record to see full details.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <div className="mb-6 border-b border-slate-200 pb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Class filter</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">All Students</h2>
            </div>

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-sm font-semibold text-slate-600">Select Class:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:w-64"
              >
                <option value="All">All Classes</option>
                {availableClasses.map((klass) => (
                  <option key={klass._id} value={klass.name}>
                    {klass.name}{klass.subject ? ` - ${klass.subject}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-slate-600">Search Students:</label>
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, ID, email, or class"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="mb-4 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">Total: {students.length}</span>
              <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">Shown: {filteredStudents.length}</span>
            </div>

            <div className="max-h-[70vh] overflow-hidden rounded-2xl border border-slate-200">
              <div className="max-h-[70vh] overflow-auto bg-white">
                {loading ? (
                  <div className="px-4 py-8 text-center text-slate-500">Loading students…</div>
                ) : filteredStudents.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {filteredStudents.map((student) => {
                      const isSelected = student._id === selectedStudentId;
                      return (
                        <li key={student._id} className="scroll-mt-4">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentId(student._id)}
                            className={`w-full px-4 py-4 text-left transition hover:bg-slate-50 ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="font-semibold text-slate-900">{student.user?.name || 'Unnamed student'}</div>
                                <div className="mt-1 text-sm text-slate-500">{student.studentId}</div>
                                <div className="mt-2 text-sm text-slate-600">Class: <span className="font-semibold text-slate-800">{student.grade || '—'}</span></div>
                              </div>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                                View
                              </span>
                            </div>
                          </button>
                          <div className="px-4 pb-4 sm:hidden">
                            {isSelected && selectedStudent && (
                              <div className="mt-3 rounded-3xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Student details</div>
                                    <div className="mt-1 text-lg font-black text-slate-900">{selectedStudent.user?.name || 'Unnamed student'}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentId('')}
                                    className="rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                  >
                                    Close
                                  </button>
                                </div>

                                <div className="mt-4 grid gap-3 text-sm text-slate-700">
                                  <div><span className="font-semibold text-slate-900">Student ID:</span> {selectedStudent.studentId}</div>
                                  <div><span className="font-semibold text-slate-900">Class:</span> {selectedStudent.grade || '—'}</div>
                                  <div><span className="font-semibold text-slate-900">Email:</span> {selectedStudent.user?.email || '—'}</div>
                                  <div><span className="font-semibold text-slate-900">Enrollment Date:</span> {formatDate(selectedStudent.enrollmentDate)}</div>
                                  <div><span className="font-semibold text-slate-900">DOB:</span> {formatDate(selectedStudent.personalDetails?.dateOfBirth)}</div>
                                  <div><span className="font-semibold text-slate-900">Guardian Count:</span> {selectedStudent.guardianContacts?.length || 0}</div>
                                </div>

                                <div className="mt-4 space-y-3 rounded-2xl bg-white p-4">
                                  <div className="text-sm font-bold text-slate-900">Personal Details</div>
                                  <div className="space-y-2 text-sm text-slate-700">
                                    <div><span className="font-semibold text-slate-900">Gender:</span> {selectedStudent.personalDetails?.gender || '—'}</div>
                                    <div><span className="font-semibold text-slate-900">Phone:</span> {selectedStudent.personalDetails?.phone || '—'}</div>
                                    <div><span className="font-semibold text-slate-900">Address:</span> {selectedStudent.personalDetails?.address || '—'}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="px-4 py-8 text-center text-slate-500">No students found for this class.</div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <div className="mb-6 border-b border-slate-200 pb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Student details</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Information Panel</h2>
            </div>

            <div className="hidden sm:block">
              {selectedStudent ? (
                <div className="space-y-6">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Selected Student</div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{selectedStudent.user?.name || 'Unnamed student'}</div>
                  <div className="mt-1 text-sm text-slate-500">{selectedStudent.studentId} • {selectedStudent.grade || 'No class set'}</div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</div>
                    <div className="mt-1 font-semibold text-slate-900">{selectedStudent.user?.email || '—'}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Enrollment Date</div>
                    <div className="mt-1 font-semibold text-slate-900">{formatDate(selectedStudent.enrollmentDate)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">DOB</div>
                    <div className="mt-1 font-semibold text-slate-900">{formatDate(selectedStudent.personalDetails?.dateOfBirth)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Guardian Count</div>
                    <div className="mt-1 font-semibold text-slate-900">{selectedStudent.guardianContacts?.length || 0}</div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <h3 className="mb-4 text-lg font-bold text-slate-900">Personal Details</h3>
                    <div className="space-y-3 text-sm text-slate-700">
                      <p><span className="font-semibold text-slate-900">Gender:</span> {selectedStudent.personalDetails?.gender || '—'}</p>
                      <p><span className="font-semibold text-slate-900">Phone:</span> {selectedStudent.personalDetails?.phone || '—'}</p>
                      <p><span className="font-semibold text-slate-900">Address:</span> {selectedStudent.personalDetails?.address || '—'}</p>
                      <p><span className="font-semibold text-slate-900">Admission Date:</span> {formatDate(selectedStudent.personalDetails?.admissionDate)}</p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <h3 className="mb-4 text-lg font-bold text-slate-900">Family Background</h3>
                    <div className="space-y-3 text-sm text-slate-700">
                      <p><span className="font-semibold text-slate-900">Father:</span> {selectedStudent.familyBackground?.fatherName || '—'}</p>
                      <p><span className="font-semibold text-slate-900">Mother:</span> {selectedStudent.familyBackground?.motherName || '—'}</p>
                      <p><span className="font-semibold text-slate-900">Guardian:</span> {selectedStudent.familyBackground?.guardianName || '—'}</p>
                      <p><span className="font-semibold text-slate-900">Occupation:</span> {selectedStudent.familyBackground?.occupation || '—'}</p>
                      <p><span className="font-semibold text-slate-900">Notes:</span> {selectedStudent.familyBackground?.notes || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 text-lg font-bold text-slate-900">Guardians / Parent Contacts</h3>
                  {selectedStudent.guardianContacts?.length > 0 ? (
                    <div className="space-y-3">
                      {selectedStudent.guardianContacts.map((guardian, index) => (
                        <div key={`${selectedStudent._id}-guardian-${index}`} className="rounded-2xl bg-slate-50 px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900">{guardian.fullName || 'Guardian'}</div>
                              <div className="text-sm text-slate-500">{guardian.relationship || 'Guardian'}</div>
                            </div>
                            {guardian.primary && (
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Primary</span>
                            )}
                          </div>
                          <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                            <div><span className="font-semibold text-slate-900">Email:</span> {guardian.email || '—'}</div>
                            <div><span className="font-semibold text-slate-900">Phone:</span> {guardian.phone || '—'}</div>
                            <div className="sm:col-span-2"><span className="font-semibold text-slate-900">Address:</span> {guardian.address || '—'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No guardian contact details available.</p>
                  )}
                </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
                  Select a student from the list to view their details.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500 sm:hidden">
              Tap a student on the left to see the details appear right under the clicked row.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
