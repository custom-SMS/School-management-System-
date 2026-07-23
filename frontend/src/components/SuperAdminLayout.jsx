import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useBranch } from '../hooks/useBranch';
import MaintenanceBanner from './MaintenanceBanner';

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
const BriefcaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
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
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[#799cb0]">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-[#3b6b82]">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-[#8daec0]">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
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
  { to: '/super-admin/dashboard', label: 'Executive Dashboard', icon: <DashboardIcon /> },
  { to: '/super-admin/users', label: 'User Management', icon: <UsersIcon /> },
  { to: '/super-admin/employees', label: 'Employee Management', icon: <BriefcaseIcon /> },
  { to: '/super-admin/branches', label: 'Branch Management', icon: <SystemIcon /> },
  { to: '/super-admin/permissions', label: 'Roles & Permissions', icon: <RoleIcon /> },
  { to: '/super-admin/academic-years', label: 'Academic Years', icon: <CalendarIcon /> },
  { to: '/super-admin/attendance-governance', label: 'Attendance Governance', icon: <ShieldIcon /> },
  { to: '/super-admin/financial-oversight', label: 'Financial Oversight', icon: <FinanceIcon /> },
  { to: '/super-admin/fees', label: 'Fees', icon: <FinanceIcon /> },
  { to: '/super-admin/grades', label: 'Grade Management', icon: <ActivityIcon /> },
  { to: '/super-admin/analytics', label: 'System Analytics', icon: <ActivityIcon /> },
  { to: '/super-admin/notifications', label: 'Notifications', icon: <BellIcon /> },
  { to: '/super-admin/registration', label: 'Student Registration', icon: <UsersIcon /> },
  { to: '/super-admin/audit-logs', label: 'Audit Logs', icon: <ActivityIcon /> },
  { to: '/super-admin/settings', label: 'System Settings', icon: <SettingsIcon /> },
];

