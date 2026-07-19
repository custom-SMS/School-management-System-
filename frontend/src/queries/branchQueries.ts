import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export interface Branch {
  id: string;
  name: string;
  code?: string;
  address?: string;
  [key: string]: any;
}

export interface School {
  id: string;
  name: string;
  [key: string]: any;
}

export function useBranchesQuery(enabled = true) {
  return useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches/branches');
      return res.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled,
  });
}

export function useSchoolsQuery(enabled = true) {
  return useQuery<School[]>({
    queryKey: ['schools'],
    queryFn: async () => {
      const res = await api.get('/branches/schools');
      return res.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled,
  });
}
