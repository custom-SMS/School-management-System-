import { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { toast } from 'react-toastify';

const STATUS_STYLES = {
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  MODIFIED:  'bg-blue-50 text-blue-700 border-blue-100',
  PENDING:   'bg-amber-50 text-amber-700 border-amber-100',
  FAILED:    'bg-red-50 text-red-700 border-red-100',
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-pink-500',
  'bg-orange-500', 'bg-teal-500', 'bg-cyan-500', 'bg-rose-500',
];

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function getColor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function AuditLogs() {
  const [data, setData]           = useState({ logs: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (debouncedSearch) params.action = debouncedSearch;
      const res = await axios.get('/audit-logs', { params });
      setData(res.data);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExportCSV = () => {
    if (data.logs.length === 0) { toast.info('No logs to export.'); return; }
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Details'];
    const rows = data.logs.map(l => [
      new Date(l.timestamp).toLocaleString(),
      l.user?.name ?? 'System',
      l.user?.role ?? '—',
      l.action,
      `"${(l.details ?? '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV exported successfully.');
  };

  return (
    <SuperAdminLayout pageTitle="Audit Logs">
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Audit Logs</h2>
        <p className="text-sm font-medium text-slate-500">
          Full chronological trail of all system activities.
          {data.total > 0 && <span className="ml-2 text-indigo-600 font-bold">{data.total.toLocaleString()} total events</span>}
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by action keyword…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-72"
        />
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition ml-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export CSV
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">User</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Role</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Action</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Details</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">Loading audit logs…</td></tr>
              ) : data.logs.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">No audit logs found{debouncedSearch ? ' for this search.' : '.'}</td></tr>
              ) : data.logs.map(log => {
                const color = getColor(log.user?.name ?? 'S');
                const initials = getInitials(log.user?.name ?? 'System');
                // Detect status from action text for styling
                const statusKey = log.action?.includes('Fail') ? 'FAILED'
                  : log.action?.includes('Delete') || log.action?.includes('Reset') ? 'MODIFIED'
                  : log.action?.includes('Create') || log.action?.includes('Open') ? 'PENDING'
                  : 'COMPLETED';
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${color} text-white flex items-center justify-center text-xs font-black shrink-0`}>{initials}</div>
                        <span className="font-semibold text-slate-900">{log.user?.name ?? 'System'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{log.user?.role ?? '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[statusKey]}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{log.details ?? '—'}</td>
                    <td className="px-6 py-4 text-right text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
            <span className="text-xs font-semibold text-slate-500">
              Page {data.page} of {data.totalPages} · {data.total} total events
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
              >← Previous</button>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
              >Next →</button>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
