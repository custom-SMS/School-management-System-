import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export interface Child {
  profile: {
    id?: string;
    _id?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ParentMeResponse {
  children: Child[];
  [key: string]: any;
}

export function useParentChildrenQuery(enabled = true) {
  return useQuery<ParentMeResponse>({
    queryKey: ['parent', 'children'],
    queryFn: async () => {
      const res = await api.get('/stats/parent/me');
      return res.data || { children: [] };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled,
  });
}
