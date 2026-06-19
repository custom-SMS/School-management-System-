import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const iconClass = 'h-5 w-5 shrink-0';

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M4 13h7V4H4v9Zm9 7h7v-7h-7v7Zm0-16v5h7V4h-7ZM4 20h7v-3H4v3Z" />
  </svg>
);

const BranchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M3 21h18M5 21V8l7-4 7 4v13M9 12h.01M15 12h.01M9 16h.01M15 16h.01" />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 1 1 8 0v3" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20v-4" />
  </svg>
);

const AuditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M12 8v4l3 3" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 1 0 12 8.5z" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.54 1.7 1.7 0 0 0 10.04 3H10a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8.9c.1.34.45.58.81.58H21a2 2 0 1 1 0 4h-.79c-.36 0-.71.24-.81.58Z" />
  </svg>
);

const StudentsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 11 19 13 15 11 19 9l4 2Z" />
    <path d="M17 13v3" />
  </svg>
);

const TeachersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="m12 3 9 4.5-9 4.5L3 7.5 12 3Z" />
    <path d="M7 10.5V15c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5" />
    <path d="M21 9v6" />
  </svg>
);

const SubjectIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
  </svg>
);

const ClassesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M3 5h18v14H3z" />
    <path d="M3 10h18M8 5v14M16 5v14" />
  </svg>
);

const SectionsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M4 6h7v5H4zM13 6h7v5h-7zM4 13h7v5H4zM13 13h7v5h-7z" />
  </svg>
);

const AssignmentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const TimetableIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12H3V7a2 2 0 0 1 2-2Z" />
    <path d="M8 14h3v3H8zM13 14h3M13 17h5" />
  </svg>
);

const ReportCardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const ReportIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M12 20V10M18 20V4M6 20v-6" />
  </svg>
);

const RegistrationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
    <path d="M8 7V3m8 4V3M4 11h16M5 5h14a2 2 0 0 1 2 2v12H3V7a2 2 0 0 1 2-2Z" />
    <path d="M9 15h6M9 18h4" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M10 4a6 6 0 1 0 3.53 10.85l4.3 4.3 1.41-1.41-4.3-4.3A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
  </svg>
);

const adminNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/students', label: 'Students', icon: <StudentsIcon /> },
  { to: '/teachers', label: 'Teachers', icon: <TeachersIcon /> },
  { to: '/academics', label: 'Subjects', icon: <SubjectIcon /> },
  { to: '/classroom/grades', label: 'Classes', icon: <ClassesIcon /> },
  { to: '/classroom/attendance', label: 'Sections', icon: <SectionsIcon /> },
  { to: '/assignments', label: 'Academic Years', icon: <AssignmentIcon /> },
  { to: '/timetable', label: 'Timetables', icon: <TimetableIcon /> },
  { to: '/report-cards-admin', label: 'Report Cards', icon: <ReportCardIcon /> },
  { to: '/registrar', label: 'Registration Management', icon: <RegistrationIcon /> },
];

const superAdminNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/super-admin/users', label: 'User Management', icon: <UsersIcon /> },
  { to: '/super-admin/roles', label: 'Roles & Permissions', icon: <ShieldIcon /> },
  { to: '/super-admin/analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
  { to: '/super-admin/audit-logs', label: 'Audit Logs', icon: <AuditIcon /> },
  { to: '/super-admin/notifications', label: 'Notifications', icon: <BellIcon /> },
  { to: '/super-admin/settings', label: 'System Settings', icon: <SettingsIcon /> },
];

const getRoleMeta = (role) => {
  if (role === 'SuperAdmin') {
    return {
      title: 'Super Admin Command',
      subtitle: 'Single-organization governance',
      accent: 'from-violet-600 via-slate-900 to-slate-950',
      badge: 'Executive Access',
      contextLabel: 'Organization Scope',
      contextValue: 'Entire School',
      navItems: superAdminNavItems,
    };
  }

  return {
    title: 'Admin Workspace',
    subtitle: 'Operational school management',
    accent: 'from-emerald-600 via-slate-900 to-slate-950',
    badge: 'School Operations',
    contextLabel: 'Organization Scope',
    contextValue: 'Entire School',
    navItems: adminNavItems,
  };
};