export default function SuperAdminLayout({ children, pageTitle, headerAction }) {
  const { user, logout } = useAuth();
  const { branding, logoUrl } = useSettings();
  const { branches, selectedBranch, selectedBranchId, canSwitchBranch, switchBranch } = useBranch();
  const [academicYears, setAcademicYears] = useState([]);
  const [yearViewId, setYearViewId] = useState(localStorage.getItem('superAdminYearViewId') || '');
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationsRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications');
      setNotifications(res.data || []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const res = await axios.get('/academic-years');
        const list = res.data || [];
        setAcademicYears(list);
        if (!localStorage.getItem('superAdminYearViewId') && list.length > 0) {
          const active = list.find(y => y.isActive) || list[0];
          if (active) {
            localStorage.setItem('superAdminYearViewId', active.id);
            setYearViewId(active.id);
          }
        }
      } catch (err) {
        console.error('Failed to load academic years', err);
      }
    };
    if (user?.role === 'SuperAdmin') {
      fetchYears();
    }
  }, [user]);

  const handleYearViewChange = (e) => {
    const val = e.target.value;
    localStorage.setItem('superAdminYearViewId', val);
    setYearViewId(val);
    window.location.reload();
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const initials = (user?.name || 'SA').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex min-h-screen bg-[#e7eff3] font-sans text-[#203e4f]">
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
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-[#203e4f] text-[#cbe1eb] shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top School Branding Header */}
        <div className="flex flex-col items-center pt-6 pb-5 px-4 border-b border-white/10 relative">
          <button
            className="text-[#9bbcc9] hover:text-white lg:hidden absolute top-4 right-4"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>

          {/* Big Circular School Logo */}
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full bg-[#33566b] border border-white/30 ring-4 ring-white/10 flex items-center justify-center overflow-hidden shadow-md text-white font-black text-2xl">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="w-full h-full object-cover p-1.5 rounded-full" />
              ) : (
                <span>{(branding?.institutionNameEn || 'S')[0]}</span>
              )}
            </div>
          </div>

          <h2 className="text-white font-black text-base text-center tracking-tight truncate max-w-full px-2">
            {branding?.institutionNameEn || 'School Management System'}
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9bbcc9] mt-0.5 text-center">
            Super Admin Console
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => {
                const isItemActive = isActive || window.location.pathname.startsWith(item.to);
                return `w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  isItemActive
                    ? 'bg-white text-[#203e4f] shadow-lg font-bold translate-x-1'
                    : 'text-[#d3e5ed] hover:bg-[#2a4e63] hover:text-white'
                }`;
              }}
            >
              {({ isActive }) => {
                const isItemActive = isActive || window.location.pathname.startsWith(item.to);
                return (
                  <>
                    <span className={isItemActive ? 'text-[#203e4f]' : 'text-[#8daec0]'}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </>
                );
              }}
            </NavLink>
          ))}
        </nav>

        {/* Bottom User Profile & Logout Card */}
        <div className="p-3 border-t border-[#2d566e]/60 bg-[#1a3443]/60">
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#284c60]/90 border border-[#3b6b82]/40 shadow-sm">
            <div className="w-10 h-10 shrink-0 rounded-full bg-[#3d697e] border-2 border-white/40 flex items-center justify-center overflow-hidden text-white font-black text-xs shadow-inner">
              {user?.profileImage ? (
                <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-extrabold text-white">
                {user?.name || 'Super Admin'}
              </div>
              <div className="truncate text-[10px] text-[#9bbcc9] font-medium">
                {user?.email || 'superadmin@school.test'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-[#9bbcc9] hover:text-white hover:bg-red-500/20 hover:text-red-300 rounded-xl transition shrink-0"
              title="Logout"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex min-w-0 flex-1 flex-col bg-[#e7eff3]">
        <MaintenanceBanner />

        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#d8e6ed] bg-[#e7eff3]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 shadow-xs">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="text-[#203e4f] hover:text-black lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
            <span className="hidden sm:inline-flex"><SystemIcon /></span>
            <h1 className="truncate text-lg sm:text-2xl font-extrabold text-[#203e4f] tracking-tight">
              {pageTitle ? `Welcome ${pageTitle}` : `Welcome ${user?.name || 'Super Admin'} !`}
            </h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Branch Switcher Select */}
            {canSwitchBranch && (
              <div className="flex items-center gap-2">
                <span className="hidden text-xs font-bold uppercase tracking-wider text-[#63889b] sm:inline">Branch</span>
                <select
                  value={selectedBranchId || ''}
                  onChange={(e) => switchBranch(e.target.value)}
                  className="bg-white text-xs font-bold text-[#203e4f] px-3 py-1.5 rounded-full border border-[#d2e2eb] focus:outline-none focus:ring-2 focus:ring-[#3b6b82] shadow-sm transition max-w-[140px] sm:max-w-xs truncate"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Academic Year Filter */}
            {academicYears.length > 0 && (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#63889b]">Year</span>
                <select
                  value={yearViewId}
                  onChange={handleYearViewChange}
                  className="bg-white text-xs font-bold text-[#203e4f] px-3 py-1.5 rounded-full border border-[#d2e2eb] focus:outline-none focus:ring-2 focus:ring-[#3b6b82] shadow-sm transition"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.year} {y.isActive ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search Input */}
            <div className="relative hidden items-center lg:flex w-48 lg:w-64">
              <input
                type="text"
                placeholder="Search system..."
                className="w-full bg-white text-sm text-[#203e4f] placeholder-[#8caab8] px-4 py-2 pl-4 pr-9 rounded-full border border-[#d2e2eb] focus:outline-none focus:ring-2 focus:ring-[#3b6b82] shadow-sm transition"
              />
              <span className="absolute right-3">
                <SearchIcon />
              </span>
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={notificationsRef}>
              <button
                className="relative p-2 bg-white rounded-full border border-[#d2e2eb] text-[#3b6b82] hover:bg-slate-50 transition shadow-sm"
                onClick={() => setNotificationsOpen((o) => !o)}
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
                <div className="absolute right-0 top-full z-50 mt-3 w-80 rounded-2xl border border-[#d2e2eb] bg-white p-4 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-sm font-black text-[#203e4f]">Notifications</span>
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
                      notifications.map((n) => (
                        <button key={n.id} type="button" onClick={() => markAsRead(n.id)}
                          className={`w-full rounded-xl p-3 text-left text-xs transition ${n.read ? 'bg-slate-50 text-slate-500' : 'bg-[#203e4f] text-white hover:bg-[#2a4e63]'}`}
                        >
                          <span className="block font-bold">{n.title}</span>
                          <span className={`mt-1 block whitespace-pre-line ${n.read ? 'text-slate-500' : 'text-white/80'}`}>{n.message}</span>
                          <span className={`mt-2 block text-[10px] ${n.read ? 'text-slate-400' : 'text-white/50'}`}>{new Date(n.createdAt).toLocaleString()}</span>
                        </button>
                      ))
                    ) : (
                      <p className="py-6 text-center text-sm text-slate-400">No notifications yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {headerAction && <div className="ml-2 border-l border-[#d8e6ed] pl-2 sm:pl-4 shrink-0 flex items-center whitespace-nowrap">{headerAction}</div>}
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
