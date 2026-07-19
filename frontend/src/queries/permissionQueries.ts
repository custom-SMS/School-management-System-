import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export function usePermissionsQuery(enabled = true) {
  return useQuery<string[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await api.get('/auth/permissions/me');
      return res.data.permissions || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled,
  });
}
