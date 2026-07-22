import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { getRoleLabel } from '../constants/accessControl';
import { useAuth } from '../hooks/useAuth';

export default function Navbar({ actionsDisabled = false, onAction = () => { } } = {}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const handleLogout = () => {
    onAction();
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications');
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAsRead = async (id) => {
    try {
      await axios.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchStudentProfile = async () => {
      if (!user || user.role !== 'Student') return;

      setProfileLoading(true);
      try {
        const res = await axios.get('/stats/student/me');
        setStudentProfile(res.data);
        setProfileError('');
      } catch (error) {
        setProfileError(error.response?.data?.message || 'Unable to load profile details.');
      } finally {
        setProfileLoading(false);
      }
    };

    fetchStudentProfile();
  }, [user]);

  if (!user) return null;

  const navLinkClass = ({ isActive }) =>
    [
      'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
      isActive
        ? 'bg-white/15 text-white ring-1 ring-white/20 shadow-sm shadow-black/10'
        : 'text-white/80 hover:bg-white/10 hover:text-white',
    ].join(' ');

  const mobileLinkClass = ({ isActive }) =>
    [
      'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition',
      isActive
        ? 'bg-white/15 text-white ring-1 ring-white/20'
        : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white',
    ].join(' ');

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', end: true },
    { to: '/timetable', label: 'Timetable' },
    ...(user.role === 'Student' ? [{ to: '/student/dashboard', label: 'Student Portal' }, { to: '/report-card', label: 'Report Card', end: true }, { to: '/my-fees', label: 'My Fees' }] : []),
    ...(user.role === 'Parent' ? [{ to: '/my-fees', label: 'My Fees' }] : []),
    ...((user.role === 'Admin' || user.role === 'SuperAdmin' || user.role === 'Teacher')
      ? [
        { to: '/teacher/dashboard', label: 'Teacher Portal' },
        { to: '/register-student', label: 'Registration' },
        { to: '/classroom/attendance', label: 'Attendance' },
        { to: '/classroom/grades', label: 'Grades' },
      ]
      : []),
    ...((user.role === 'Admin' || user.role === 'SuperAdmin')
      ? [
        { to: '/assignments', label: 'T.Assignments' },
        { to: '/registrar', label: 'Registrar' },
        { to: '/academics', label: 'Academics' },
        { to: '/students', label: 'Students' },
        { to: '/teachers', label: 'Teachers' },
        { to: '/bursar', label: 'Fees' },
        { to: '/report-cards-admin', label: 'Report Cards' },
      ]
      : []),
    ...(user.role === 'SuperAdmin' ? [{ to: '/settings', label: 'Settings' }, { to: '/finance/fees', label: 'Fees' }] : []),
    ...((user.role === 'Cashier' || user.role === 'Admin' || user.role === 'SuperAdmin')
      ? [
        { to: '/finance/dashboard', label: 'Finance Suite' },
      ]
      : []),
    ...(user.role === 'Cashier'
      ? [
        { to: '/bursar', label: 'Fees' },
      ]
      : []),
    ...(user.role === 'Parent' ? [{ to: '/parent-portal', label: 'Parent Portal', end: true }] : []),
  ];

  const renderNavLink = (item, className, onClick) => (
    <NavLink key={item.to} to={item.to} end={item.end} className={className} onClick={onClick}>
      {({ isActive }) => (
        <>
          <span>{item.label}</span>
          {isActive && (
            <span
              className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.15)]"
              aria-hidden="true"
            />
          )}
        </>
      )}
    </NavLink>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/20 bg-slate-950/70 text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 sm:hidden">
          <Link
            to="/dashboard"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-500 text-base font-black text-white shadow-lg shadow-blue-500/25"
          >
            SMS
          </Link>

          <div className="flex items-center gap-2">
            {/* Mobile Notification Bell */}
            <div className="relative" ref={notifMenuRef}>
              <button
                type="button"
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 hover:bg-white/15"
              >
                <span>🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-3 w-72 rounded-3xl border border-white/10 bg-slate-950 p-4 text-white shadow-2xl z-50">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                    <span className="font-bold text-xs">Notifications</span>
                    {unreadCount > 0 && (
                      <button type="button" onClick={handleMarkAllAsRead} className="text-[10px] font-semibold text-white/60 hover:text-white transition">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            handleMarkAsRead(notif.id);
                            setNotifDropdownOpen(false);
                          }}
                          className={`rounded-xl p-2 text-[11px] transition cursor-pointer ${notif.read ? 'bg-white/5 text-white/60' : 'bg-white/10 text-white'}`}
                        >
                          <div className="font-semibold">{notif.title}</div>
                          <p className="whitespace-pre-line">{notif.message}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-[10px] text-white/50 py-2">No notifications.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onAction();
                setMobileMenuOpen((current) => !current);
              }}
              disabled={actionsDisabled}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
            >
              <span>{mobileMenuOpen ? 'Close' : 'Menu'}</span>
              <span aria-hidden="true">☰</span>
            </button>
          </div>
        </div>

        <div className="hidden items-center justify-between gap-4 sm:flex">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-500 text-base font-black text-white shadow-lg shadow-blue-500/25"
            >
              SMS
            </Link>
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-300">School Management</div>
              <div className="text-lg font-semibold text-white/95">Dashboard</div>
            </div>
          </div>

          <div className="flex flex-1 min-w-0 flex-nowrap items-center gap-2 overflow-x-auto rounded-full border border-white/10 bg-white/5 px-2 py-2">
            {navItems.map((item) => renderNavLink(item, navLinkClass))}
          </div>

          <div className="relative flex items-center gap-3">
            {/* Desktop Notification Bell */}
            <div className="relative" ref={notifMenuRef}>
              <button
                type="button"
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 hover:bg-white/15 transition"
              >
                <span>🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-3xl border border-white/10 bg-slate-950 p-4 text-white shadow-[0_20px_50px_rgba(15,23,42,0.35)] z-50">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                    <span className="font-bold text-sm">Notifications</span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <>
                          <span className="rounded-full bg-rose-500/25 px-2 py-0.5 text-[10px] font-semibold text-rose-300">{unreadCount} New</span>
                          <button type="button" onClick={handleMarkAllAsRead} className="text-[10px] font-semibold text-white/60 hover:text-white transition">Mark all read</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => handleMarkAsRead(notif.id)}
                          className={`rounded-2xl p-3 text-xs transition cursor-pointer ${notif.read ? 'bg-white/5 text-white/60' : 'bg-white/10 text-white hover:bg-white/15'}`}
                        >
                          <div className="font-semibold mb-1">{notif.title}</div>
                          <p className="mb-2 whitespace-pre-line text-white/80">{notif.message}</p>
                          <div className="text-[10px] text-white/40 flex justify-between items-center">
                            <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                            {!notif.read && <span className="text-blue-400 font-bold hover:underline">Mark as read</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-xs text-white/50 py-4">No notifications yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative flex items-center gap-3" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => {
                  onAction();
                  if (user.role === 'Student') setProfileOpen((current) => !current);
                }}
                disabled={actionsDisabled || user.role !== 'Student'}
                className={`flex h-10 items-center rounded-full border border-white/10 bg-white/10 px-4 text-sm font-medium text-white/80 transition ${user.role === 'Student' ? 'hover:bg-white/10 hover:text-white' : 'cursor-default'} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {user.name} <span className="text-white/50">•</span> {getRoleLabel(user.role, user.scopeType)}
              </button>

              {user.role === 'Student' && profileOpen && (
                <div className="absolute right-0 top-full z-50 mt-3 w-80 rounded-3xl border border-white/10 bg-slate-950 p-4 text-white shadow-[0_20px_50px_rgba(15,23,42,0.35)]">
                  <div className="mb-3 border-b border-white/10 pb-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">Student Profile</p>
                    <p className="mt-1 text-lg font-bold text-white">{studentProfile?.profile?.name || user.name}</p>
                  </div>

                  {profileLoading && <p className="text-sm text-slate-300">Loading profile details…</p>}
                  {profileError && !profileLoading && <p className="text-sm text-rose-300">{profileError}</p>}

                  {!profileLoading && !profileError && studentProfile && (
                    <div className="space-y-3 text-sm">
                      <div className="rounded-2xl bg-white/5 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Student ID</div>
                        <div className="mt-1 font-semibold text-white">{studentProfile.studentId || '—'}</div>
                      </div>
                      <div className="rounded-2xl bg-white/5 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Grade</div>
                        <div className="mt-1 font-semibold text-white">{studentProfile.grade || '—'}</div>
                      </div>
                      <div className="rounded-2xl bg-white/5 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Email</div>
                        <div className="mt-1 font-semibold text-white">{studentProfile.profile?.email || user.email || '—'}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-emerald-500/10 px-4 py-3">
                          <div className="text-xs uppercase tracking-[0.16em] text-emerald-200">Attendance</div>
                          <div className="mt-1 text-lg font-black text-white">{studentProfile.attendanceCount ?? 0}</div>
                        </div>
                        <div className="rounded-2xl bg-blue-500/10 px-4 py-3">
                          <div className="text-xs uppercase tracking-[0.16em] text-blue-200">Grades</div>
                          <div className="mt-1 text-lg font-black text-white">{studentProfile.gradesCount ?? 0}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              disabled={actionsDisabled}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Logout
            </button>
          </div>
        </div>

        <div
          id="mobile-nav-menu"
          className={`${mobileMenuOpen ? 'mt-3 block' : 'hidden'} space-y-3 rounded-3xl border border-white/10 bg-slate-950/95 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.35)] sm:hidden max-h-[calc(100vh-100px)] overflow-y-auto`}
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
            Signed in as <span className="font-semibold text-white">{user.name}</span> • {getRoleLabel(user.role, user.scopeType)}
          </div>

          {navItems.map((item) => renderNavLink(item, mobileLinkClass, closeMobileMenu))}

          {user.role === 'Student' && (
            <button
              type="button"
              onClick={() => {
                onAction();
                setProfileOpen((current) => !current);
              }}
              disabled={actionsDisabled}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <span>Student Profile</span>
              </span>
              <span aria-hidden="true">{profileOpen ? '−' : '+'}</span>
            </button>
          )}

          {user.role === 'Student' && profileOpen && (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
              <div className="text-sm font-bold">{studentProfile?.profile?.name || user.name}</div>
              {profileLoading && <p className="text-sm text-slate-300">Loading profile details…</p>}
              {profileError && !profileLoading && <p className="text-sm text-rose-300">{profileError}</p>}
              {!profileLoading && !profileError && studentProfile && (
                <div className="grid gap-2 text-sm text-slate-200">
                  <div>
                    Student ID: <span className="font-semibold text-white">{studentProfile.studentId || '—'}</span>
                  </div>
                  <div>
                    Grade: <span className="font-semibold text-white">{studentProfile.grade || '—'}</span>
                  </div>
                  <div>
                    Email: <span className="font-semibold text-white">{studentProfile.profile?.email || user.email || '—'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <button onClick={handleLogout} disabled={actionsDisabled} className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

