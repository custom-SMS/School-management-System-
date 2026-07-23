import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const { branding, logoUrl } = useSettings();
  const navigate = useNavigate();
  const loginSectionRef = useRef(null);

  const testAccounts = [
    { label: 'Student', identifier: 'student.b1.grade1.01@school.test', password: 'Test@1234' },
    { label: 'Teacher', identifier: 'teacher.math1@school.test', password: 'Test@1234' },
    { label: 'Admin', identifier: 'admin.branch1@school.test', password: 'Test@1234' },
    { label: 'Super Admin', identifier: 'superadmin@school.test', password: 'Test@1234' },
    { label: 'Cashier', identifier: 'cashier.branch1@school.test', password: 'Test@1234' },
    { label: 'Parent', identifier: 'parent.01@school.test', password: 'Test@1234' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const loggedInUser = await login(identifier, password);
      const landingByRole = {
        SuperAdmin: '/super-admin/dashboard',
        Admin: '/admin/dashboard',
        Cashier: '/finance/dashboard',
        Teacher: '/teacher/dashboard',
        Student: '/student/dashboard',
        Parent: '/parent/dashboard',
      };
      navigate(landingByRole[loggedInUser?.role] || '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleBrandingClick = () => {
    loginSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen w-full bg-[#e7eff3] flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans text-[#203e4f]">
      {/* Main card */}
      <div className="w-full max-w-[1100px] min-h-[680px] bg-white rounded-3xl shadow-2xl border border-[#d8e5ec] overflow-hidden grid md:grid-cols-2">
        
        {/* Left Panel: Slate Teal School Branding */}
        <div 
          onClick={handleBrandingClick}
          className="relative bg-[#203e4f] p-8 sm:p-12 pb-16 md:pb-12 flex flex-col justify-between text-white overflow-hidden cursor-pointer md:cursor-default group"
        >
          {/* Subtle grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{
              backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent 48px, rgba(255,255,255,0.4) 48px, rgba(255,255,255,0.4) 49px)'
            }}
          />
          
          {/* Top brand header */}
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#33566b] border border-white/30 ring-4 ring-white/10 flex items-center justify-center overflow-hidden shadow-md text-white font-black text-xl shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="w-full h-full object-cover p-1 rounded-full" />
              ) : (
                <span>{(branding?.institutionNameEn || 'S')[0]}</span>
              )}
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white block leading-snug">
                {branding?.institutionNameEn || 'EduManage Ethiopia'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#9bbcc9] block">
                Academic & Finance Portal
              </span>
            </div>
          </div>

          {/* Central message */}
          <div className="relative z-10 my-10 max-w-sm">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-[1.2] text-white">
              Empowering Excellence Through Innovation.
            </h1>
            <p className="mt-5 text-sm text-[#bcd5e2] leading-relaxed font-normal">
              Unified portal for managing academic performance, attendance records, and financial operations with security and precision.
            </p>
          </div>

          {/* Bottom section */}
          <div className="relative z-10 space-y-4">
            {/* Secure Infrastructure Badge */}
            <div className="bg-white/10 border border-white/15 rounded-2xl p-4 flex items-start gap-3.5 max-w-sm backdrop-blur-md">
              <div className="w-9 h-9 rounded-xl bg-[#DCF5EB] border border-[#a3e2c9] flex items-center justify-center shrink-0 text-[#0f5236]">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Secure Encrypted Access</h4>
                <p className="text-xs text-[#9bbcc9] mt-0.5 leading-normal">Session encryption active across all user roles.</p>
              </div>
            </div>
          </div>

          {/* Floating Down Arrow Bouncer - Visible only on mobile */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[11px] text-[#9bbcc9] font-bold md:hidden animate-bounce group-hover:text-white transition-colors">
            <span>Tap to Login Form</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Right Panel: Login Form */}
        <div ref={loginSectionRef} className="p-8 sm:p-12 flex flex-col justify-between bg-white scroll-mt-6">
          <div className="my-auto max-w-[420px] w-full mx-auto space-y-7">
            {/* Header */}
            <div>
              <h2 className="text-3xl font-black text-[#203e4f] tracking-tight">Welcome Back</h2>
              <p className="text-sm font-medium text-[#567a8c] mt-2">
                Enter your account credentials to access your dashboard.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-[#FDF3F2] px-4 py-3.5 text-xs font-bold text-[#901e19] flex items-center gap-2.5 shadow-xs">
                <svg className="w-5 h-5 text-rose-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Identifier */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6a8b9c]">Email or Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#799cb0]">
                    <svg className="w-4.5 h-4.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input 
                    type="text" 
                    placeholder="abebe.balcha@school.et"
                    className="w-full rounded-full border border-[#d2e2eb] bg-[#f8fafc] px-11 py-3 text-sm text-[#203e4f] outline-none transition placeholder:text-[#8caab8] focus:border-[#203e4f] focus:bg-white focus:ring-2 focus:ring-[#203e4f]/20 font-medium"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6a8b9c]">Password</label>
                  <Link to="#" className="text-xs font-bold text-[#3b6b82] hover:text-[#203e4f] transition">Forgot Password?</Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#799cb0]">
                    <svg className="w-4.5 h-4.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••••••"
                    className="w-full rounded-full border border-[#d2e2eb] bg-[#f8fafc] px-11 py-3 text-sm text-[#203e4f] outline-none transition placeholder:text-[#8caab8] focus:border-[#203e4f] focus:bg-white focus:ring-2 focus:ring-[#203e4f]/20 font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#799cb0] hover:text-[#203e4f]"
                  >
                    {showPassword ? (
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="rememberMe"
                  className="w-4 h-4 rounded text-[#203e4f] border-[#d2e2eb] focus:ring-[#203e4f]"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="rememberMe" className="text-xs font-semibold text-[#567a8c] select-none cursor-pointer">
                  Remember this device for 30 days
                </label>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="w-full bg-[#203e4f] text-white hover:bg-[#2b5268] font-extrabold px-6 py-3.5 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-[#203e4f]/20 transition-all active:scale-[0.99] text-sm"
              >
                <span>Login</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>

            {/* Test Login Shortcuts */}
            <div className="border border-[#d8e5ec] bg-[#f8fafc] rounded-2xl p-4 space-y-2.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6a8b9c]">Quick Test Accounts</span>
              <div className="flex flex-wrap gap-1.5">
                {testAccounts.map((account) => (
                  <button
                    key={account.label}
                    type="button"
                    onClick={() => {
                      setIdentifier(account.identifier);
                      setPassword(account.password);
                      setError('');
                    }}
                    className="px-3 py-1 text-xs font-extrabold rounded-full bg-white border border-[#d2e2eb] text-[#203e4f] hover:bg-[#203e4f] hover:text-white transition-all shadow-2xs"
                  >
                    {account.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
