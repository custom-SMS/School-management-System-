import { useContext, useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from '../api/axios';
import { useBranding } from '../context/SettingsContext';

/* Inline icon set — no extra dependency. */
const icons = {
  dashboard: <path d="M4 4h6v6H4V4zm0 10h6v6H4v-6zm10-10h6v6h-6V4zm0 10h6v6h-6v-6z" />,
  classes: <path d="M3 10 12 4l9 6v2H3v-2zm2 4h2v5H5v-5zm5 0h2v5h-2v-5zm5 0h2v5h-2v-5z" />,
  students: <path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.7 0-6 1.3-6 4v2h8v-2c0-1 .4-1.9 1-2.6A8 8 0 0 0 8 13zm8 0c-.3 0-.7 0-1 .1 1 .8 1.6 1.8 1.6 2.9v2H22v-2c0-2.7-3.3-4-6-3z" />,
  attendance: <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />,
  grades: <path d="m12 2 3 6.5 7 .6-5.3 4.7L18.5 21 12 17.3 5.5 21l1.8-7.2L2 9.1l7-.6L12 2z" />,
  timetable: <path d="M7 2v2H5a2 2 0 0 0-2 2v14h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 8H5V6h14v4z" />,
  settings: <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L18 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2z" />,
  logout: <path d="M16 17v-3H9v-4h7V7l5 5-5 5zM14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z" />,
};

function NavIcon({ name }) {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

const navItems = [
  { to: '/teacher/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/teacher/classes', label: 'Assigned Classes', icon: 'classes' },
  { to: '/teacher/students', label: 'Assigned Students', icon: 'students' },
  { to: '/teacher/notifications', label: 'Notifications', icon: 'attendance' },
  { to: '/teacher/attendance', label: 'Attendance', icon: 'attendance' },
  { to: '/teacher/grades', label: 'Grades', icon: 'grades' },
  { to: '/teacher/timetable', label: 'Timetable', icon: 'timetable' },
];

export default function TeacherLayout({ children, searchPlaceholder = 'Search students or records...' }) {
  const { user, logout } = useContext(AuthContext);
  const { branding, logoUrl } = useBranding();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationsRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications');
      setNotifications(res.data || []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAsRead = async (id) => {
    try {
      await axios.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch { /* silent */ }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    [
      'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition',
      isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
    ].join(' ');

  const initials = (user?.name || 'T').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const unreadCount = notifications.filter(n => !n.read).length;

  // Show homeroom link in sidebar for all teachers; the Homeroom page will enforce authorization.

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/teacher/dashboard" className="flex items-center gap-3 px-2 py-2">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-2xl object-contain" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: branding.brandColor }}>
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 1 9l11 6 9-4.9V17h2V9L12 3zM5 13.2v3.3l7 3.8 7-3.8v-3.3L12 17l-7-3.8z" /></svg>
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-lg font-black tracking-tight text-slate-900 truncate">{branding.institutionNameEn}</span>
          <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">Academic Portal</span>
        </span>
      </Link>

      <nav className="mt-8 flex-1 space-y-1.5">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setMobileOpen(false)}>
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* Homeroom shortcut - visible for all teachers; page will show details only if assigned */}
        <NavLink to="/teacher/homeroom" className={linkClass} onClick={() => setMobileOpen(false)}>
          <NavIcon name="classes" />
          <span>Homeroom</span>
        </NavLink>
      </nav>

      <div className="mt-6 space-y-1.5 border-t border-slate-100 pt-6">
        <NavLink to="/settings" className={linkClass} onClick={() => setMobileOpen(false)}>
          <NavIcon name="settings" />
          <span>Settings</span>
        </NavLink>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <NavIcon name="logout" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
          {sidebar}
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-72 bg-white px-5 py-6 shadow-2xl">{sidebar}</aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 lg:hidden"
              aria-label="Open menu"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" /></svg>
            </button>

            <div className="hidden text-lg font-bold text-slate-900 sm:block">{branding.institutionNameEn}</div>

            <div className="relative mx-auto w-full max-w-md">
              <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4a6 6 0 1 0 3.5 10.9l4.3 4.3 1.4-1.4-4.3-4.3A6 6 0 0 0 10 4zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
              </svg>
              <input
                type="search"
                placeholder={searchPlaceholder}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
              />
            </div>

            <div className="relative" ref={notificationsRef}>
              <button type="button"
                className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Notifications"
                onClick={() => setNotificationsOpen(o => !o)}
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm6-6V11a6 6 0 0 0-5-5.9V4a1 1 0 0 0-2 0v1.1A6 6 0 0 0 6 11v5l-1.7 1.7c-.6.6-.2 1.7.7 1.7h14c.9 0 1.3-1.1.7-1.7L18 16z" /></svg>
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">{unreadCount}</span>
                ) : (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-full z-50 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-sm font-black text-slate-900">Notifications</span>
                    {unreadCount > 0 && <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600">{unreadCount} new</span>}
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {notifications.length > 0 ? notifications.map(n => (
                      <button key={n.id} type="button" onClick={() => markAsRead(n.id)}
                        className={`w-full rounded-xl p-3 text-left text-xs transition ${n.read ? 'bg-slate-50 text-slate-500' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                      >
                        <span className="block font-bold">{n.title}</span>
                        <span className={`mt-1 block whitespace-pre-line ${n.read ? 'text-slate-500' : 'text-white/80'}`}>{n.message}</span>
                        <span className={`mt-2 block text-[10px] ${n.read ? 'text-slate-400' : 'text-white/50'}`}>{new Date(n.createdAt).toLocaleString()}</span>
                      </button>
                    )) : (
                      <p className="py-6 text-center text-sm text-slate-400">No notifications yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-bold leading-tight text-slate-900">{user?.name || 'Teacher'}</div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{user?.role || 'Teacher'}</div>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{initials}</span>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
