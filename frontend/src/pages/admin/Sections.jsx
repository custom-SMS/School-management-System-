import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import AdminLayout from '../../components/AdminLayout';

export default function Sections() {
  const navigate = useNavigate();
  const location = useLocation();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedClassId, setSelectedClassId] = useState(() => searchParams.get('classId') || location.state?.classId || '');
  const [sections, setSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [error, setError] = useState(false);

  // Create-section modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const [nextSuggestedSection, setNextSuggestedSection] = useState('A');

  // Edit-section modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState('');
  const [editingSectionName, setEditingSectionName] = useState('');
  const [editingHomeroomTeacherId, setEditingHomeroomTeacherId] = useState('');
  const [editingLoading, setEditingLoading] = useState(false);
  const [deletingSectionId, setDeletingSectionId] = useState('');

  useEffect(() => {
    axios.get('/classroom/classes')
      .then((res) => setClasses(res.data || []))
      .catch((err) => console.error(err));

    axios.get('/teachers')
      .then((res) => setTeachers(res.data || []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      setSearchParams({ classId: selectedClassId });
    } else {
      setSearchParams({});
    }
  }, [selectedClassId, setSearchParams]);

  useEffect(() => {
    if (!selectedClassId && location.state?.classId) {
      setSelectedClassId(location.state.classId);
    }
  }, [location.state, selectedClassId]);

  const getNextSectionLetter = (sectionList = []) => {
    const usedLetters = new Set(
      sectionList
        .map((section) => String(section?.name || '').trim().toUpperCase())
        .filter(Boolean)
    );

    let code = 65;
    while (usedLetters.has(String.fromCharCode(code))) {
      code += 1;
    }

    return String.fromCharCode(code);
  };

  const fetchSections = (classId) => {
    if (!classId) {
      setSections([]);
      setNextSuggestedSection('A');
      return Promise.resolve();
    }

    setLoadingSections(true);
    setError(false);
    return axios.get(`/classroom/sections/${classId}`)
      .then((res) => {
        const sectionList = res.data || [];
        setSections(sectionList);
        setNextSuggestedSection(getNextSectionLetter(sectionList));
      })
      .catch((err) => {
        console.error(err);
        setSections([]);
        setNextSuggestedSection('A');
        setError(true);
      })
      .finally(() => setLoadingSections(false));
  };

  useEffect(() => {
    fetchSections(selectedClassId);
  }, [selectedClassId]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const handleCreateSection = async (e) => {
    e.preventDefault();

    if (!selectedClassId) {
      toast.error('Select a class first.');
      return;
    }

    setSaving(true);

    try {
      const sectionToCreate = sectionName.trim() || nextSuggestedSection;

      await axios.post('/classroom/sections', {
        name: sectionToCreate,
        classId: selectedClassId
      });

      toast.success(`Section "${sectionToCreate}" created.`);
      setSectionName('');
      setShowModal(false);
      await fetchSections(selectedClassId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create section.');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = async (sectionId) => {
    setEditingLoading(true);
    setShowEditModal(true);
    setEditingSectionId(sectionId);

    try {
      const res = await axios.get(`/classroom/sections/detail/${sectionId}`);
      const section = res.data || {};
      setEditingSectionName(section.name || '');
      setEditingHomeroomTeacherId(section.homeroomTeacher?.id || '');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load section details.');
      setShowEditModal(false);
      setEditingSectionId('');
    } finally {
      setEditingLoading(false);
    }
  };

  const handleUpdateSection = async (e) => {
    e.preventDefault();

    if (!editingSectionId) {
      toast.error('No section selected for editing.');
      return;
    }

    setSaving(true);

    try {
      await axios.put(`/classroom/sections/detail/${editingSectionId}`, {
        name: editingSectionName.trim() || nextSuggestedSection,
        homeroomTeacherId: editingHomeroomTeacherId || null
      });

      toast.success('Section updated successfully.');
      setShowEditModal(false);
      setEditingSectionId('');
      setEditingSectionName('');
      setEditingHomeroomTeacherId('');
      await fetchSections(selectedClassId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update section.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('Delete this section? This action cannot be undone.')) {
      return;
    }

    setDeletingSectionId(sectionId);

    try {
      await axios.delete(`/classroom/sections/detail/${sectionId}`);
      toast.success('Section deleted successfully.');
      await fetchSections(selectedClassId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete section.');
    } finally {
      setDeletingSectionId('');
    }
  };

  return (
    <AdminLayout pageTitle="Sections Management">
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add New Section</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSection} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Class</label>
                <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-semibold text-gray-700">
                  {selectedClass ? selectedClass.name : '—'}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Section Name</label>
                <input
                  type="text"
                  placeholder={`Suggested: ${nextSuggestedSection}`}
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to use the next section automatically: {nextSuggestedSection}
                </p>
              </div>

              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50"
                >
                  {saving ? 'Creating…' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Edit Section</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSection} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Section Name</label>
                <input
                  type="text"
                  placeholder="Section name"
                  value={editingSectionName}
                  onChange={(e) => setEditingSectionName(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Homeroom Teacher</label>
                <select
                  value={editingHomeroomTeacherId}
                  onChange={(e) => setEditingHomeroomTeacherId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {teachers.map((t) => (
                    <option key={t._id || t.id} value={t._id || t.id}>
                      {t.user?.name || t.teacherId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || editingLoading}
                  className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50"
                >
                  {saving ? 'Updating…' : 'Update Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="sticky top-16 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/90 p-6 backdrop-blur-sm -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Manage Sections</h2>
            <p className="text-sm font-medium text-gray-500">
              View and manage class sections like 10A, 10B, 10C.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white p-2.5 text-sm font-semibold text-gray-700 focus:border-black focus:outline-none"
            >
              <option value="">Select a class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSectionName('');
                setShowModal(true);
              }}
              disabled={!selectedClassId}
              className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
            >
              + New Section
            </button>
          </div>
        </div>

        {!selectedClassId ? (
          <div className="p-12 text-center text-gray-500">
            <svg className="mx-auto mb-4 h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-lg font-semibold text-gray-600">Select a class to view its sections.</p>
            <p className="mt-1 text-sm">Choose a class above to add and manage sections.</p>
          </div>
        ) : loadingSections ? (
          <div className="p-12 text-center text-gray-500">Loading sections…</div>
        ) : error ? (
          <div className="p-12 text-center font-semibold text-rose-500">Failed to load sections.</div>
        ) : sections.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg font-semibold text-gray-600">No sections created yet.</p>
            <p className="mt-1 text-sm">Click “+ New Section” to add one to {selectedClass?.name}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Section</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Class</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Homeroom Teacher</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Created</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {sections.map((s) => (
                  <tr key={s.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-900">{`${selectedClass?.name || ''}${s.name}`}</td>
                    <td className="px-6 py-4 text-gray-500">{selectedClass?.name}</td>
                    <td className="px-6 py-4 text-gray-500">{s.homeroomTeacher?.user?.name || 'Unassigned'}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(s.id)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/sections/${s.id}/students`)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        View Students
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(s.id)}
                        disabled={deletingSectionId === s.id}
                        className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingSectionId === s.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
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