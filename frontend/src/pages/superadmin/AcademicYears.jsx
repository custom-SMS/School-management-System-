import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { toast } from 'react-toastify';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
// date -> yyyy-mm-dd for <input type="date">
const toInputDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AcademicYears() {
  const [years, setYears]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [newYear, setNewYear]     = useState('');
  const [newStart, setNewStart]   = useState('');
  const [newEnd, setNewEnd]       = useState('');
  const [creating, setCreating]   = useState(false);
  const [actionId, setActionId]   = useState(null);

  // Edit registration period modal
  const [editYear, setEditYear]   = useState(null); // the year object being edited
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd]     = useState('');
  const [savingPeriod, setSavingPeriod] = useState(false);

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
    if (newStart && newEnd && new Date(newEnd) < new Date(newStart)) {
      toast.error('Registration end cannot be before the start date.'); return;
    }
    setCreating(true);
    try {
      await axios.post('/academic-years', {
        year: newYear.trim(),
        registrationStart: newStart || undefined,
        registrationEnd: newEnd || undefined,
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

  const openEditPeriod = (y) => {
    setEditYear(y);
    setEditStart(toInputDate(y.registrationStart));
    setEditEnd(toInputDate(y.registrationEnd));
  };

  const handleSavePeriod = async (e) => {
    e.preventDefault();
    if (!editStart && !editEnd) { toast.error('Provide a start and/or end date.'); return; }
    if (editStart && editEnd && new Date(editEnd) < new Date(editStart)) {
      toast.error('Registration end cannot be before the start date.'); return;
    }
    setSavingPeriod(true);
    try {
      await axios.patch(`/academic-years/${editYear.id}/registration-period`, {
        registrationStart: editStart || undefined,
        registrationEnd: editEnd || undefined,
      });
      toast.success(`Registration period updated for "${editYear.year}".`);
      setEditYear(null);
      fetchYears();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating registration period');
    } finally {
      setSavingPeriod(false);
    }
  };

  const activeYear = years.find(y => y.isActive);

  return (
    <SuperAdminLayout pageTitle="Academic Years">
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Academic Year Management</h2>
        <p className="text-sm font-medium text-slate-500">Create and control academic year lifecycle. Registration opens automatically during the configured window of the active year.</p>
      </div>

      {/* Edit period modal */}
      {editYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Registration Period</h3>
              <button onClick={() => setEditYear(null)} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
            </div>
            <p className="mb-6 text-sm text-slate-500">{editYear.year} — registration is open only while the active year's window covers today. Extending the end date reopens registration.</p>
            <form onSubmit={handleSavePeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Registration Opens</label>
                <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Registration Closes</label>
                <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditYear(null)} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={savingPeriod} className="rounded-lg bg-emerald-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{savingPeriod ? 'Saving…' : 'Save Period'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active year banner */}
      {activeYear && (
        <div className="mb-6 flex items-center gap-4 rounded-xl bg-emerald-50 border border-emerald-200 px-6 py-4">
          <div className="w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-emerald-200 shrink-0"></div>
          <div>
            <div className="text-sm font-bold text-emerald-900">Currently Active: <span className="text-emerald-700">{activeYear.year}</span></div>
            <div className="text-xs text-emerald-700 mt-0.5">
              Registration is <span className="font-bold">{activeYear.registrationOpen ? 'OPEN' : 'CLOSED'}</span>
              {' · '}Window: {fmtDate(activeYear.registrationStart)} → {fmtDate(activeYear.registrationEnd)}
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
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Registration Opens</label>
              <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Registration Closes</label>
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
                    <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs">Window</th>
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
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                          y.registrationOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {y.registrationOpen ? '● OPEN' : '○ CLOSED'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {fmtDate(y.registrationStart)} → {fmtDate(y.registrationEnd)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEditPeriod(y)}
                            className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg transition"
                          >
                            Edit Period
                          </button>
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
                        </div>
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
