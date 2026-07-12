import { useContext, useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from '../api/axios';
import { useBranding } from '../context/SettingsContext';

// ── Icons ──────────────────────────────────────────────────────────────────
const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const RoleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-6-5-6 5V4H4a2 2 0 0 0-2 2v14z" />
    <path d="M14 14h-4v-4h4v4z" />
  </svg>
);
const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-500">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-600">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const SystemIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);
const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/admin/users', label: 'User Management', icon: <UsersIcon /> },
  { to: '/admin/students', label: 'Students', icon: <UsersIcon /> },
  { to: '/admin/teachers', label: 'Teachers', icon: <UsersIcon /> },
  { to: '/admin/subjects', label: 'Subjects', icon: <CalendarIcon /> },
  { to: '/admin/classes', label: 'Classes', icon: <SystemIcon /> },
  { to: '/admin/sections', label: 'Sections', icon: <SystemIcon /> },
  { to: '/admin/grades', label: 'Grades', icon: <ActivityIcon /> },
  { to: '/admin/assignments', label: 'Assignments', icon: <ActivityIcon /> },
  { to: '/admin/timetables', label: 'Timetables', icon: <CalendarIcon /> },
  { to: '/admin/report-cards', label: 'Report Cards', icon: <ActivityIcon /> },
  { to: '/admin/academic-reports', label: 'General Reports', icon: <ActivityIcon /> },
  { to: '/admin/registration', label: 'Registration', icon: <ShieldIcon /> },
  { to: '/roles', label: 'Role Management', icon: <RoleIcon /> },
  { to: '/permissions', label: 'Permission Management', icon: <ShieldIcon /> },
  { to: '/audit', label: 'Audit Logs', icon: <ActivityIcon /> },
  { to: '/settings', label: 'System Settings', icon: <SettingsIcon /> },
];

export default function AdminLayout({ children, pageTitle, headerAction }) {
  const { user, logout } = useContext(AuthContext);
  const { branding, logoUrl } = useBranding();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch { /* silent */ }
  };

  const markAllAsRead = async () => {
    try {
      await axios.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* silent */ }
  };;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.name || 'A').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNavItems = navItems.filter(item => {
    // Only SuperAdmin can see System Settings, Role Management, Permission Management, and Audit Logs
    if (['/settings', '/roles', '/permissions', '/audit'].includes(item.to)) {
      return user?.role === 'SuperAdmin';
    }
    return true;
  });

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white shadow-sm transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl && (
              <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
            )}
            <div className="min-w-0">
              <div className="mb-1 text-lg font-black tracking-tight text-slate-900 truncate">
                {branding.institutionNameEn}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Admin Console
              </div>
            </div>
          </div>
          <button
            className="text-slate-400 hover:text-slate-900 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${isActive || window.location.pathname.startsWith(item.to)
                  ? 'bg-slate-100 font-bold text-black'
                  : 'font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-200 cursor-pointer" onClick={handleLogout}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black shadow-md text-sm font-bold text-white">
              {user?.profileImage ? (
                <img src={user.profileImage} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">{user?.name || 'Super Admin'}</div>
              <div className="text-[10px] font-bold uppercase text-slate-500">Log Out</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-slate-50/50">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 shadow-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="text-slate-600 hover:text-black lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
            <span className="hidden sm:inline-flex"><SystemIcon /></span>
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">{pageTitle || 'System Management'}</h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="relative hidden items-center md:flex">
              <span className="absolute left-3">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Search records..."
                className="w-48 rounded-full bg-slate-100 py-2 pl-9 pr-4 text-sm font-medium outline-none transition focus:bg-white focus:ring-2 focus:ring-slate-500 lg:w-64"
              />
            </div>

            <div className="relative" ref={notificationsRef}>
              <button
                className="relative text-slate-400 hover:text-black transition"
                onClick={() => setNotificationsOpen(o => !o)}
                aria-label="Notifications"
              >
                <BellIcon />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
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

            {headerAction && <div className="ml-2 border-l border-slate-200 pl-2 sm:pl-4">{headerAction}</div>}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
