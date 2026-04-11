import { useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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
    ...(user.role === 'Student' ? [{ to: '/report-card', label: 'Grade Summary', end: true }] : []),
    ...((user.role === 'Admin' || user.role === 'Teacher')
      ? [
          { to: '/register-student', label: 'Registration' },
          { to: '/classroom/attendance', label: 'Attendance' },
          { to: '/classroom/grades', label: 'Grades' },
        ]
      : []),
    ...(user.role === 'Admin'
      ? [
          { to: '/assignments', label: 'T.Assignments' },
          { to: '/registrar', label: 'Registrar' },
          { to: '/students', label: 'Students' },
          { to: '/teachers', label: 'Teachers' },
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

  return (
    <nav className="sticky top-0 z-50 border-b border-white/20 bg-slate-950/70 text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 sm:hidden">
          <Link
            to="/dashboard"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-violet-500 text-base font-black text-white shadow-lg shadow-blue-500/25"
          >
            SMS
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            <span>{mobileMenuOpen ? 'Close' : 'Menu'}</span>
            <span aria-hidden="true">☰</span>
          </button>
        </div>

        <div className="hidden items-center justify-between gap-4 sm:flex">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-violet-500 text-base font-black text-white shadow-lg shadow-blue-500/25"
            >
              SMS
            </Link>
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-300">School Management</div>
              <div className="text-lg font-semibold text-white/95">Dashboard</div>
            </div>
          </div>

          <div className="flex w-full max-w-full flex-nowrap items-center gap-2 overflow-x-auto rounded-full border border-white/10 bg-white/5 px-2 py-2 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-2">
            {navItems.map((item) => renderNavLink(item, navLinkClass))}
          </div>

          <div className="relative flex items-center gap-3" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => user.role === 'Student' && setProfileOpen((current) => !current)}
              className={`flex h-10 items-center rounded-full border border-white/10 bg-white/10 px-4 text-sm font-medium text-white/80 transition ${user.role === 'Student' ? 'hover:bg-white/10 hover:text-white' : 'cursor-default'}`}
            >
              {user.name} <span className="text-white/50">•</span> {user.role}
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

            <button
              onClick={handleLogout}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </div>

        <div
          id="mobile-nav-menu"
          className={`${mobileMenuOpen ? 'mt-3 block' : 'hidden'} space-y-3 rounded-3xl border border-white/10 bg-slate-950/95 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.35)] sm:hidden`}
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
            Signed in as <span className="font-semibold text-white">{user.name}</span> • {user.role}
          </div>

          {navItems.map((item) => renderNavLink(item, mobileLinkClass, closeMobileMenu))}

          {user.role === 'Student' && (
            <button
              type="button"
              onClick={() => setProfileOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <span>Student Profile</span>
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

          <button onClick={handleLogout} className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
