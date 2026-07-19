import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export interface Level {
  id: string;
  name: string;
  [key: string]: any;
}

export function useLevelsQuery(branchId: string | null) {
  return useQuery<Level[]>({
    queryKey: ['levels', branchId || ''],
    queryFn: async () => {
      if (!branchId) return [];
      const res = await api.get(`/branches/branches/${branchId}/levels`);
      return res.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !!branchId,
  });
}
