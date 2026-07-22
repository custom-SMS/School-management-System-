/**
 * useAuth
 *
 * Central hook that replaces all useAuth() calls.
 * - user identity and auth flags come from Redux
 * - permissions come from TanStack Query
 * - login / logout are self-contained API functions
 */
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCredentials, clearCredentials, setAuthLoaded } from '../store/slices/authSlice';
import { usePermissionsQuery } from '../queries/permissionQueries';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

export function useAuth() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const loading = useAppSelector((state) => state.auth.isLoading);

  const { data: permissionsData } = usePermissionsQuery(!!user);
  const permissions = permissionsData || [];

  // Derived role/scope helpers
  const isSuper = user?.role === 'SuperAdmin';
  const isSchoolAdmin = user?.scopeType === 'SchoolAdmin';
  const isBranchAdmin = user?.scopeType === 'BranchAdmin';
  const isLevelAdmin = user?.scopeType === 'LevelAdmin';
  const isCashierScope = user?.scopeType === 'Cashier';
  const isAnyAdmin =
    ['SchoolAdmin', 'BranchAdmin', 'LevelAdmin'].includes(user?.scopeType) ||
    user?.role === 'SuperAdmin';

  // Active scope IDs from user object
  const activeBranchId = user?.branchId || null;
  const activeLevelId = user?.levelId || null;
  const activeSchoolId = user?.schoolId || null;
  const scopeType = user?.scopeType || null;

  const login = async (identifier, password) => {
    const response = await api.post('/auth/login', { identifier, password });
    const { user: loggedInUser, token } = response.data;

    if (token) {
      localStorage.setItem('token', token);
    }
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    dispatch(setCredentials(loggedInUser));

    // Invalidate permissions so they are fetched fresh
    await queryClient.invalidateQueries({ queryKey: ['permissions'] });

    return loggedInUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore network/cookie errors on logout
    }
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    dispatch(clearCredentials());
    queryClient.setQueryData(['permissions'], []);
  };

  return {
    user,
    permissions,
    loading,
    isAuthenticated,
    login,
    logout,
    isSuper,
    isSchoolAdmin,
    isBranchAdmin,
    isLevelAdmin,
    isCashierScope,
    isAnyAdmin,
    activeBranchId,
    activeLevelId,
    activeSchoolId,
    scopeType,
  };
}

// Re-export initAuth for use during app startup (called once from main bootstrap)
export function initAuthFromStorage(dispatch) {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    dispatch(setCredentials(JSON.parse(storedUser)));
  } else {
    dispatch(setAuthLoaded());
  }
}
