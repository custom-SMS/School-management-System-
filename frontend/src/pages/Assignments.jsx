import { useEffect, useState } from 'react';
import axios from '../api/axios';
import { toast } from 'react-toastify';
import AdminLayout from '../components/AdminLayout';

const AVATAR_COLORS = ['bg-gray-700', 'bg-blue-600', 'bg-teal-600', 'bg-green-700', 'bg-orange-600'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function Assignments() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [assignmentType, setAssignmentType] = useState('SubjectTeacher');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const res = await axios.get('/assignments/options');
        setTeachers(res.data.teachers || []);
        setSubjects(res.data.subjects || []);
        setSections(res.data.sections || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load assignment options');
      }
    };
    loadOptions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/assignments', { teacherId, subjectId: assignmentType === 'HomeRoomTeacher' ? null : subjectId, sectionId, assignmentType });
      toast.success('Teacher assigned successfully.');
      setTeacherId('');
      setSubjectId('');
      setSectionId('');
      setAssignmentType('SubjectTeacher');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save teacher assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTeacher = teachers.find((t) => t._id === teacherId);
  const selectedSubject = subjects.find((s) => s.id === subjectId || s._id === subjectId);
  const selectedSection = sections.find((s) => s.id === sectionId || s._id === sectionId);

  return (
    <AdminLayout pageTitle="System Management">
      {/* Page Title */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Teacher Assignment</h2>
        <p className="text-sm text-gray-500">Assign each teacher to their classes. Student access follows the class roster automatically.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Assignment Form */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-6 text-lg font-bold text-gray-900">Create Assignment</h3>

          <div className="space-y-5">
            {/* Teacher Select */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Select Teacher</label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-black"
              >
                <option value="">Choose a teacher…</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>{t.user?.name} ({t.teacherId}) — {t.subject || 'General'}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Assignment Type</label>
              <select
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-black"
              >
                <option value="SubjectTeacher">Subject Teacher</option>
                <option value="HomeRoomTeacher">Home Room Teacher</option>
              </select>
            </div>

            {assignmentType === 'SubjectTeacher' && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Select Subject</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-black"
                >
                  <option value="">Choose a subject…</option>
                  {subjects.map((subject) => (
                    <option key={subject.id || subject._id} value={subject.id || subject._id}>{subject.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Select Section</label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-black"
              >
                <option value="">Choose a section…</option>
                {sections.map((section) => (
                  <option key={section._id} value={section._id}>{section.label || `${section.className} ${section.name}`}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting || !teacherId || !sectionId || (assignmentType === 'SubjectTeacher' && !subjectId)}
              className="w-full rounded-lg bg-black py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save Assignment'}
            </button>
          </div>
        </form>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Selected Teacher Card */}
          {selectedTeacher ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Selected Teacher</h3>
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${avatarColor(selectedTeacher.user?.name)}`}>
                  {(selectedTeacher.user?.name || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{selectedTeacher.user?.name}</div>
                  <div className="text-sm text-gray-500">{selectedTeacher.subject || 'General'}</div>
                  <div className="mt-1 text-xs font-semibold text-gray-400">{selectedTeacher.teacherId}</div>
                </div>
              </div>
              {selectedTeacher.user?.email && (
                <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  📧 {selectedTeacher.user.email}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
              <p className="text-sm text-gray-500">Select a teacher to see their profile here.</p>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Assignment Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm font-semibold text-gray-700">Selected Subject</span>
                <span className={`text-2xl font-bold ${subjectId ? 'text-gray-900' : 'text-gray-400'}`}>{selectedSubject?.name || '-'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm font-semibold text-gray-700">Selected Section</span>
                <span className={`text-2xl font-bold ${sectionId ? 'text-gray-900' : 'text-gray-400'}`}>{selectedSection?.label || '-'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-black p-6 text-white">
            <h3 className="mb-2 font-bold">Assignment Details</h3>
            <p className="text-sm text-gray-300">This page now only requires teacher, subject, and section selection to create each assignment.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
