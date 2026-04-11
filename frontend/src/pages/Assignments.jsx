import { useEffect, useState } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';

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

  const availableClasses = [...classes].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' }));

  const toggleClass = (id) => {
    setClassIds((current) => (
      current.includes(id) ? current.filter((classId) => classId !== id) : [...current, id]
    ));
  };

  const toggleSpecificClass = (name) => {
    setSpecificClassNames((current) => (
      current.includes(name) ? current.filter((className) => className !== name) : [...current, name]
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { teacherId, classIds, specificClassNames, notes };
      await axios.post('/assignments', payload);
      toast.success('Teacher assigned to selected class(es) successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save teacher assignment');
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-10">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-4xl border border-white/50 bg-white/75 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Teacher Assignments</h1>
          <p className="mt-2 text-sm text-slate-500">Assign each teacher to a class. Student access follows the class roster automatically.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-1">
          <form onSubmit={handleSubmit} className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <div className="mb-6 border-b border-slate-200 pb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Assignment form</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Create Assignment</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Teacher</label>
                <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10" required>
                  <option value="">Select teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.user?.name} ({teacher.teacherId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-slate-700">Existing classes</label>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {classIds.length ? `${classIds.length} selected` : 'None selected'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setExistingClassesOpen((current) => !current)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                >
                  <span className="text-sm font-semibold text-slate-700">
                    {classIds.length ? `${classIds.length} class(es) selected` : 'Choose classes'}
                  </span>
                  <span className="text-slate-500">{existingClassesOpen ? '▴' : '▾'}</span>
                </button>

                {existingClassesOpen && (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-500">Choose one or more classes below.</div>
                      <button
                        type="button"
                        onClick={() => setClassIds(availableClasses.map((klass) => klass._id))}
                        className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                      >
                        Select all
                      </button>
                    </div>
                    <div className="max-h-56 space-y-2 overflow-auto pr-1">
                      {availableClasses.length > 0 ? (
                        availableClasses.map((klass) => (
                          <label key={klass._id} className="flex cursor-pointer items-center justify-between rounded-2xl border border-transparent bg-white px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50">
                            <div>
                              <div className="font-semibold text-slate-900">Class {klass.name}</div>
                              <div className="text-sm text-slate-500">{klass.subject}{klass.schedule ? ` • ${klass.schedule}` : ''}</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={classIds.includes(klass._id)}
                              onChange={() => toggleClass(klass._id)}
                              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </label>
                        ))
                      ) : (
                        <div className="px-2 py-3 text-sm text-slate-500">No existing classes available.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-slate-700">Specific classes</label>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {specificClassNames.length ? `${specificClassNames.length} selected` : 'None selected'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSpecificClassesOpen((current) => !current)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                >
                  <span className="text-sm font-semibold text-slate-700">
                    {specificClassNames.length ? `${specificClassNames.length} class level(s) selected` : 'Choose specific classes'}
                  </span>
                  <span className="text-slate-500">{specificClassesOpen ? '▴' : '▾'}</span>
                </button>

                {specificClassesOpen && (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 text-sm text-slate-500">Choose one or more specific class levels.</div>
                    <div className="max-h-56 space-y-2 overflow-auto pr-1">
                      {specificClasses.length > 0 ? (
                        specificClasses.map((className) => (
                          <label key={className} className="flex cursor-pointer items-center justify-between rounded-2xl border border-transparent bg-white px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50">
                            <div>
                              <div className="font-semibold text-slate-900">{className}</div>
                              <div className="text-sm text-slate-500">Will be created automatically if missing</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={specificClassNames.includes(className)}
                              onChange={() => toggleSpecificClass(className)}
                              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </label>
                        ))
                      ) : (
                        <div className="px-2 py-3 text-sm text-slate-500">No specific classes available.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10" placeholder="Optional assignment notes" />
              </div>

              <button type="submit" className="w-full rounded-2xl bg-linear-to-r from-indigo-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5">
                Save Assignment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}