export default function AdminLayout({
  children,
  pageTitle,
  pageSubtitle,
  headerAction,
  searchPlaceholder = 'Search records, users, branches, or activities...',
}) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const sidebarRef = useRef(null);

  const role = user?.role === 'SuperAdmin' ? 'SuperAdmin' : 'Admin';
  const roleMeta = useMemo(() => getRoleMeta(role), [role]);

  const initials = (user?.name || roleMeta.title)
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const savedSidebarScroll = window.sessionStorage.getItem('admin-layout-sidebar-scroll');
    if (savedSidebarScroll && sidebarRef.current) {
      sidebarRef.current.scrollTop = Number(savedSidebarScroll) || 0;
    }
  }, []);

  const handleSidebarScroll = () => {
    if (!sidebarRef.current) return;
    window.sessionStorage.setItem('admin-layout-sidebar-scroll', String(sidebarRef.current.scrollTop));
  };

  const containerClass = darkMode
    ? 'min-h-screen bg-slate-950 text-slate-100'
    : 'min-h-screen bg-slate-100/80 text-slate-900';

  const surfaceClass = darkMode
    ? 'border-slate-800 bg-slate-900 text-slate-100'
    : 'border-slate-200 bg-white text-slate-900';

  const mutedClass = darkMode ? 'text-slate-400' : 'text-slate-500';

  const activeNavClass = darkMode
    ? 'bg-white/10 text-white shadow-sm'
    : 'bg-slate-900 text-white shadow-sm';

  const inactiveNavClass = darkMode
    ? 'text-slate-400 hover:bg-white/5 hover:text-white'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';

  const navLinkClass = ({ isActive }) =>
    [
      'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200',
      isActive ? activeNavClass : inactiveNavClass,
    ].join(' ');

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className={`rounded-3xl bg-gradient-to-br ${roleMeta.accent} p-[1px]`}>
        <div className={`rounded-[calc(1.5rem-1px)] ${darkMode ? 'bg-slate-950/90' : 'bg-white/95'} p-5 backdrop-blur`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] ${darkMode ? 'bg-white/10 text-slate-200' : 'bg-slate-900 text-white'}`}>
                {roleMeta.badge}
              </div>
              <h1 className="mt-4 text-xl font-black tracking-tight">{roleMeta.title}</h1>
              <p className={`mt-1 text-sm ${mutedClass}`}>{roleMeta.subtitle}</p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${darkMode ? 'bg-white/10 text-white' : 'bg-slate-900 text-white'}`}>
              {role === 'SuperAdmin' ? <ShieldIcon /> : <UsersIcon />}
            </div>
          </div>

          <div className={`mt-5 rounded-2xl border p-4 ${darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
            <div className={`text-[11px] font-bold uppercase tracking-[0.2em] ${mutedClass}`}>{roleMeta.contextLabel}</div>
            <div className="mt-2 text-sm font-bold">
              {roleMeta.contextValue}
            </div>
              <div className={`mt-1 text-xs ${mutedClass}`}>
                {role === 'SuperAdmin'
                  ? 'System-wide governance, oversight, compliance visibility, and policy control'
                  : 'Daily school operations across students, academics, registration, and staff'}
              </div>
          </div>
        </div>
      </div>

      <nav className="mt-8 flex-1 space-y-1.5">
        {roleMeta.navItems.map((item) => (
          <NavLink key={`${item.to}-${item.label}`} to={item.to} className={navLinkClass} onClick={() => setMobileOpen(false)}>
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={`mt-8 rounded-3xl border p-4 ${surfaceClass}`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl font-black ${darkMode ? 'bg-white/10 text-white' : 'bg-slate-900 text-white'}`}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{user?.name || 'Administrator'}</div>
            <div className={`truncate text-xs uppercase tracking-[0.18em] ${mutedClass}`}>
              {user?.role || role}
            </div>
          </div>
        </div>

        <div className={`mt-4 flex items-center justify-between rounded-2xl px-3 py-2 ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
          <div>
            <div className="text-xs font-semibold">Theme</div>
            <div className={`text-[11px] ${mutedClass}`}>{darkMode ? 'Dark mode enabled' : 'Light mode enabled'}</div>
          </div>
          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl transition ${darkMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50'}`}
            aria-label="Toggle theme"
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-bold transition ${darkMode ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
        >
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className={containerClass}>
      <div className="mx-auto flex h-screen w-full overflow-hidden">
        <aside
          ref={sidebarRef}
          onScroll={handleSidebarScroll}
          className={`sticky top-0 hidden h-screen w-[308px] shrink-0 overflow-y-auto border-r px-5 py-6 lg:flex ${darkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white/80 backdrop-blur'}`}
        >
          {sidebar}
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className={`absolute inset-0 ${darkMode ? 'bg-slate-950/80' : 'bg-slate-950/40'}`}
              onClick={() => setMobileOpen(false)}
            />
            <aside className={`absolute left-0 top-0 h-full w-[308px] overflow-y-auto px-5 py-6 ${darkMode ? 'bg-slate-950' : 'bg-white'}`}>
              {sidebar}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className={`sticky top-0 z-40 border-b backdrop-blur ${darkMode ? 'border-slate-800 bg-slate-950/85' : 'border-slate-200 bg-white/85'}`}>
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 xl:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border lg:hidden ${darkMode ? 'border-slate-800 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}
                  aria-label="Open navigation"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M4 7h16v2H4V7Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z" />
                  </svg>
                </button>

                <div className="min-w-0 flex-1">
                  <div className={`text-[11px] font-bold uppercase tracking-[0.24em] ${mutedClass}`}>
                    {role === 'SuperAdmin' ? 'Executive Workspace' : 'School Operations'}
                  </div>
                  <h2 className="truncate text-xl font-black tracking-tight sm:text-2xl">
                    {pageTitle || (role === 'SuperAdmin' ? 'Super Admin Dashboard' : 'Admin Dashboard')}
                  </h2>
                  {pageSubtitle && <p className={`mt-1 text-sm ${mutedClass}`}>{pageSubtitle}</p>}
                </div>

                <div className="hidden items-center gap-3 xl:flex">
                  <button type="button" className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${darkMode ? 'border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                    <BellIcon />
                    <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-rose-500" />
                  </button>
                    <div className={`rounded-2xl border px-4 py-2.5 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                      <div className="text-sm font-bold">{roleMeta.contextValue}</div>
                      <div className={`text-xs ${mutedClass}`}>
                        {role === 'SuperAdmin' ? 'Governance-only visibility across the organization' : 'Operational visibility across the organization'}
                      </div>
                    </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="relative w-full max-w-xl">
                  <span className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${mutedClass}`}>
                    <SearchIcon />
                  </span>
                  <input
                    type="search"
                    placeholder={searchPlaceholder}
                    className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm outline-none transition ${
                      darkMode
                        ? 'border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:border-slate-700 focus:ring-4 focus:ring-white/5'
                        : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5'
                    }`}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className={`rounded-2xl border px-4 py-2.5 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                    <div className="text-xs font-semibold">Current Route</div>
                    <div className={`mt-1 text-sm ${mutedClass}`}>{location.pathname}</div>
                  </div>
                  {headerAction && <div className="flex flex-wrap items-center gap-3">{headerAction}</div>}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 xl:px-8 xl:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}