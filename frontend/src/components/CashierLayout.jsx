import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import MaintenanceBanner from './MaintenanceBanner';

const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);
const PaymentsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const VerificationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const AnalyticsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const FeesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const BellIcon = () => (
  <svg className="w-5 h-5 text-[#3b6b82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const SearchIcon = () => (
  <svg className="h-4 w-4 text-[#799cb0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const LogoutIcon = () => (
  <svg className="w-5 h-5 text-[#8daec0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);
const MenuIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
const CloseIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const navItems = [
  { to: '/finance/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/finance/payments', label: 'Payments', icon: <PaymentsIcon />, permission: 'verify_payments' },
  { to: '/finance/verification', label: 'Verification', icon: <VerificationIcon />, permission: 'verify_payments' },
  { to: '/finance/analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
  { to: '/finance/fees', label: 'Fees', icon: <FeesIcon />, permission: 'manage_fees' },
];

export default function CashierLayout({ children, searchPlaceholder = 'Search students, receipts...' }) {
  const { user, logout, permissions } = useAuth();
  const { branding, logoUrl } = useSettings();
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
    } catch { /* silent */ }
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

  const initials = (user?.name || 'C')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNavItems = navItems.filter((item) =>
    !item.permission || permissions.includes('*') || permissions.includes(item.permission)
  );

  return (
    <div className="flex min-h-screen bg-[#e7eff3] font-sans text-[#203e4f]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-[#203e4f] text-[#cbe1eb] shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top School Branding Header */}
        <div className="flex flex-col items-center pt-6 pb-5 px-4 border-b border-white/10 relative">
          <button
            className="text-[#9bbcc9] hover:text-white lg:hidden absolute top-4 right-4"
            onClick={() => setMobileOpen(false)}
          >
            <CloseIcon />
          </button>

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
            Cashier Portal
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
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

        {/* Bottom User Profile Card */}
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
                {user?.name || 'Cashier User'}
              </div>
              <div className="truncate text-[10px] text-[#9bbcc9] font-medium">
                {user?.email || 'cashier@school.test'}
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

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col bg-[#e7eff3]">
        <MaintenanceBanner />

        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#d8e6ed] bg-[#e7eff3]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 shadow-xs">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="text-[#203e4f] hover:text-black lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </button>
            <h1 className="truncate text-lg sm:text-2xl font-extrabold text-[#203e4f] tracking-tight">
              {branding?.institutionNameEn || 'Cashier Portal'}
            </h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Pill Input */}
            <div className="relative hidden items-center sm:flex w-48 lg:w-64">
              <input
                type="text"
                placeholder={searchPlaceholder}
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
                    {unreadCount > 0 && (
                      <button type="button" onClick={markAllAsRead} className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <button
                          type="button"
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
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
