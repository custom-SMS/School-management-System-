import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export function getStudentListQueryKey({ role, branchId }) {
  return ['students', role || '__guest__', branchId || '__no-branch__'];
}

export function useStudentsQuery({ role, branchId }) {
  const queryKey = getStudentListQueryKey({ role, branchId });

  return useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get('/students');
      return res.data;
    },
    // Keep old UI states; allow background refresh without disrupting.
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

