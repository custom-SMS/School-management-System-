import { useEffect, useState } from 'react';
import axios from '../api/axios';
import { toast } from 'react-toastify';
import AdminLayout from '../components/AdminLayout';

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

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('subject'); // 'subject' | 'class' | 'section'

  const fetchSubjects = async () => {
    try { const res = await axios.get('/subjects'); setSubjects(res.data || []); } catch (err) { console.error(err); }
  };
  const fetchClasses = async () => {
    try { const res = await axios.get('/classroom/classes'); setClasses(res.data || []); } catch (err) { console.error(err); }
  };
  const fetchTeachers = async () => {
    try { const res = await axios.get('/teachers'); setTeachers(res.data || []); } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchSubjects(); fetchClasses(); fetchTeachers(); }, []);

  useEffect(() => {
    if (!sectionClassId) { setSections([]); return; }
    axios.get(`/classroom/sections/${sectionClassId}`).then((res) => setSections(res.data || [])).catch(console.error);
  }, [sectionClassId]);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/subjects', { name: subjectName, department: subjectDept || undefined });
      toast.success(`Subject "${subjectName}" created.`);
      setSubjectName(''); setSubjectDept('');
      fetchSubjects(); setShowModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create subject.'); }
  };

  const handleDeleteSubject = async (id, name) => {
    if (!window.confirm(`Delete subject "${name}"?`)) return;
    try { await axios.delete(`/subjects/${id}`); toast.success('Subject deleted.'); fetchSubjects(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete subject.'); }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/classroom/classes', { name: className, subject: classSubject, teacherId: classTeacherId || undefined });
      toast.success(`Class "${className}" created.`);
      setClassName(''); setClassSubject(''); setClassTeacherId('');
      fetchClasses(); setShowModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create class.'); }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/classroom/sections', { name: sectionName, classId: sectionClassId });
      toast.success(`Section "${sectionName}" created.`);
      setSectionName('');
      const res = await axios.get(`/classroom/sections/${sectionClassId}`);
      setSections(res.data || []); fetchClasses(); setShowModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create section.'); }
  };

  // Group subjects by grade from class name or a mock grouping
  const groupedByGrade = classes.reduce((acc, cls) => {
    const gradeMatch = cls.name.match(/\d+/);
    const grade = gradeMatch ? `Grade ${gradeMatch[0]}` : cls.name;
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(cls);
    return acc;
  }, {});

  const subjectGroups = subjects.length > 0
    ? { 'All Subjects': subjects }
    : { 'Grade 9': [], 'Grade 10': [] };

  const mandatoryCount = subjects.filter((s) => !s.isElective).length;
  const electiveCount = subjects.filter((s) => s.isElective).length;

  const openModal = (mode) => { setModalMode(mode); setShowModal(true); };

  return (
    <AdminLayout pageTitle="System Management" headerAction={
      <button
        onClick={() => openModal('subject')}
        className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14m-7-7h14"/></svg>
        + Add New Subject
      </button>
    }>
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {modalMode === 'subject' ? 'Add New Subject' : modalMode === 'class' ? 'Add New Class' : 'Add New Section'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>

            {/* Tab switcher */}
            <div className="mb-6 flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              {['subject', 'class', 'section'].map((mode) => (
                <button key={mode} onClick={() => setModalMode(mode)}
                  className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors capitalize ${modalMode === mode ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                  {mode}
                </button>
              ))}
            </div>

            {modalMode === 'subject' && (
              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div><label className="mb-1 block text-sm font-semibold text-gray-700">Subject Name</label>
                  <input type="text" required placeholder="e.g. Mathematics" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"/></div>
                <div><label className="mb-1 block text-sm font-semibold text-gray-700">Department (optional)</label>
                  <input type="text" placeholder="e.g. Science" value={subjectDept} onChange={(e) => setSubjectDept(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"/></div>
                <div className="flex justify-end gap-3 mt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900">Create Subject</button>
                </div>
              </form>
            )}

            {modalMode === 'class' && (
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div><label className="mb-1 block text-sm font-semibold text-gray-700">Class Name</label>
                  <input type="text" required placeholder="e.g. Class 1" value={className} onChange={(e) => setClassName(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"/></div>
                <div><label className="mb-1 block text-sm font-semibold text-gray-700">Subject</label>
                  <input type="text" required placeholder="e.g. General" value={classSubject} onChange={(e) => setClassSubject(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"/></div>
                <div><label className="mb-1 block text-sm font-semibold text-gray-700">Homeroom Teacher (optional)</label>
                  <select value={classTeacherId} onChange={(e) => setClassTeacherId(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none">
                    <option value="">None</option>
                    {teachers.map((t) => <option key={t._id || t.id} value={t._id || t.id}>{t.user?.name || t.teacherId}</option>)}
                  </select></div>
                <div className="flex justify-end gap-3 mt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900">Create Class</button>
                </div>
              </form>
            )}

            {modalMode === 'section' && (
              <form onSubmit={handleCreateSection} className="space-y-4">
                <div><label className="mb-1 block text-sm font-semibold text-gray-700">Select Class</label>
                  <select required value={sectionClassId} onChange={(e) => setSectionClassId(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none">
                    <option value="">Select a class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name} • {c.subject}</option>)}
                  </select></div>
                <div><label className="mb-1 block text-sm font-semibold text-gray-700">Section Name</label>
                  <input type="text" required placeholder="e.g. A" value={sectionName} onChange={(e) => setSectionName(e.target.value)} disabled={!sectionClassId} className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none disabled:opacity-50"/></div>
                <div className="flex justify-end gap-3 mt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={!sectionClassId} className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50">Create Section</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Page Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Subject Management</h2>
        <p className="max-w-2xl text-sm text-gray-500">Configure and maintain the school's curriculum. Manage credit hours, elective status, and grade-level distributions across the academic program.</p>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Total Subjects', value: subjects.length, color: 'text-gray-900' },
          { label: 'Mandatory', value: mandatoryCount, color: 'text-green-600' },
          { label: 'Electives', value: electiveCount, color: 'text-orange-600' },
          { label: 'Avg Credit Hours', value: '4.2', color: 'text-gray-600' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{card.label}</div>
            <div className={`text-4xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* All Subjects — always shown so newly added subjects appear immediately */}
      {subjects.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-6 w-1 rounded-full bg-black"></div>
            <h3 className="text-xl font-bold text-gray-900">All Subjects</h3>
            <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-bold text-gray-600">{subjects.length} Subjects</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {subjects.map((s) => (
              <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.department || 'General'}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${s.isElective ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                    {s.isElective ? 'Elective' : 'Mandatory'}
                  </span>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => handleDeleteSubject(s.id, s.name)} className="text-gray-400 hover:text-red-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Classes grouped by Grade */}
      {Object.entries(groupedByGrade).length > 0 && (
        Object.entries(groupedByGrade).map(([grade, classItems]) => (
          <div key={grade} className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-6 w-1 rounded-full bg-black"></div>
              <h3 className="text-xl font-bold text-gray-900">{grade}</h3>
              <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-bold text-gray-600">{classItems.length} Classes</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {classItems.map((cls) => (
                <div key={cls.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="font-bold text-gray-900">{cls.name}</div>
                      <div className="text-xs text-gray-500">{cls.subject}</div>
                    </div>
                    <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-green-700">Mandatory</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Credits</div>
                      <div className="mt-1 text-lg font-bold text-gray-900">4.0 Hrs</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Dept</div>
                      <div className="mt-1 text-lg font-bold text-gray-900">{cls.subject}</div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button className="text-gray-400 hover:text-gray-700">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button className="text-gray-400 hover:text-red-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Empty state when nothing configured */}
      {subjects.length === 0 && Object.entries(groupedByGrade).length === 0 && (
        <div className="mb-8 rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center">
          <p className="text-gray-500">No subjects or classes configured yet.</p>
          <button onClick={() => openModal('subject')} className="mt-4 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900">Add First Subject</button>
        </div>
      )}

      {/* Expanding Curriculum Dark Banner */}
      <div className="relative overflow-hidden rounded-xl bg-black p-8 text-white">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
        <div className="relative z-10">
          <h3 className="mb-2 text-2xl font-bold">Expanding the Curriculum?</h3>
          <p className="mb-6 max-w-md text-sm text-gray-400">Our system supports modular subject integration for the upcoming academic year. Add elective streams easily.</p>
          <button
            onClick={() => openModal('subject')}
            className="rounded-lg bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-gray-100"
          >
            Start Batch Upload
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
