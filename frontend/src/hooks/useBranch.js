/**
 * useBranch
 * 
 * Replaces useBranch from BranchContext.
 * - Manages selected branch state in Redux
 * - Fetches branches list via TanStack Query
 * - Resolves active semester via TanStack Query
 * - Implements switchSemester and refetchSemester
 */
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setSelectedBranch } from '../store/slices/uiSlice';
import { useBranchesQuery } from '../queries/branchQueries';
import { useActiveSemesterQuery } from '../queries/semesterQueries';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

export function useBranch() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const selectedBranchId = useAppSelector((state) => state.ui.selectedBranchId);
  const user = useAppSelector((state) => state.auth.user);

  // Fetch branches list
  const { data: branches = [] } = useBranchesQuery(!!user);

  // Fetch active semester
  const { data: activeSemester = null, refetch: refetchSemester } = useActiveSemesterQuery(!!user);

  // Resolve selectedBranch object
  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || null;

  // Determine branch selection permissions
  const isSuper = user?.role === 'SuperAdmin';
  const canSwitchBranch = isSuper || user?.scopeType === 'SchoolAdmin';

  const switchBranch = (branchId) => {
    dispatch(setSelectedBranch(branchId));
  };

  const switchSemester = async (semesterId) => {
    try {
      const res = await api.post('/semesters/active', { semesterId });
      // Invalidate both the list and the active semester cache
      await queryClient.invalidateQueries({ queryKey: ['semesters'] });
      return { ok: true, data: res.data };
    } catch (err) {
      return { 
        ok: false, 
        message: err.response?.data?.message || 'Failed to switch active semester' 
      };
    }
  };

  return {
    branches,
    selectedBranchId,
    selectedBranch,
    canSwitchBranch,
    switchBranch,
    activeSemester,
    switchSemester,
    refetchSemester: async () => {
      await refetchSemester();
    },
  };
}

export default useBranch;
