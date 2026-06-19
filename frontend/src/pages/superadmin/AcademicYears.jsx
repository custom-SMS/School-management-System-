import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { toast } from 'react-toastify';

export default function AcademicYears() {
  const [years, setYears]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [newYear, setNewYear]     = useState('');
  const [newStart, setNewStart]   = useState('');
  const [newEnd, setNewEnd]       = useState('');
  const [creating, setCreating]   = useState(false);
  const [actionId, setActionId]   = useState(null);

  const fetchYears = async () => {
    try {
      const res = await axios.get('/academic-years');
      setYears(res.data);
    } catch {
      toast.error('Failed to load academic years');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchYears(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newYear.trim()) { toast.error('Year label is required.'); return; }
    setCreating(true);
    try {
      await axios.post('/academic-years', {
        year: newYear.trim(),
        startDate: newStart || undefined,
        endDate: newEnd || undefined,
      });
      toast.success(`Academic year "${newYear}" created.`);
      setNewYear(''); setNewStart(''); setNewEnd('');
      fetchYears();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating academic year');
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (id, yearLabel) => {
    if (!window.confirm(`Set "${yearLabel}" as the active academic year? This will deactivate the current one.`)) return;
    setActionId(id);
    try {
      await axios.patch(`/academic-years/${id}/active`);
      toast.success(`"${yearLabel}" is now the active academic year.`);
      fetchYears();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error activating year');
    } finally {
      setActionId(null);
    }
  };

  const handleToggleRegistration = async (id, current, yearLabel) => {
    setActionId(id);
    try {
      await axios.patch(`/academic-years/${id}/registration`, { registrationOpen: !current });
      toast.success(`Registration ${!current ? 'opened' : 'closed'} for "${yearLabel}".`);
      fetchYears();
    } catch (err) {
      toast.error('Error toggling registration');
    } finally {
      setActionId(null);
    }
  };

  const activeYear = years.find(y => y.isActive);

  return (
    <SuperAdminLayout pageTitle="Academic Years">
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Academic Year Management</h2>
        <p className="text-sm font-medium text-slate-500">Create and control academic year lifecycle. Only one year can be active at a time.</p>
      </div>

      {/* Active year banner */}
      {activeYear && (
        <div className="mb-6 flex items-center gap-4 rounded-xl bg-emerald-50 border border-emerald-200 px-6 py-4">
          <div className="w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-emerald-200 shrink-0"></div>
          <div>
            <div className="text-sm font-bold text-emerald-900">Currently Active: <span className="text-emerald-700">{activeYear.year}</span></div>
            <div className="text-xs text-emerald-700 mt-0.5">
              Registration is <span className="font-bold">{activeYear.registrationOpen ? 'OPEN' : 'CLOSED'}</span>
              {activeYear.startDate && ` · Started: ${new Date(activeYear.startDate).toLocaleDateString()}`}
              {activeYear.endDate && ` · Ends: ${new Date(activeYear.endDate).toLocaleDateString()}`}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-fit">
          <h3 className="text-base font-bold text-slate-900 mb-5">Create New Academic Year</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Year Label <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newYear}
                onChange={e => setNewYear(e.target.value)}
                placeholder="e.g. 2025/2026"
                required
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Start Date</label>
              <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">End Date</label>
              <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button type="submit" disabled={creating}
              className="w-full bg-emerald-900 text-white font-bold py-2.5 rounded-lg hover:bg-emerald-800 transition  disabled:opacity-60 text-sm">
              {creating ? 'Creating…' : '+ Create Academic Year'}
            </button>
          </form>
        </div>

        {/* Years table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50">
            <h3 className="text-base font-bold text-slate-900">All Academic Years</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{years.length} year{years.length !== 1 ? 's' : ''} configured</p>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
            ) : years.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No academic years created yet.</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs">Year</th>
                    <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs">Status</th>
                    <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs">Registration</th>
                    <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs">Duration</th>
                    <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {years.map(y => (
                    <tr key={y.id} className={`hover:bg-slate-50 transition ${y.isActive ? 'bg-emerald-50/40' : ''}`}>
                      <td className="px-5 py-4 font-black text-slate-900">{y.year}</td>
                      <td className="px-5 py-4">
                        {y.isActive
                          ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>Active</span>
                          : <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">Inactive</span>
                        }
                      </td>
                      <td className="px-5 py-4">
                        <button
                          disabled={actionId === y.id}
                          onClick={() => handleToggleRegistration(y.id, y.registrationOpen, y.year)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition disabled:opacity-40 ${
                            y.registrationOpen ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {y.registrationOpen ? '● OPEN' : '○ CLOSED'}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {y.startDate ? new Date(y.startDate).toLocaleDateString() : '—'}
                        {' → '}
                        {y.endDate ? new Date(y.endDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {y.isActive ? (
                          <span className="text-xs font-bold text-emerald-600">Current Year</span>
                        ) : (
                          <button
                            disabled={actionId === y.id}
                            onClick={() => handleActivate(y.id, y.year)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-lg transition disabled:opacity-40"
                          >
                            {actionId === y.id ? '…' : 'Set Active'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
