import { useState, useEffect, useMemo } from 'react';
import { showDangerConfirmDialog } from '../../utils/sweetAlert';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import AdminLayout from '../../components/AdminLayout';
import { GRADES } from '../../constants/school';

const ALLOWED_CLASS_NAMES = GRADES;

export default function Classes() {
  const [classes, setClasses] = useState([]);

  const [loading, setLoading] = useState(true);

  // Create-class modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState(null);
  const [editingClassId, setEditingClassId] = useState(null);
  const [error, setError] = useState(false);
  const [name, setName] = useState('');
  // const [subject, setSubject] = useState('');

  const availableClassOptions = useMemo(() => {
    const existingClassNames = new Set(
      classes
        .map((klass) => (klass?.name || '').trim().toLowerCase())
        .filter(Boolean)
    );

    return ALLOWED_CLASS_NAMES.filter(
      (className) => !existingClassNames.has(className.toLowerCase())
    );
  }, [classes]);

  const fetchClasses = () => {
    setError(false);
    return axios.get('/classroom/classes')
      .then(res => setClasses(res.data || []))
      .catch(err => {
        console.error(err);
        setError(true);
      });
  };

  useEffect(() => {
    fetchClasses().finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setEditingClassId(null);
    setName('');
  };

  const handleEditClick = (klass) => {
    setEditingClassId(klass.id);
    setName(klass.name || '');
    setShowModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    if (availableClassOptions.length > 0) {
      setName(availableClassOptions[0]);
    }
    setShowModal(true);
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) {
      toast.error('Class name is required.');
      return;
    }

    if (!ALLOWED_CLASS_NAMES.includes(normalizedName)) {
      toast.error('Please select a valid class from the dropdown.');
      return;
    }

    const existingClassNames = new Set(classes.map((klass) => (klass?.name || '').trim().toLowerCase()));
    if (!editingClassId && existingClassNames.has(normalizedName.toLowerCase())) {
      toast.error(`Class "${normalizedName}" already exists.`);
      return;
    }

    setSaving(true);
    try {
      if (editingClassId) {
        toast.info('Edit is not available yet because the backend update endpoint is missing.');
        return;
      }

      await axios.post('/classroom/classes', {
        name: normalizedName
      });
      toast.success(`Class "${normalizedName}" created.`);
      resetForm();
      setShowModal(false);
      await fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create class.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (klass) => {
    const { isConfirmed } = await showDangerConfirmDialog({
      title: 'Delete class?',
      text: `Delete class "${klass.name}"? This cannot be undone.`,
      confirmButtonText: 'Delete',
    });
    if (!isConfirmed) return;

    setDeletingClassId(klass.id);
    try {
      await axios.delete(`/classroom/classes/${klass.id}`);
      toast.success(`Class "${klass.name}" deleted.`);
      await fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete class.');
    } finally {
      setDeletingClassId(null);
    }
  };

  if (loading) return <AdminLayout pageTitle="Classes Management"><div className="p-4">Loading...</div></AdminLayout>;

  return (
    <AdminLayout pageTitle="Classes Management">
      {/* Create Class Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editingClassId ? 'Edit Class' : 'Add New Class'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Class Name</label>
                <select
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={editingClassId || availableClassOptions.length === 0}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">Select a class</option>
                  {(editingClassId ? [name] : availableClassOptions).map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
                {!editingClassId && availableClassOptions.length === 0 && (
                  <p className="mt-2 text-xs font-medium text-amber-700">All classes from Nursery to Grade 12 have already been created.</p>
                )}
              </div>
              {/* <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Subject</label>
                {subjects.length > 0 ? (
                  <select required value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none">
                    <option value="">Select a subject</option>
                    {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                ) : (
                  <input type="text" required placeholder="e.g. General" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none" />
                )}
              </div> */}
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50">
                  {saving ? (editingClassId ? 'Saving…' : 'Creating…') : (editingClassId ? 'Save Changes' : 'Create Class')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="sticky top-16 z-40 p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/90 backdrop-blur-sm -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Manage Classes</h2>
            <p className="text-sm font-medium text-gray-500">View and manage grade levels and their homeroom teachers.</p>
          </div>
          <button
            onClick={openCreateModal}
            disabled={availableClassOptions.length === 0}
            className="px-4 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + New Class
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Class Name</th>
                {/* <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Subject</th> */}
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Teacher</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Sections</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {classes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-bold text-gray-900">{c.name}</td>
                  {/* <td className="px-6 py-4">{c.subject}</td> */}
                  <td className="px-6 py-4 text-gray-500">{c.homeroomTeacher?.user?.name || c.teacher?.user?.name || 'Unassigned'}</td>
                  <td className="px-6 py-4">{c.sections?.length || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEditClick(c)} className="text-xs font-bold text-black hover:text-slate-900 bg-slate-100 px-3 py-1 rounded-md">Edit</button>
                      <button
                        onClick={() => handleDeleteClass(c)}
                        disabled={deletingClassId === c.id}
                        className="text-xs font-bold text-red-700 hover:text-red-800 bg-red-50 px-3 py-1 rounded-md disabled:opacity-50"
                      >
                        {deletingClassId === c.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {error ? (
                <tr><td colSpan="4" className="p-4 text-center font-semibold text-rose-500">Failed to load classes.</td></tr>
              ) : classes.length === 0 && (
                <tr><td colSpan="4" className="p-4 text-center text-gray-500">No classes found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
