import { useEffect, useState } from 'react';
import axios from '../api/axios';
import { toast } from 'react-toastify';
import AdminLayout from '../components/AdminLayout';

const AVATAR_COLORS = ['bg-gray-700', 'bg-blue-600', 'bg-purple-600', 'bg-green-700', 'bg-orange-600'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function Assignments() {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [specificClasses, setSpecificClasses] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [classIds, setClassIds] = useState([]);
  const [specificClassNames, setSpecificClassNames] = useState([]);
  const [notes, setNotes] = useState('');
  const [existingClassesOpen, setExistingClassesOpen] = useState(false);
  const [specificClassesOpen, setSpecificClassesOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const res = await axios.get('/assignments/options');
        setTeachers(res.data.teachers || []);
        setClasses(res.data.classes || []);
        setSpecificClasses(res.data.specificClasses || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load assignment options');
      }
    };
    loadOptions();
  }, []);

  const availableClasses = [...classes].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' })
  );

  const toggleClass = (id) => setClassIds((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);
  const toggleSpecificClass = (name) => setSpecificClassNames((c) => c.includes(name) ? c.filter((x) => x !== name) : [...c, name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/assignments', { teacherId, classIds, specificClassNames, notes });
      toast.success('Teacher assigned to selected class(es) successfully.');
      setTeacherId(''); setClassIds([]); setSpecificClassNames([]); setNotes('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save teacher assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTeacher = teachers.find((t) => t._id === teacherId);

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

            {/* Existing Classes */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">Existing Classes</label>
                <span className="text-xs font-bold text-gray-500">{classIds.length ? `${classIds.length} selected` : 'None'}</span>
              </div>
              <button
                type="button"
                onClick={() => setExistingClassesOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-left hover:bg-gray-100"
              >
                <span className="font-semibold text-gray-700">{classIds.length ? `${classIds.length} class(es) selected` : 'Choose classes'}</span>
                <span className="text-gray-500">{existingClassesOpen ? '▲' : '▼'}</span>
              </button>
              {existingClassesOpen && (
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex justify-between">
                    <span className="text-xs text-gray-500">Select one or more classes</span>
                    <button type="button" onClick={() => setClassIds(availableClasses.map((c) => c._id))} className="text-xs font-bold text-black hover:underline">Select All</button>
                  </div>
                  <div className="max-h-56 space-y-2 overflow-y-auto">
                    {availableClasses.length > 0 ? availableClasses.map((cls) => (
                      <label key={cls._id} className={`flex cursor-pointer items-center justify-between rounded-lg border bg-white px-4 py-3 transition hover:bg-gray-50 ${classIds.includes(cls._id) ? 'border-black' : 'border-gray-200'}`}>
                        <div>
                          <div className="font-bold text-gray-900">{cls.name}</div>
                          <div className="text-xs text-gray-500">{cls.subject}</div>
                        </div>
                        <input type="checkbox" checked={classIds.includes(cls._id)} onChange={() => toggleClass(cls._id)} className="h-4 w-4 rounded border-gray-300"/>
                      </label>
                    )) : (
                      <div className="py-3 text-sm text-gray-500">No existing classes available.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Specific Classes */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">Specific Class Levels</label>
                <span className="text-xs font-bold text-gray-500">{specificClassNames.length ? `${specificClassNames.length} selected` : 'None'}</span>
              </div>
              <button
                type="button"
                onClick={() => setSpecificClassesOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-left hover:bg-gray-100"
              >
                <span className="font-semibold text-gray-700">{specificClassNames.length ? `${specificClassNames.length} level(s) selected` : 'Choose class levels'}</span>
                <span className="text-gray-500">{specificClassesOpen ? '▲' : '▼'}</span>
              </button>
              {specificClassesOpen && (
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 text-xs text-gray-500">Will be created automatically if missing.</div>
                  <div className="max-h-56 space-y-2 overflow-y-auto">
                    {specificClasses.length > 0 ? specificClasses.map((cls) => (
                      <label key={cls} className={`flex cursor-pointer items-center justify-between rounded-lg border bg-white px-4 py-3 transition hover:bg-gray-50 ${specificClassNames.includes(cls) ? 'border-black' : 'border-gray-200'}`}>
                        <div>
                          <div className="font-bold text-gray-900">{cls}</div>
                          <div className="text-xs text-gray-500">Auto-created if missing</div>
                        </div>
                        <input type="checkbox" checked={specificClassNames.includes(cls)} onChange={() => toggleSpecificClass(cls)} className="h-4 w-4 rounded border-gray-300"/>
                      </label>
                    )) : (
                      <div className="py-3 text-sm text-gray-500">No specific classes available.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add any assignment notes…"
                className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-black resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !teacherId}
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

          {/* Selected Classes Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Assignment Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm font-semibold text-gray-700">Existing Classes</span>
                <span className={`text-2xl font-bold ${classIds.length > 0 ? 'text-gray-900' : 'text-gray-400'}`}>{classIds.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm font-semibold text-gray-700">Class Levels</span>
                <span className={`text-2xl font-bold ${specificClassNames.length > 0 ? 'text-gray-900' : 'text-gray-400'}`}>{specificClassNames.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm font-semibold text-gray-700">Total Assignments</span>
                <span className={`text-2xl font-bold ${classIds.length + specificClassNames.length > 0 ? 'text-black' : 'text-gray-400'}`}>{classIds.length + specificClassNames.length}</span>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="rounded-xl bg-black p-6 text-white">
            <h3 className="mb-2 font-bold">How Assignments Work</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              When a teacher is assigned to a class, they gain access to the class roster, grade entry, and attendance marking for that class. Students enrolled in those classes can view their records through the student portal.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}