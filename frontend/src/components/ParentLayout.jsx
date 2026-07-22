import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import MaintenanceBanner from './MaintenanceBanner';

const icons = {
  dashboard: <path d="M4 4h6v6H4V4zm0 10h6v6H4v-6zm10-10h6v6h-6V4zm0 10h6v6h-6v-6z" />,
  academics: <path d="M12 3 1 9l11 6 9-4.9V17h2V9L12 3zM5 13.2v3.3l7 3.8 7-3.8v-3.3L12 17l-7-3.8z" />,
  attendance: <path d="M7 2v2H5a2 2 0 0 0-2 2v14h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 8H5V6h14v4z" />,
  finance: <path d="M2 7h20v10H2V7zm2 2v6h16V9H4zm8 1.5A1.5 1.5 0 1 1 10.5 12 1.5 1.5 0 0 1 12 10.5z" />,
  logout: <path d="M16 17v-3H9v-4h7V7l5 5-5 5zM14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z" />,
};

function NavIcon({ name }) {
  return <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{icons[name]}</svg>;
}

const navItems = [
  { to: '/parent/dashboard', label: 'Overview', icon: 'dashboard' },
  { to: '/parent/notifications', label: 'Notifications', icon: 'attendance' },
  { to: '/parent/academics', label: 'Academics', icon: 'academics' },
  { to: '/parent/attendance', label: 'Attendance', icon: 'attendance' },
  { to: '/parent/finance', label: 'Finance', icon: 'finance' },
];

export default function ParentLayout({ children, kids = [], childId, onSelectChild }) {
  const { user, logout } = useAuth();
  const { branding, notifications: publicNotifications, logoUrl, formatDateTime } = useSettings();
  const navigate = useNavigate();
  const notificationsRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications');
      setNotifications(res.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    if (!user) return undefined;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const markAsRead = async (id) => {
    try {
      await axios.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const linkClass = ({ isActive }) =>
    ['flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition',
      isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'].join(' ');

  const initials = (user?.name || 'P').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/parent/dashboard" className="flex items-center gap-3 px-2 py-2">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-2xl object-contain" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: branding.brandColor }}>
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 1 9l11 6 9-4.9V17h2V9L12 3z" /></svg>
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-lg font-black tracking-tight text-slate-900 truncate">{branding.institutionNameEn}</span>
          <span className="block text-xs font-medium text-slate-400">Parent Portal</span>
        </span>
      </Link>
      <nav className="mt-8 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setMobileOpen(false)}>
            <NavIcon name={item.icon} /><span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-6 border-t border-slate-100 pt-6">
        <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900">
          <NavIcon name="logout" /><span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">{sidebar}</aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-72 bg-white px-5 py-6 shadow-2xl">{sidebar}</aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <MaintenanceBanner />
          <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
            <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg border border-slate-200 p-2 text-slate-500 lg:hidden" aria-label="Open menu">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" /></svg>
            </button>
            <div className="hidden text-lg font-black text-slate-900 sm:block">{branding.institutionNameEn}</div>

            {/* Child switcher */}
            <div className="mx-auto flex items-center gap-2 min-w-0">
              <span className="hidden text-xs font-semibold uppercase tracking-wide text-slate-400 sm:block">Viewing</span>
              <select
                value={childId || ''}
                onChange={(e) => onSelectChild?.(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-slate-300 focus:bg-white max-w-[130px] sm:max-w-xs truncate"
              >
                {kids.length === 0 && <option value="">No children linked</option>}
                {kids.map((k) => {
                  const id = k.profile?._id || k.profile?.id;
                  return <option key={id} value={id}>{k.profile?.user?.name || 'Child'} · {k.profile?.grade || ''}</option>;
                })}
              </select>
            </div>

            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen((current) => !current)}
                className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Notifications"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm6-6V11a6 6 0 0 0-5-5.9V4a1 1 0 0 0-2 0v1.1A6 6 0 0 0 6 11v5l-1.7 1.7c-.6.6-.2 1.7.7 1.7h14c.9 0 1.3-1.1.7-1.7L18 16z" /></svg>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-full z-50 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-sm font-black text-slate-900">Notifications</span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <>
                          <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600">{unreadCount} new</span>
                          <button type="button" onClick={markAllAsRead} className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition">Mark all read</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <button
                          type="button"
                          key={notification.id}
                          onClick={() => markAsRead(notification.id)}
                          className={`w-full rounded-xl p-3 text-left text-xs transition ${notification.read ? 'bg-slate-50 text-slate-500' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                        >
                          <span className="block font-bold">{notification.title}</span>
                          <span className={`mt-1 block whitespace-pre-line ${notification.read ? 'text-slate-500' : 'text-white/80'}`}>{notification.message}</span>
                          <span className={`mt-2 block text-[10px] ${notification.read ? 'text-slate-400' : 'text-white/50'}`}>
                            {formatDateTime(notification.createdAt)}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="py-6 text-center text-sm text-slate-400">No notifications yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{initials}</span>
          </header>

          {publicNotifications.maintenanceBroadcasts && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 sm:px-8">
              Maintenance broadcasts are enabled. Check your notifications for service updates and planned downtime notices.
            </div>
          )}
          <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
