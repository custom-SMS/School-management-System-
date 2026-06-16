import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const testAccounts = [
    { label: 'Student', identifier: 'STU-0001', password: '53275306' },
    { label: 'Teacher', identifier: 'TCH-0002', password: 'd1fc095d' },
    { label: 'Admin', identifier: 'admin@school.com', password: 'admin' },
    { label: 'Super Admin', identifier: 'superadmin@school.com', password: 'superadmin' },
    { label: 'Cashier', identifier: 'cashier@school.com', password: 'cashier' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(identifier, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Main card */}
      <div className="w-full max-w-[1100px] min-h-[680px] bg-white rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden grid md:grid-cols-2">
        
        {/* Left Panel: EduManage Ethiopia */}
        <div className="relative bg-[#080808] p-8 sm:p-12 flex flex-col justify-between text-white overflow-hidden">
          {/* Vertical lines pattern overlay */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none" 
            style={{
              backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent 48px, rgba(255,255,255,0.4) 48px, rgba(255,255,255,0.4) 49px)'
            }}
          />
          
          {/* Top brand header */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800/80 rounded-xl flex items-center justify-center border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]">
              {/* School icon */}
              <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight text-white">EduManage Ethiopia</span>
          </div>

          {/* Central message */}
          <div className="relative z-10 my-12 max-w-sm">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.25] text-white">
              Empowering the next generation of Ethiopian excellence.
            </h1>
            <p className="mt-6 text-sm text-slate-400 leading-relaxed font-light">
              The unified administrative portal for managing academic records, student progress, and institutional finance with precision and security.
            </p>
          </div>

          {/* Bottom section */}
          <div className="relative z-10 space-y-6">
            {/* Secure Infrastructure Badge */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-start gap-3.5 max-w-sm backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                {/* Shield Check Icon */}
                <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Secure Infrastructure</h4>
                <p className="text-xs text-slate-400 mt-1 leading-normal">End-to-end encrypted administrative sessions active.</p>
              </div>
            </div>

            {/* Muted square decorations representing flags/partners */}
            <div className="flex gap-3">
              <div className="w-10 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                {/* Ethiopia Flag Colors - Subtle Representation */}
                <div className="flex flex-col w-6 h-4 rounded overflow-hidden">
                  <div className="bg-[#009A44] h-1/3 w-full" />
                  <div className="bg-[#FED100] h-1/3 w-full" />
                  <div className="bg-[#EF3340] h-1/3 w-full" />
                </div>
              </div>
              <div className="w-10 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Login Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-between bg-white">
          <div className="my-auto max-w-[420px] w-full mx-auto space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h2>
              <p className="text-sm text-slate-500 mt-2.5 leading-relaxed">
                Please enter your credentials to access the management dashboard.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-semibold text-rose-700 flex items-center gap-2.5 animate-fadeIn">
                <svg className="w-5 h-5 text-rose-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Identifier */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Email or Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4.5 h-4.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input 
                    type="text" 
                    placeholder="abebe.balcha@school.et"
                    className="w-full rounded-xl border border-transparent bg-slate-100/80 px-11 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400/80 focus:border-slate-300 focus:bg-slate-50 focus:ring-4 focus:ring-slate-100"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Password</label>
                  <Link to="#" className="text-xs font-semibold text-slate-900 hover:underline">Forgot Password?</Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4.5 h-4.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-transparent bg-slate-100/80 px-11 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400/80 focus:border-slate-300 focus:bg-slate-50 focus:ring-4 focus:ring-slate-100"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700"
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
                  className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-500"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="rememberMe" className="text-xs font-medium text-slate-600 select-none cursor-pointer">
                  Remember this device for 30 days
                </label>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="w-full bg-[#080808] text-white hover:bg-slate-900 font-semibold px-6 py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-black/10 hover:shadow-black/20 transition-all active:scale-[0.99]"
              >
                <span>Login</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>

            {/* Test Login Shortcuts (Collapsible/Minimized but clean) */}
            <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Test Accounts</span>
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
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-colors"
                  >
                    {account.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Muted Warning Notice */}
            <div className="bg-amber-500/[0.04] border border-amber-500/10 rounded-2xl p-4 flex gap-3 text-xs text-slate-600 leading-normal">
              <svg className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <span className="font-bold text-slate-900">Notice:</span> Multiple failed login attempts will temporarily lock your administrative account. For support, contact IT at <span className="font-bold text-slate-900">support@edumanage.et</span>.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
