import { useState, useEffect, useContext } from 'react';
import axios from '../../api/axios';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { useBranch } from '../../hooks/useBranch';
import {
  showConfirmDialog,
  showDangerConfirmDialog,
} from '../../utils/sweetAlert';

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
  const { isSuper } = useAuth();
  const { activeSemester, switchSemester, refetchSemester } = useBranch();

  const [years, setYears]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [newYear, setNewYear]     = useState('');
  const [newStart, setNewStart]   = useState('');
  const [newEnd, setNewEnd]       = useState('');
  const [creating, setCreating]   = useState(false);
  const [actionId, setActionId]   = useState(null);
  const [expandedYearId, setExpandedYearId] = useState(null);

  // Edit registration period modal
  const [editYear, setEditYear]   = useState(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd]     = useState('');
  const [savingPeriod, setSavingPeriod] = useState(false);

  // Edit semester dates modal
  const [editSemester, setEditSemester] = useState(null);
  const [semStart, setSemStart]   = useState('');
  const [semEnd, setSemEnd]       = useState('');
  const [savingSem, setSavingSem] = useState(false);

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
      toast.success(`Academic year "${newYear}" created with Semester 1 and Semester 2.`);
      setNewYear(''); setNewStart(''); setNewEnd('');
      fetchYears();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating academic year');
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (id, yearLabel) => {
    const result = await showConfirmDialog({
      title: 'Set active academic year?',
      text: `Set "${yearLabel}" as the active academic year? This will deactivate the current one.`,
      confirmButtonText: 'Yes, set active',
    });

    if (!result.isConfirmed) return;

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

  const handleToggleRegistration = async (year) => {
    if (!year.isActive) {
      toast.error('Only the active academic year can be opened or closed for registration.');
      return;
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const defaultEnd = new Date(today);
    defaultEnd.setMonth(defaultEnd.getMonth() + 1);

    const registrationStart = year.registrationOpen
      ? (year.registrationStart ? toInputDate(year.registrationStart) : toInputDate(today))
      : (year.registrationStart ? toInputDate(year.registrationStart) : toInputDate(today));

    const registrationEnd = year.registrationOpen
      ? toInputDate(yesterday)
      : (year.registrationEnd && new Date(year.registrationEnd) >= today ? toInputDate(year.registrationEnd) : toInputDate(defaultEnd));

    const actionLabel = year.registrationOpen ? 'close' : 'open';
    const result = year.registrationOpen
      ? await showDangerConfirmDialog({
          title: `${actionLabel[0].toUpperCase()}${actionLabel.slice(1)} registration?`,
          text: `${actionLabel[0].toUpperCase()}${actionLabel.slice(1)} registration for "${year.year}"?`,
          confirmButtonText: 'Yes, close it',
          confirmButtonColor: '#be123c',
        })
      : await showConfirmDialog({
          title: `${actionLabel[0].toUpperCase()}${actionLabel.slice(1)} registration?`,
          text: `${actionLabel[0].toUpperCase()}${actionLabel.slice(1)} registration for "${year.year}"?`,
          confirmButtonText: 'Yes, open it',
          confirmButtonColor: '#047857',
        });

    if (!result.isConfirmed) return;

    setActionId(year.id);
    try {
      await axios.patch(`/academic-years/${year.id}/registration-period`, {
        registrationStart,
        registrationEnd,
      });
      toast.success(`Registration ${year.registrationOpen ? 'closed' : 'opened'} for "${year.year}".`);
      fetchYears();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${actionLabel} registration.`);
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

  // ── Semester actions ────────────────────────────────────────────────────────

  const handleSetActiveSemester = async (semester, yearLabel) => {
    if (!isSuper) { toast.error('Only SuperAdmin can switch the active semester.'); return; }
    if (semester.isActive) return; // already active

    const result = await showConfirmDialog({
      title: 'Switch active semester?',
      text: `Set "${semester.name}" (${yearLabel}) as the globally active semester? This affects grades, report cards, and timetables for all branches.`,
      confirmButtonText: 'Yes, switch',
    });
    if (!result.isConfirmed) return;

    setActionId(semester.id);
    try {
      const outcome = await switchSemester(semester.id);
      if (outcome.ok) {
        toast.success(`"${semester.name}" (${yearLabel}) is now the active semester.`);
        await refetchSemester();
        fetchYears();
      } else {
        toast.error(outcome.message);
      }
    } catch {
      toast.error('Failed to switch active semester.');
    } finally {
      setActionId(null);
    }
  };

  const openEditSemester = (sem) => {
    setEditSemester(sem);
    setSemStart(toInputDate(sem.startDate));
    setSemEnd(toInputDate(sem.endDate));
  };

  const handleSaveSemesterDates = async (e) => {
    e.preventDefault();
    if (semStart && semEnd && new Date(semEnd) < new Date(semStart)) {
      toast.error('End date cannot be before start date.'); return;
    }
    setSavingSem(true);
    try {
      await axios.patch(`/semesters/${editSemester.id}`, {
        startDate: semStart || undefined,
        endDate: semEnd || undefined,
      });
      toast.success(`Dates updated for "${editSemester.name}".`);
      setEditSemester(null);
      fetchYears();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update semester dates.');
    } finally {
      setSavingSem(false);
    }
  };

  const activeYear = years.find(y => y.isActive);

  return (
    <SuperAdminLayout pageTitle="Academic Years">
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Academic Year Management</h2>
        <p className="text-sm font-medium text-slate-500">Create and control academic year lifecycle. Each year is divided into two semesters. SuperAdmin controls which semester is globally active.</p>
      </div>

      {/* Edit registration period modal */}
      {editYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Registration Period</h3>
              <button onClick={() => setEditYear(null)} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
            </div>
            <p className="mb-6 text-sm text-slate-500">{editYear.year} — registration is open only while the active year's window covers today.</p>
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

      {/* Edit semester dates modal */}
      {editSemester && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Edit {editSemester.name} Dates</h3>
              <button onClick={() => setEditSemester(null)} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
            </div>
            <p className="mb-6 text-sm text-slate-500">Set the start and end dates for this semester period.</p>
            <form onSubmit={handleSaveSemesterDates} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Semester Starts</label>
                <input type="date" value={semStart} onChange={e => setSemStart(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Semester Ends</label>
                <input type="date" value={semEnd} onChange={e => setSemEnd(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditSemester(null)} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={savingSem} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{savingSem ? 'Saving…' : 'Save Dates'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active year + semester banner */}
      {activeYear && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 px-6 py-4 space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-emerald-200 shrink-0"></div>
            <div>
              <div className="text-sm font-bold text-emerald-900">Currently Active: <span className="text-emerald-700">{activeYear.year}</span></div>
              <div className="text-xs text-emerald-700 mt-0.5">
                Registration is <span className="font-bold">{activeYear.registrationOpen ? 'OPEN' : 'CLOSED'}</span>
                {' · '}Window: {fmtDate(activeYear.registrationStart)} → {fmtDate(activeYear.registrationEnd)}
              </div>
            </div>
          </div>
          {activeSemester && (
            <div className="ml-7 flex items-center gap-2">
              <div className="w-2 h-2 bg-violet-500 rounded-full shrink-0"></div>
              <span className="text-xs font-bold text-violet-800">
                Active Semester: {activeSemester.name}
                {activeSemester.academicYear?.year ? ` (${activeSemester.academicYear.year})` : ''}
                {activeSemester.startDate ? ` · ${fmtDate(activeSemester.startDate)} → ${fmtDate(activeSemester.endDate)}` : ''}
              </span>
            </div>
          )}
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
            <div className="rounded-lg bg-violet-50 border border-violet-100 px-4 py-3 text-xs text-violet-700 font-medium">
              📅 Semester 1 & 2 will be automatically created for this year.
            </div>
            <button type="submit" disabled={creating}
              className="w-full bg-emerald-900 text-white font-bold py-2.5 rounded-lg hover:bg-emerald-800 transition  disabled:opacity-60 text-sm">
              {creating ? 'Creating…' : '+ Create Academic Year'}
            </button>
          </form>
        </div>

        {/* Years table with semesters */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">Loading…</div>
          ) : years.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">No academic years created yet.</div>
          ) : (
            years.map(y => (
              <div key={y.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden transition ${y.isActive ? 'border-emerald-300' : 'border-slate-200'}`}>
                {/* Year header row */}
                <div className={`flex items-center justify-between px-5 py-4 ${y.isActive ? 'bg-emerald-50/60' : 'bg-slate-50/60'}`}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedYearId(expandedYearId === y.id ? null : y.id)}
                      className="text-slate-400 hover:text-slate-700 text-lg font-bold transition w-6 text-center"
                      title="Toggle semesters"
                    >
                      {expandedYearId === y.id ? '▾' : '▸'}
                    </button>
                    <span className="font-black text-slate-900 text-base">{y.year}</span>
                    {y.isActive
                      ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>Active</span>
                      : <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">Inactive</span>
                    }
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${y.registrationOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {y.registrationOpen ? '● Reg. OPEN' : '○ Reg. CLOSED'}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => openEditPeriod(y)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg transition"
                    >
                      Edit Period
                    </button>
                    {y.isActive && (
                      <button
                        disabled={actionId === y.id}
                        onClick={() => handleToggleRegistration(y)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-40 ${
                          y.registrationOpen
                            ? 'text-rose-700 hover:text-rose-900 bg-rose-50'
                            : 'text-emerald-700 hover:text-emerald-900 bg-emerald-50'
                        }`}
                      >
                        {actionId === y.id ? '…' : y.registrationOpen ? 'Close Reg.' : 'Open Reg.'}
                      </button>
                    )}
                    {y.isActive ? (
                      <span className="text-xs font-bold text-emerald-600">Current Year</span>
                    ) : (
                      <button
                        disabled={actionId === y.id}
                        onClick={() => handleActivate(y.id, y.year)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-lg transition disabled:opacity-40"
                      >
                        {actionId === y.id ? '…' : 'Set Active Year'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Semester rows — collapsible */}
                {expandedYearId === y.id && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {(!y.semesters || y.semesters.length === 0) ? (
                      <div className="px-8 py-4 text-sm text-slate-400 italic">No semesters found for this year.</div>
                    ) : (
                      y.semesters.map(sem => {
                        const isGloballyActive = activeSemester?.id === sem.id;
                        return (
                          <div key={sem.id} className={`flex items-center justify-between px-8 py-3 ${isGloballyActive ? 'bg-violet-50/50' : ''}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isGloballyActive ? 'bg-violet-500 ring-2 ring-violet-200' : 'bg-slate-300'}`}></div>
                              <div>
                                <span className="font-bold text-sm text-slate-800">{sem.name}</span>
                                {isGloballyActive && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700">
                                    ✦ Globally Active
                                  </span>
                                )}
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {sem.startDate || sem.endDate
                                    ? `${fmtDate(sem.startDate)} → ${fmtDate(sem.endDate)}`
                                    : 'No dates set'
                                  }
                                </div>
                              </div>
                            </div>
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => openEditSemester(sem)}
                                className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-2.5 py-1.5 rounded-lg transition"
                              >
                                Edit Dates
                              </button>
                              {isSuper && !isGloballyActive && (
                                <button
                                  disabled={actionId === sem.id}
                                  onClick={() => handleSetActiveSemester(sem, y.year)}
                                  className="text-xs font-bold text-violet-700 hover:text-violet-900 bg-violet-50 border border-violet-200 px-2.5 py-1.5 rounded-lg transition disabled:opacity-40"
                                >
                                  {actionId === sem.id ? '…' : 'Set Active'}
                                </button>
                              )}
                              {isGloballyActive && (
                                <span className="text-xs font-bold text-violet-600">Active Semester</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
