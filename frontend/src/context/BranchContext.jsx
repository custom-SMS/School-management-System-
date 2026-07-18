/**
 * BranchContext
 *
 * Provides branch/level/semester data and helpers to all components.
 * - Fetches branches and levels visible to the current user
 * - Exposes a "selected branch" switcher for SuperAdmin / SchoolAdmin
 *   (BranchAdmin and below are locked to their assigned branch)
 * - Injects X-Branch-Id header on every axios request so the backend
 *   can use it when branchFilter is needed beyond the JWT claim
 * - Fetches the globally active semester and exposes it as `activeSemester`
 * - Injects X-Semester-Id header on every request so backend controllers
 *   can resolve the semester context without body params
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from '../api/axios';
import { AuthContext } from './AuthContext';

export const BranchContext = createContext();

export function BranchProvider({ children }) {
  const { user, isSuper, isSchoolAdmin, activeBranchId } = useContext(AuthContext);

  // All branches the current user can see
  const [branches, setBranches] = useState([]);
  const [schools, setSchools] = useState([]);   // only for SuperAdmin
  const [levels, setLevels] = useState([]);

  // The branch the admin is currently "working in"
  // For BranchAdmin this is locked to their assigned branch
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    return activeBranchId || localStorage.getItem('selectedBranchId') || null;
  });
  const [selectedLevelId, setSelectedLevelId] = useState(null);

  // ── Semester state ────────────────────────────────────────────────────────
  const [activeSemester, setActiveSemester] = useState(null);
  const [semesters, setSemesters] = useState([]);

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
    // Only fetch branches for users with appropriate roles/scopes
    if (!isSuper && !isSchoolAdmin && !activeBranchId) return;
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
  }, [user, isSuper, isSchoolAdmin, selectedBranchId, activeBranchId]);

  // ── Fetch levels for selected branch ──────────────────────────────────────
  const fetchLevels = useCallback(async (branchId) => {
    if (!branchId) { setLevels([]); return; }
    try {
      const res = await axios.get(`/branches/branches/${branchId}/levels`);
      setLevels(res.data || []);
    } catch { setLevels([]); }
  }, []);

  // ── Fetch active semester ─────────────────────────────────────────────────
  const fetchActiveSemester = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get('/semesters/active');
      setActiveSemester(res.data || null);
    } catch { /* silent */ }
  }, [user]);

  // ── Fetch all semesters (useful for management UI) ────────────────────────
  const fetchSemesters = useCallback(async (academicYearId) => {
    if (!user) return;
    try {
      const params = academicYearId ? { academicYearId } : {};
      const res = await axios.get('/semesters', { params });
      setSemesters(res.data || []);
    } catch { setSemesters([]); }
  }, [user]);

  // ── Switch active semester (SuperAdmin only) ──────────────────────────────
  const switchSemester = useCallback(async (semesterId) => {
    try {
      const res = await axios.patch(`/semesters/${semesterId}/active`);
      setActiveSemester(res.data.semester || null);
      return { ok: true, semester: res.data.semester };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Failed to switch semester' };
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchSchools();
      fetchBranches();
      fetchActiveSemester();
    }
  }, [user, fetchSchools, fetchBranches, fetchActiveSemester]);

  useEffect(() => {
    fetchLevels(selectedBranchId);
  }, [selectedBranchId, fetchLevels]);

  // ── Inject X-Branch-Id and X-Semester-Id headers on all axios requests ────
  useEffect(() => {
    const id = axios.interceptors.request.use((config) => {
      const bid = selectedBranchId || activeBranchId;
      if (bid) config.headers['X-Branch-Id'] = bid;
      if (selectedLevelId) config.headers['X-Level-Id'] = selectedLevelId;
      if (activeSemester?.id) config.headers['X-Semester-Id'] = activeSemester.id;
      return config;
    });
    return () => axios.interceptors.request.eject(id);
  }, [selectedBranchId, selectedLevelId, activeBranchId, activeSemester]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || null;

  // Can this user switch branches? Only SuperAdmin and SchoolAdmin
  const canSwitchBranch = isSuper || isSchoolAdmin;

  const switchBranch = (branchId) => {
    if (!canSwitchBranch) return;
    setSelectedBranchId(branchId);
    if (branchId) {
      localStorage.setItem('selectedBranchId', branchId);
    } else {
      localStorage.removeItem('selectedBranchId');
    }
  };

  const switchLevel = (levelId) => {
    setSelectedLevelId(levelId || null);
  };

  return (
    <BranchContext.Provider value={{
      // data
      schools,
      branches,
      levels,
      selectedBranch,
      selectedBranchId,
      selectedLevelId,
      loading,
      canSwitchBranch,
      // semester data
      activeSemester,
      semesters,
      // actions
      switchBranch,
      switchLevel,
      switchSemester,
      refetchBranches: fetchBranches,
      refetchLevels: () => fetchLevels(selectedBranchId),
      refetchSemester: fetchActiveSemester,
      fetchSemesters,
    }}>
      {children}
    </BranchContext.Provider>
  );
}

/** Convenience hook */
export function useBranch() {
  return useContext(BranchContext);
}
