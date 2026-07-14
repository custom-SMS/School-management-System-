/**
 * BranchContext
 *
 * Provides branch/level data and helpers to all components.
 * - Fetches branches and levels visible to the current user
 * - Exposes a "selected branch" switcher for SuperAdmin / SchoolAdmin
 *   (BranchAdmin and below are locked to their assigned branch)
 * - Injects X-Branch-Id header on every axios request so the backend
 *   can use it when branchFilter is needed beyond the JWT claim
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from '../api/axios';
import { AuthContext } from './AuthContext';

export const BranchContext = createContext();

export function BranchProvider({ children }) {
  const { user, isSuper, isSchoolAdmin, activeBranchId } = useContext(AuthContext);

  // All branches the current user can see
  const [branches, setBranches]   = useState([]);
  const [schools,  setSchools]    = useState([]);   // only for SuperAdmin

  // The branch the admin is currently "working in"
  // For BranchAdmin this is locked to their assigned branch
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    return activeBranchId || localStorage.getItem('selectedBranchId') || null;
  });

  const [loading, setLoading] = useState(false);

  // ── Fetch schools (SuperAdmin only) ──────────────────────────────────────
  const fetchSchools = useCallback(async () => {
    if (!isSuper) return;
    try {
      const res = await axios.get('/branches/schools');
      setSchools(res.data || []);
    } catch { /* silent */ }
  }, [isSuper]);

  // ── Fetch branches ────────────────────────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await axios.get('/branches/branches');
      const list = res.data || [];
      setBranches(list);

      // Auto-select first branch for SuperAdmin / SchoolAdmin if none selected
      if ((isSuper || isSchoolAdmin) && !selectedBranchId && list.length > 0) {
        setSelectedBranchId(list[0].id);
        localStorage.setItem('selectedBranchId', list[0].id);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user, isSuper, isSchoolAdmin, selectedBranchId]);

  useEffect(() => {
    if (user) {
      fetchSchools();
      fetchBranches();
    }
  }, [user, fetchSchools, fetchBranches]);

  // ── Inject X-Branch-Id header on all axios requests ───────────────────────
  // This lets the backend use it as a fallback when branchId is not in JWT
  useEffect(() => {
    const id = axios.interceptors.request.use((config) => {
      const bid = selectedBranchId || activeBranchId;
      if (bid) config.headers['X-Branch-Id'] = bid;
      return config;
    });
    return () => axios.interceptors.request.eject(id);
  }, [selectedBranchId, activeBranchId]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || null;

  // Can this user switch branches? Only SuperAdmin and SchoolAdmin
  const canSwitchBranch = isSuper || isSchoolAdmin;

  // Switch branch (for SuperAdmin / SchoolAdmin)
  const switchBranch = (branchId) => {
    if (!canSwitchBranch) return;
    setSelectedBranchId(branchId);
    if (branchId) {
      localStorage.setItem('selectedBranchId', branchId);
    } else {
      localStorage.removeItem('selectedBranchId');
    }
  };

  return (
    <BranchContext.Provider value={{
      // data
      schools,
      branches,
      selectedBranch,
      selectedBranchId,
      loading,
      canSwitchBranch,
      // actions
      switchBranch,
      refetchBranches: fetchBranches,
    }}>
      {children}
    </BranchContext.Provider>
  );
}

/** Convenience hook */
export function useBranch() {
  return useContext(BranchContext);
}
