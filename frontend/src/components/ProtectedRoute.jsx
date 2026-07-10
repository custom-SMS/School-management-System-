/**
 * ProtectedRoute
 *
 * Props:
 *   allowedRoles       — string[]  legacy role check  e.g. ['Admin','SuperAdmin']
 *   allowedScopes      — string[]  scopeType check    e.g. ['BranchAdmin','LevelAdmin']
 *   requireAnyAdmin    — boolean   true = pass for any admin scopeType OR SuperAdmin
 *   requiredPermission — string    granular permission key e.g. 'student_registration'
 *
 * Access logic:
 *   SuperAdmin   → always passes
 *   role match   → passes if user.role is in allowedRoles
 *   scope match  → passes if user.scopeType is in allowedScopes
 *   requireAnyAdmin → passes if any of SchoolAdmin | BranchAdmin | LevelAdmin | SuperAdmin
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const ADMIN_SCOPES = ['SchoolAdmin', 'BranchAdmin', 'LevelAdmin'];

export default function ProtectedRoute({
  children,
  allowedRoles = [],
  allowedScopes = [],
  requireAnyAdmin = false,
  requiredPermission = null,
}) {
  const { user, permissions, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user.role;
  const scopeType = user.scopeType || null;

  // SuperAdmin bypasses everything
  const isSuper = role === 'SuperAdmin';

  // Evaluate access
  const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(role);
  const scopeAllowed = allowedScopes.length === 0 || (scopeType && allowedScopes.includes(scopeType));
  const anyAdmin = !requireAnyAdmin || isSuper || ADMIN_SCOPES.includes(scopeType);

  const accessGranted = isSuper || (roleAllowed && scopeAllowed && anyAdmin);

  if (!accessGranted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-100 p-8 text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-500 mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            {scopeType
              ? `Your scope (${scopeType}) does not have permission to view this page.`
              : `Your role (${role}) does not have permission to view this page.`}
          </p>
          {scopeType && (
            <p className="text-xs text-slate-400 mt-1">
              Branch: {user.branchId ? `assigned` : `none`}
              {user.levelId ? ` · Level: assigned` : ''}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Permission check (granular — e.g. student_registration)
  if (requiredPermission && !isSuper && !ADMIN_SCOPES.includes(scopeType)) {
    const hasPermission = permissions.includes('*') || permissions.includes(requiredPermission);
    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-amber-100 p-8 text-center shadow-lg">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto text-amber-500 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Permission Required</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              You need the{' '}
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                {requiredPermission}
              </span>{' '}
              permission to access this page.
            </p>
          </div>
        </div>
      );
    }
  }

  return children;
}
