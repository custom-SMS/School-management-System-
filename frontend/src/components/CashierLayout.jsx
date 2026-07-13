import { useContext, useEffect, useRef, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { useBranding } from '../context/SettingsContext';


/* Simple inline icon set so we don't add an icon dependency. */
const icons = {
  dashboard: (
    <path d="M4 4h6v6H4V4zm0 10h6v6H4v-6zm10-10h6v6h-6V4zm0 10h6v6h-6v-6z" />
  ),
  payments: (
    <path d="M2 7h20v10H2V7zm2 2v6h16V9H4zm8 1.5A1.5 1.5 0 1 1 10.5 12 1.5 1.5 0 0 1 12 10.5z" />
  ),
  verification: (
    <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
  ),
  analytics: (
    <path d="M4 20V10h3v10H4zm6.5 0V4h3v16h-3zM17 20v-7h3v7h-3z" />
  ),
  fees: (
    <path d="M3 6h18v12H3V6zm2 2v8h14V8H5zm2 1h4v2H7V9z" />
  ),
  settings: (
    <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L18 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2z" />
  ),
  support: (
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 15.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm1.6-5.3c-.7.5-.9.8-.9 1.4v.4h-1.4v-.5c0-1.1.5-1.7 1.3-2.3.7-.5.9-.8.9-1.3 0-.6-.5-1-1.2-1-.7 0-1.2.4-1.4 1.1l-1.3-.5c.3-1.2 1.3-2 2.8-2 1.6 0 2.7.9 2.7 2.3 0 1-.5 1.6-1.4 2.2z" />

  ),
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
  { to: '/finance/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/finance/payments', label: 'Payments', icon: 'payments', permission: 'verify_payments' },
  { to: '/finance/verification', label: 'Verification', icon: 'verification', permission: 'verify_payments' },
  { to: '/finance/analytics', label: 'Analytics', icon: 'analytics' },
  { to: '/finance/fees', label: 'Fees', icon: 'fees', permission: 'manage_fees' },
];

export default function CashierLayout({ children, searchPlaceholder = 'Search students, receipts...' }) {
  const { user, logout, permissions } = useContext(AuthContext);
  const { branding, logoUrl } = useBranding();
  const navigate = useNavigate();
  const notificationsRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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
    } catch { /* silent */ }
  };

  const markAllAsRead = async () => {
    try {
      await axios.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* silent */ }
  };

  const linkClass = ({ isActive }) =>
    [
      'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition',
      isActive
        ? 'bg-slate-100 text-slate-900'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
    ].join(' ');

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <Link to="/finance/dashboard" className="flex items-center gap-3 px-2 py-2">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-2xl object-contain" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: branding.brandColor }}>
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 10 12 4l9 6v2H3v-2zm1 4h2v5H4v-5zm5 0h2v5H9v-5zm5 0h2v5h-2v-5zm5 0h2v5h-2v-5zM2 20h20v2H2v-2z" />
            </svg>
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-lg font-black tracking-tight text-slate-900 truncate">{branding.institutionNameEn}</span>
          <span className="block text-xs font-medium text-slate-400">Cashier Portal</span>
        </span>
      </Link>

      {/* Primary nav */}
      <nav className="mt-8 flex-1 space-y-1.5">
        {navItems
          .filter(item =>
            !item.permission ||
            permissions.includes('*') ||
            permissions.includes(item.permission)
          )
          .map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setMobileOpen(false)}>
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
      </nav>

      {/* Footer nav */}
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
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
          {sidebar}
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-72 bg-white px-5 py-6 shadow-2xl">
              {sidebar}
            </aside>
          </div>
        )}

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
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
                            {new Date(notification.createdAt).toLocaleString()}
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

            <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-bold leading-tight text-slate-900">{user?.name || 'Teacher'}</div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{user?.role || 'Teacher'}</div>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{initials}</span>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
