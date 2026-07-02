import { useEffect, useMemo, useState } from 'react';
import { showConfirmDialog } from '../utils/sweetAlert';
import axios from '../api/axios';
import AdminLayout from '../components/AdminLayout';

const AVATAR_COLORS = ['bg-gray-700', 'bg-blue-600', 'bg-teal-600', 'bg-green-700', 'bg-orange-600'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const DEPT_TAGS = { Mathematics: 'bg-gray-100 text-gray-700', Science: 'bg-gray-100 text-gray-700', Languages: 'bg-gray-100 text-gray-700', IT: 'bg-gray-100 text-gray-700' };
const deptStyle = (dept) => DEPT_TAGS[dept] || 'bg-gray-100 text-gray-600';

const initialForm = { name: '', email: '', password: '', subject: '' };
const initialToast = { type: '', text: '' };

export default function Teachers() {
  const [formData, setFormData] = useState(initialForm);
  const [teachers, setTeachers] = useState([]);
  const [credentials, setCredentials] = useState(null);
  const [toast, setToast] = useState(initialToast);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState('');
  const [updatingStatusTeacherId, setUpdatingStatusTeacherId] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const loadTeachers = async () => {
    try {
      const res = await axios.get('/teachers');
      setTeachers((res.data || []).map((teacher) => ({
        ...teacher,
        isActive: teacher.user?.isActive ?? true,
      })));
    } catch (error) {
      setToast({ type: 'error', text: error.response?.data?.message || 'Failed to load teachers' });
    }
  };

  useEffect(() => { loadTeachers(); }, []);

  const openCreateModal = () => {
    setCredentials(null);
    setToast(initialToast);
    setEditingTeacherId('');
    setFormData(initialForm);
    setShowForm(true);
  };

  const openEditModal = (teacher) => {
    setCredentials(null);
    setToast(initialToast);
    setEditingTeacherId(teacher._id);
    setFormData({
      name: teacher.user?.name || '',
      email: teacher.user?.email || '',
      password: '',
      subject: teacher.subject || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToast(initialToast);
    try {
      const payload = { ...formData, password: formData.password || undefined };
      const isEditing = Boolean(editingTeacherId);
      const res = isEditing
        ? await axios.put(`/teachers/${editingTeacherId}`, payload)
        : await axios.post('/teachers', payload);

      setCredentials(isEditing ? null : (res.data.credentials || null));
      setToast({
        type: 'success',
        text: res.data.message || (isEditing ? 'Teacher updated successfully' : 'Teacher registered successfully')
      });
      setFormData(initialForm);
      setEditingTeacherId('');
      setShowForm(false);
      await loadTeachers();
    } catch (error) {
      setToast({
        type: 'error',
        text: error.response?.data?.message || (editingTeacherId ? 'Failed to update teacher' : 'Failed to register teacher')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (teacher) => {
    const teacherName = teacher.user?.name || teacher.teacherId || 'this teacher';
    const nextIsActive = !(teacher.isActive ?? true);
    const actionLabel = nextIsActive ? 'activate' : 'deactivate';

    const { isConfirmed } = await showConfirmDialog({
      title: `${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} teacher?`,
      text: `Are you sure you want to ${actionLabel} ${teacherName}?`,
    });
    if (!isConfirmed) return;

    setUpdatingStatusTeacherId(teacher._id);
    setToast(initialToast);

    try {
      await axios.patch(`/users/${teacher.userId || teacher.user?.id}/status`, { isActive: nextIsActive });
      setToast({
        type: 'success',
        text: `${teacherName} ${nextIsActive ? 'activated' : 'deactivated'} successfully`
      });
      await loadTeachers();
    } catch (error) {
      setToast({
        type: 'error',
        text: error.response?.data?.message || `Failed to ${actionLabel} teacher`
      });
    } finally {
      setUpdatingStatusTeacherId('');
    }
  };

  const departments = useMemo(() => {
    const depts = new Set(teachers.map((t) => t.subject).filter(Boolean));
    return ['All Departments', ...depts];
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return teachers.filter((t) => {
      const matchDept = deptFilter === 'All Departments' || t.subject === deptFilter;
      if (!matchDept) return false;
      if (!q) return true;
      return (t.user?.name || '').toLowerCase().includes(q) || (t.user?.email || '').toLowerCase().includes(q) || (t.subject || '').toLowerCase().includes(q);
    });
  }, [teachers, searchQ, deptFilter]);

  return (
    <AdminLayout pageTitle="System Management" headerAction={
      <button
        onClick={openCreateModal}
        className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14m-7-7h14"/></svg>
        + ADD STAFF
      </button>
    }>
      {/* Add Staff Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="mb-6 text-xl font-bold text-gray-900">{editingTeacherId ? 'Edit Teacher' : 'Register New Teacher'}</h2>
            {toast.text && showForm && (
              <div className={`mb-4 rounded-lg border p-3 text-sm ${toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-700'}`}>
                {toast.text}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="mb-1 block text-sm font-semibold text-gray-700">Full Name</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none" /></div>
              <div><label className="mb-1 block text-sm font-semibold text-gray-700">Email (optional)</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none" /></div>
              <div><label className="mb-1 block text-sm font-semibold text-gray-700">Subject / Department</label>
                <input type="text" required placeholder="e.g. Mathematics" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none" /></div>
              <div><label className="mb-1 block text-sm font-semibold text-gray-700">Password (optional)</label>
                <input type="text" placeholder="Leave blank to auto-generate" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none" /></div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => { setShowForm(false); setEditingTeacherId(''); setFormData(initialForm); }} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading} className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50">{loading ? 'Saving…' : (editingTeacherId ? 'Save Changes' : 'Register Teacher')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {credentials && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <div className="font-bold">Generated credentials</div>
          <div>Teacher ID: {credentials.teacherId} | Password: {credentials.password}</div>
        </div>
      )}
      {toast.text && !showForm && (
        <div className={`mb-4 rounded-lg border p-3 text-sm ${toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-600' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
          {toast.text}
        </div>
      )}

      {/* Page Title */}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Teacher Directory</h2>
          <p className="text-sm text-gray-500">Manage and view all institutional academic staff records.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sticky top-16 z-40 bg-slate-50/50 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 backdrop-blur-sm">
          <div className="relative flex items-center">
            <svg className="absolute left-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8" strokeWidth="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2"/></svg>
            <input type="text" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search staff name..." className="rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-gray-300 w-52"/>
          </div>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none">
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
          <button className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      {/* Teacher Table */}
      <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4">Staff Name</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Assigned Classes</th>
                <th className="px-6 py-4">Contact Information</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTeachers.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-500">No teachers found.</td></tr>
              )}
              {filteredTeachers.map((teacher) => {
                const name = teacher.user?.name || '—';
                const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <tr key={teacher._id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(name)}`}>{initials}</div>
                        <div>
                          <div className="font-bold text-gray-900">{name}</div>
                          <div className="text-xs text-gray-500">{teacher.teacherId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${deptStyle(teacher.subject)}`}>{teacher.subject || '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">—</td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700">{teacher.user?.email || '—'}</div>
                      <div className={`mt-1 text-xs font-semibold ${teacher.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {teacher.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEditModal(teacher)} title="Edit Teacher" className="text-gray-400 hover:text-gray-700">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232a2.828 2.828 0 114 4L7 21H3v-4L15.232 5.232z"/></svg>
                        </button>
                        <button
                          onClick={() => handleStatusToggle(teacher)}
                          disabled={updatingStatusTeacherId === teacher._id}
                          title={teacher.isActive ? 'Deactivate Teacher' : 'Activate Teacher'}
                          className={`text-xs font-semibold ${
                            teacher.isActive
                              ? 'text-amber-600 hover:text-amber-800'
                              : 'text-emerald-600 hover:text-emerald-800'
                          } disabled:opacity-50`}
                        >
                          {updatingStatusTeacherId === teacher._id ? '…' : teacher.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-3">
          <span className="text-sm text-gray-500">Showing 1 - {filteredTeachers.length} of {filteredTeachers.length} staff members</span>
          <div className="flex gap-1">
            <button className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-400"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg></button>
            <button className="flex h-8 w-8 items-center justify-center rounded bg-black font-semibold text-white text-sm">1</button>
            <button className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white font-semibold text-sm text-gray-600 hover:bg-gray-50">2</button>
            <button className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-400"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg></button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Leadership Note + Stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_200px_200px]">
        <div className="relative overflow-hidden rounded-xl bg-black p-8 text-white">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">Leadership Note</div>
          <h3 className="mb-6 text-xl font-bold leading-snug">Professional Growth Review starts next week. Ensure all staff logs are updated.</h3>
          <button className="flex items-center gap-2 text-sm font-semibold text-white hover:underline">
            View Compliance Status <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
          </button>
          <div className="absolute right-6 bottom-6 opacity-10 text-8xl font-bold">📚</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Diversity</span>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1">42%</div>
          <div className="mb-4 text-sm text-gray-500">Female Faculty</div>
          <div className="flex items-end gap-1 h-8">
            {[60, 80, 65, 90].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-black" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Retention</span>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1">94<span className="text-2xl">%</span></div>
          <div className="text-sm text-gray-500">Staff Stability Index</div>
        </div>
      </div>
    </AdminLayout>
  );
}

