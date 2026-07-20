import { useState, useEffect } from 'react';
import { showConfirmDialog } from '../../utils/sweetAlert';
import axios from '../../api/axios';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { toast } from 'react-toastify';
import { useAcademicYear } from '../../context/AcademicYearContext';

export default function AttendanceGovernance() {
  const { selectedYear, isViewingHistory } = useAcademicYear();
  const [sessions, setSessions]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // 'locked' | 'open' | ''
  const [unlockingId, setUnlockingId]   = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const fetchSessions = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filterClass) params.className = filterClass;
      if (filterStatus) params.status = filterStatus;
      const res = await axios.get('/classroom/attendance', { params });
      setSessions(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
    } catch {
      toast.error('Failed to load attendance sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, [selectedYear, filterClass, filterStatus]);

  const handleUnlock = async (session) => {
    const { isConfirmed } = await showConfirmDialog({
      title: 'Unlock attendance?',
      text: `Unlock attendance for "${session.className}" on ${new Date(session.date).toLocaleDateString()}? Teachers will be able to modify records.`,
      confirmButtonText: 'Unlock',
    });
    if (!isConfirmed) return;
    setUnlockingId(session._id);
    try {
      await axios.patch(`/classroom/attendance/${session._id}/unlock`);
      toast.success('Attendance session unlocked successfully.');
      fetchSessions(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlock attendance');
    } finally {
      setUnlockingId(null);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchSessions(newPage);
  };

  const lockedCount = sessions.filter(s => s.locked).length;
  const openCount   = sessions.filter(s => !s.locked).length;

  return (
    <SuperAdminLayout pageTitle="Attendance Governance">
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Attendance Governance</h2>
        <p className="text-sm font-medium text-slate-500">Override 7-day attendance locks and manage session access for teachers.</p>
      </div>

      {/* Academic year context banner */}
      {isViewingHistory && selectedYear && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <span className="text-amber-600 font-bold">📅 Viewing historical attendance for {selectedYear.year}</span>
          <span className="text-amber-500 text-xs">— data is read-only for this year</span>
        </div>
      )}
      {!isViewingHistory && selectedYear && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />
          <span className="text-emerald-700 font-semibold">Active Year: {selectedYear.year}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-black text-slate-900">{pagination.total}</div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Total Sessions</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-black text-red-700">{lockedCount}</div>
          <div className="text-xs font-bold text-red-600 uppercase tracking-wider mt-1">Locked Sessions</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-black text-emerald-700">{openCount}</div>
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mt-1">Open Sessions</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Filter by class name…"
          value={filterClass}
          onChange={e => setFilterClass(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-64"
        />
        <div className="flex gap-2">
          {['', 'locked', 'open'].map(v => (
            <button key={v} onClick={() => setFilterStatus(v)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                filterStatus === v
                  ? v === 'locked' ? 'bg-red-600 text-white' : v === 'open' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {v === '' ? 'All' : v === 'locked' ? '🔒 Locked' : '🔓 Open'}
            </button>
          ))}
        </div>
        <button onClick={() => fetchSessions(pagination.page)} className="ml-auto text-xs font-bold text-indigo-600 hover:text-indigo-900 flex items-center gap-1.5 bg-indigo-50 px-3 py-2 rounded-lg">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading attendance sessions…</div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              {pagination.total === 0 ? 'No attendance sessions recorded yet.' : 'No sessions match the current filter.'}
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Date</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Class</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Recorded By</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Records</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Age</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Status</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sessions.map(s => (
                  <tr key={s._id} className={`hover:bg-slate-50 transition ${s.locked ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4 font-bold">{new Date(s.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{s.className}</td>
                    <td className="px-6 py-4 text-slate-500">{s.recordedBy}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-md">{s.recordCount ?? '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold ${s.ageDays > 7 ? 'text-red-600' : 'text-slate-500'}`}>{s.ageDays}d ago</span>
                    </td>
                    <td className="px-6 py-4">
                      {s.locked
                        ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">🔒 Locked</span>
                        : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">🔓 Open</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-right">
                      {s.locked ? (
                        <button
                          disabled={unlockingId === s._id}
                          onClick={() => handleUnlock(s)}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-lg transition disabled:opacity-40"
                        >
                          {unlockingId === s._id ? 'Unlocking…' : 'Approve Unlock'}
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">No action needed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="text-sm text-slate-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} sessions
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
