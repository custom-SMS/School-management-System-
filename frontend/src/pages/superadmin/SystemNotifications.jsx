import { useState, useEffect, useCallback } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import SuperAdminLayout from '../../components/SuperAdminLayout';

const AUDIENCES = [
  { value: 'all', label: 'All Users' },
  { value: 'Admin', label: 'Admins' },
  { value: 'Cashier', label: 'Cashiers' },
  { value: 'Teacher', label: 'Teachers' },
  { value: 'Student', label: 'Students' },
  { value: 'Parent', label: 'Parents' },
];

const TYPE_STYLES = {
  Broadcast:     'bg-indigo-50 text-indigo-700 border-indigo-100',
  ParentMessage: 'bg-blue-50 text-blue-700 border-blue-100',
  RecordRequest: 'bg-amber-50 text-amber-700 border-amber-100',
  LowAttendance: 'bg-rose-50 text-rose-700 border-rose-100',
  OverdueFee:    'bg-orange-50 text-orange-700 border-orange-100',
  ReportCard:    'bg-emerald-50 text-emerald-700 border-emerald-100',
};

export default function SystemNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);

  const [feed, setFeed] = useState({ notifications: [], total: 0, page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/notifications/all', { params: { page, limit: 20 } });
      setFeed(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required.');
      return;
    }
    setSending(true);
    try {
      const res = await axios.post('/notifications/broadcast', { title, message, audience });
      toast.success(res.data?.message || 'Notification sent.');
      setTitle('');
      setMessage('');
      setAudience('all');
      if (page === 1) fetchFeed(); else setPage(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SuperAdminLayout pageTitle="Notifications">
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Notifications</h2>
        <p className="text-sm font-medium text-slate-500">Broadcast system-wide announcements and review recent activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Broadcast composer */}
        <div className="lg:col-span-1">
          <form onSubmit={handleBroadcast} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900">New Broadcast</h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:bg-white"
              >
                {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="e.g. Scheduled maintenance"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Write your announcement…"
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send Broadcast'}
            </button>
          </form>
        </div>

        {/* Recent notifications feed */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
              {feed.total > 0 && (
                <span className="text-xs font-bold text-slate-500">{feed.total.toLocaleString()} total</span>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="px-6 py-12 text-center text-sm text-slate-400">Loading…</div>
              ) : feed.notifications.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-400">No notifications yet.</div>
              ) : feed.notifications.map((n) => (
                <div key={n.id} className="px-6 py-4 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{n.title}</span>
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold ${TYPE_STYLES[n.type] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                          {n.type}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-600 line-clamp-3">{n.message}</p>
                      <p className="mt-1.5 text-xs text-slate-400">
                        To <span className="font-semibold text-slate-500">{n.user?.name || 'Unknown'}</span>
                        {n.user?.role && <span className="ml-1 text-slate-400">({n.user.role})</span>}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {feed.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
                <span className="text-xs font-semibold text-slate-500">Page {feed.page} of {feed.totalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                  >← Previous</button>
                  <button
                    disabled={page >= feed.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                  >Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
