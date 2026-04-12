import { useEffect, useMemo, useState } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';

const initialForm = {
  name: '',
  email: '',
  password: '',
  subject: '',
};

export default function Teachers() {
  const [formData, setFormData] = useState(initialForm);
  const [teachers, setTeachers] = useState([]);
  const [credentials, setCredentials] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingTeacherId, setDeletingTeacherId] = useState('');

  const loadTeachers = async () => {
    try {
      const res = await axios.get('/teachers');
      setTeachers(res.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to load teachers');
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const hasTeachers = useMemo(() => teachers.length > 0, [teachers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const payload = {
        ...formData,
        password: formData.password || undefined,
      };

      const res = await axios.post('/teachers', payload);
      setCredentials(res.data.credentials || null);
      setMessage(res.data.message || 'Teacher registered successfully');
      setFormData(initialForm);
      await loadTeachers();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to register teacher');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = async (teacher) => {
    const confirmed = window.confirm(`Delete ${teacher.user?.name || teacher.teacherId}? This removes the teacher profile from the system.`);
    if (!confirmed) return;

    setDeletingTeacherId(teacher._id);
    setMessage('');

    try {
      const res = await axios.delete(`/teachers/${teacher._id}`);
      setMessage(res.data.message || 'Teacher deleted successfully');
      await loadTeachers();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to delete teacher');
    } finally {
      setDeletingTeacherId('');
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-10">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-4xl border border-white/50 bg-white/75 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Teacher Registration</h1>
          <p className="mt-2 text-sm text-slate-500">Create teacher accounts and generate their login credentials.</p>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            {message}
          </div>
        )}

        {credentials && (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            <div className="font-semibold">Generated credentials</div>
            <div>Teacher ID: {credentials.teacherId}</div>
            <div>Password: {credentials.password}</div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <form onSubmit={handleSubmit} className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <div className="mb-6 border-b border-slate-200 pb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Teacher intake</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Register New Teacher</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email (optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Password (optional)</label>
                <input
                  type="text"
                  placeholder="Leave blank to auto-generate"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full rounded-2xl bg-linear-to-r from-blue-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Registering...' : 'Register Teacher'}
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <div className="mb-6 border-b border-slate-200 pb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Teacher records</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Registered Teachers</h2>
            </div>

            <div className="space-y-3 sm:hidden">
              {teachers.map((teacher) => (
                <div key={teacher._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">ID</div>
                      <div className="mt-1 font-semibold text-blue-700">{teacher.teacherId}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTeacher(teacher)}
                      disabled={deletingTeacherId === teacher._id}
                      className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingTeacherId === teacher._id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-700">
                    <div><span className="font-semibold text-slate-900">Name:</span> {teacher.user?.name}</div>
                    <div><span className="font-semibold text-slate-900">Subject:</span> {teacher.subject}</div>
                    <div><span className="font-semibold text-slate-900">Email:</span> {teacher.user?.email || '—'}</div>
                  </div>
                </div>
              ))}
              {!hasTeachers && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-500">No teachers registered yet.</div>}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 sm:block">
              <table className="min-w-190 w-full border-collapse text-left text-sm sm:text-base">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-4">ID</th>
                    <th className="px-4 py-4">Name</th>
                    <th className="px-4 py-4">Subject</th>
                    <th className="px-4 py-4">Email</th>
                    <th className="px-4 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {teachers.map((teacher) => (
                    <tr key={teacher._id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold text-blue-700">{teacher.teacherId}</td>
                      <td className="px-4 py-4 text-slate-700">{teacher.user?.name}</td>
                      <td className="px-4 py-4 text-slate-700">{teacher.subject}</td>
                      <td className="px-4 py-4 text-slate-500">{teacher.user?.email || '—'}</td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteTeacher(teacher)}
                          disabled={deletingTeacherId === teacher._id}
                          className="rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingTeacherId === teacher._id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!hasTeachers && (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-slate-500">No teachers registered yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
