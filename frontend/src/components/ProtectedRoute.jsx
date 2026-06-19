import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * @param {{
 *   children: import('react').ReactNode,
 *   allowedRoles?: string[],
 *   requiredPermission?: string | null
 * }} props
 */
export default function ProtectedRoute({ children, allowedRoles, requiredPermission = null }) {
  const { user, permissions, loading } = useContext(AuthContext);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Loading...</div>;

  if (!user) {
    // Not logged in -> redirect to login page
    return <Navigate to="/login" replace />;
  }

  const hasRequiredPermission = !requiredPermission
    || permissions.includes('*')
    || permissions.includes(requiredPermission)
    || (requiredPermission === 'student_registration' && user.role === 'Admin');

  // Check role restriction
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-100 p-8 text-center shadow-lg shadow-rose-500/5">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-500 mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Your role ({user.role}) does not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  // Check specific permission restriction (e.g. "student_registration")
  if (requiredPermission) {
    if (!hasRequiredPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-amber-100 p-8 text-center shadow-lg shadow-amber-500/5">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto text-amber-500 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Permission Required</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              You need the <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-xs">{requiredPermission}</span> permission to access this page. Please contact your Super Admin.
            </p>
          </div>
        </div>
      );
    }
  }

  return children;
}