import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import AdminLayout from '../../components/AdminLayout';

export default function Sections() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sections, setSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);

  // Create-section modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sectionName, setSectionName] = useState('');

  useEffect(() => {
    axios.get('/classroom/classes')
      .then(res => setClasses(res.data || []))
      .catch(err => console.error(err));
  }, []);

  const fetchSections = (classId) => {
    if (!classId) { setSections([]); return Promise.resolve(); }
    setLoadingSections(true);
    return axios.get(`/classroom/sections/${classId}`)
      .then(res => setSections(res.data || []))
      .catch(err => { console.error(err); setSections([]); })
      .finally(() => setLoadingSections(false));
  };

  useEffect(() => { fetchSections(selectedClassId); }, [selectedClassId]);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!selectedClassId) { toast.error('Select a class first.'); return; }
    if (!sectionName.trim()) { toast.error('Section name is required.'); return; }
    setSaving(true);
    try {
      await axios.post('/classroom/sections', { name: sectionName.trim(), classId: selectedClassId });
      toast.success(`Section "${sectionName}" created.`);
      setSectionName('');
      setShowModal(false);
      await fetchSections(selectedClassId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create section.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout pageTitle="Sections Management">
      {/* Create Section Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add New Section</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <form onSubmit={handleCreateSection} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Class</label>
                <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-semibold text-gray-700">
                  {selectedClass ? `${selectedClass.name} • ${selectedClass.subject}` : '—'}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Section Name</label>
                <input type="text" required placeholder="e.g. A" value={sectionName} onChange={(e) => setSectionName(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50">{saving ? 'Creating…' : 'Create Section'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Manage Sections</h2>
            <p className="text-sm font-medium text-gray-500">View and manage class sections (e.g. A, B, C).</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white p-2.5 text-sm font-semibold text-gray-700 focus:border-black focus:outline-none"
            >
              <option value="">Select a class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} • {c.subject}</option>)}
            </select>
            <button
              onClick={() => { setSectionName(''); setShowModal(true); }}
              disabled={!selectedClassId}
              className="px-4 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition shadow-sm disabled:opacity-50"
            >
              + New Section
            </button>
          </div>
        </div>

        {!selectedClassId ? (
          <div className="p-12 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="font-semibold text-gray-600 text-lg">Select a class to view its sections.</p>
            <p className="text-sm mt-1">Choose a class above to add and manage sections.</p>
          </div>
        ) : loadingSections ? (
          <div className="p-12 text-center text-gray-500">Loading sections…</div>
        ) : sections.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="font-semibold text-gray-600 text-lg">No sections created yet.</p>
            <p className="text-sm mt-1">Click “+ New Section” to add one to {selectedClass?.name}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Section</th>
                  <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Class</th>
                  <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {sections.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-bold text-gray-900">Section {s.name}</td>
                    <td className="px-6 py-4 text-gray-500">{selectedClass?.name} • {selectedClass?.subject}</td>
                    <td className="px-6 py-4 text-gray-500">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
