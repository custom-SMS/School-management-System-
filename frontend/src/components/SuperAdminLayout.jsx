import { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

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
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
const FinanceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const SystemIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const navItems = [
  { to: '/super-admin/dashboard', label: 'Executive Dashboard', icon: <DashboardIcon /> },
  { to: '/super-admin/users', label: 'User Management', icon: <UsersIcon /> },
  { to: '/super-admin/roles', label: 'Roles & Permissions', icon: <RoleIcon /> },
  { to: '/super-admin/academic-years', label: 'Academic Years', icon: <CalendarIcon /> },
  { to: '/super-admin/attendance-governance', label: 'Attendance Governance', icon: <ShieldIcon /> },
  { to: '/super-admin/financial-oversight', label: 'Financial Oversight', icon: <FinanceIcon /> },
  { to: '/super-admin/analytics', label: 'System Analytics', icon: <ActivityIcon /> },
  { to: '/super-admin/notifications', label: 'Notifications', icon: <BellIcon /> },
  { to: '/super-admin/audit-logs', label: 'Audit Logs', icon: <ActivityIcon /> },
  { to: '/super-admin/settings', label: 'System Settings', icon: <SettingsIcon /> },
];

export default function SuperAdminLayout({ children, pageTitle, headerAction }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.name || 'SA').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* ── Sidebar ── */}
      <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-slate-200 bg-white shadow-sm">
        {/* Brand */}
        <div className="px-6 py-6 border-b border-slate-100">
          <div className="mb-1 text-lg font-black  tracking-tight">
            EduManage Gov
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Super Admin Console
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                  isActive || window.location.pathname.startsWith(item.to)
                    ? 'bg-indigo-50 font-bold '
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
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/50">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-8 shadow-sm">
          <div className="flex items-center gap-3">
            <SystemIcon />
            <h1 className="text-lg font-bold tracking-tight text-slate-900">{pageTitle || 'Governance Console'}</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative flex items-center">
              <span className="absolute left-3">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Global search..."
                className="w-64 rounded-full bg-slate-100 py-2 pl-9 pr-4 text-sm font-medium outline-none transition focus:bg-white focus:ring-2 focus:ring-black"
              />
            </div>

            <button className="relative text-slate-400 hover:text-indigo-600 transition">
              <BellIcon />
              <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            </button>
            
            {headerAction && <div className="ml-2 border-l border-slate-200 pl-4">{headerAction}</div>}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
