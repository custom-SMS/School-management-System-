import { useEffect, useState } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';

export default function Academics() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);

  // Subject form
  const [subjectName, setSubjectName] = useState('');
  const [subjectDept, setSubjectDept] = useState('');

  // Class form
  const [className, setClassName] = useState('');
  const [classSubject, setClassSubject] = useState('');
  const [classTeacherId, setClassTeacherId] = useState('');

  // Section form
  const [sectionClassId, setSectionClassId] = useState('');
  const [sectionName, setSectionName] = useState('');

  const fetchSubjects = async () => {
    try {
      const res = await axios.get('/subjects');
      setSubjects(res.data || []);
    } catch (err) {
      console.error('Failed to fetch subjects', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await axios.get('/classroom/classes');
      setClasses(res.data || []);
    } catch (err) {
      console.error('Failed to fetch classes', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await axios.get('/teachers');
      setTeachers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch teachers', err);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchClasses();
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (!sectionClassId) {
      setSections([]);
      return;
    }
    axios.get(`/classroom/sections/${sectionClassId}`)
      .then((res) => setSections(res.data || []))
      .catch((err) => console.error('Failed to fetch sections', err));
  }, [sectionClassId]);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/subjects', { name: subjectName, department: subjectDept || undefined });
      toast.success(`Subject "${subjectName}" created.`);
      setSubjectName('');
      setSubjectDept('');
      fetchSubjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create subject.');
    }
  };

  const handleDeleteSubject = async (id, name) => {
    if (!window.confirm(`Delete subject "${name}"?`)) return;
    try {
      await axios.delete(`/subjects/${id}`);
      toast.success('Subject deleted.');
      fetchSubjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete subject.');
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/classroom/classes', {
        name: className,
        subject: classSubject,
        teacherId: classTeacherId || undefined,
      });
      toast.success(`Class "${className}" created.`);
      setClassName('');
      setClassSubject('');
      setClassTeacherId('');
      fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create class.');
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/classroom/sections', { name: sectionName, classId: sectionClassId });
      toast.success(`Section "${sectionName}" created.`);
      setSectionName('');
      const res = await axios.get(`/classroom/sections/${sectionClassId}`);
      setSections(res.data || []);
      fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create section.');
    }
  };

  const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10';
  const cardClass = 'rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]';

  return (
    <div className="min-h-screen bg-transparent pb-10">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-4xl border border-white/50 bg-white/75 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Academics</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Subjects, Classes & Sections</h1>
          <p className="mt-2 text-sm text-slate-500">Configure the academic structure used by timetables, grades and assignments.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Subjects */}
          <div className={cardClass}>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Subjects</h2>
            <form onSubmit={handleCreateSubject} className="space-y-3">
              <input className={inputClass} required placeholder="Subject name (e.g. Mathematics)" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
              <input className={inputClass} placeholder="Department (optional)" value={subjectDept} onChange={(e) => setSubjectDept(e.target.value)} />
              <button type="submit" className="w-full rounded-2xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition">Add Subject</button>
            </form>
            <ul className="mt-5 space-y-2">
              {subjects.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="font-medium text-slate-700">{s.name}{s.department ? <span className="text-xs text-slate-400"> • {s.department}</span> : null}</span>
                  <button onClick={() => handleDeleteSubject(s.id, s.name)} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100">Delete</button>
                </li>
              ))}
              {subjects.length === 0 && <li className="text-sm text-slate-500">No subjects yet.</li>}
            </ul>
          </div>

          {/* Classes */}
          <div className={cardClass}>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Classes</h2>
            <form onSubmit={handleCreateClass} className="space-y-3">
              <input className={inputClass} required placeholder="Class name (e.g. Class 1)" value={className} onChange={(e) => setClassName(e.target.value)} />
              <input className={inputClass} required placeholder="Subject (e.g. General)" value={classSubject} onChange={(e) => setClassSubject(e.target.value)} />
              <select className={inputClass} value={classTeacherId} onChange={(e) => setClassTeacherId(e.target.value)}>
                <option value="">Homeroom teacher (optional)</option>
                {teachers.map((t) => (
                  <option key={t._id || t.id} value={t._id || t.id}>{t.user?.name || t.teacherId}</option>
                ))}
              </select>
              <button type="submit" className="w-full rounded-2xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition">Add Class</button>
            </form>
            <ul className="mt-5 space-y-2">
              {classes.map((c) => (
                <li key={c.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="font-medium text-slate-700">{c.name} <span className="text-xs text-slate-400">• {c.subject}</span></div>
                  <div className="text-xs text-slate-500">
                    {c.teacher?.user?.name ? `Teacher: ${c.teacher.user.name}` : 'No homeroom teacher'} • {(c.sections || []).length} section(s)
                  </div>
                </li>
              ))}
              {classes.length === 0 && <li className="text-sm text-slate-500">No classes yet.</li>}
            </ul>
          </div>

          {/* Sections */}
          <div className={cardClass}>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Sections</h2>
            <form onSubmit={handleCreateSection} className="space-y-3">
              <select className={inputClass} required value={sectionClassId} onChange={(e) => setSectionClassId(e.target.value)}>
                <option value="">Select a class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} • {c.subject}</option>
                ))}
              </select>
              <input className={inputClass} required placeholder="Section name (e.g. A)" value={sectionName} onChange={(e) => setSectionName(e.target.value)} disabled={!sectionClassId} />
              <button type="submit" disabled={!sectionClassId} className="w-full rounded-2xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50">Add Section</button>
            </form>
            <ul className="mt-5 space-y-2">
              {sections.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="font-medium text-slate-700">Section {s.name}</span>
                </li>
              ))}
              {sectionClassId && sections.length === 0 && <li className="text-sm text-slate-500">No sections for this class yet.</li>}
              {!sectionClassId && <li className="text-sm text-slate-500">Select a class to manage its sections.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
