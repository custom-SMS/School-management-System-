import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export interface Semester {
  id: string;
  name: string;
  isActive: boolean;
  [key: string]: any;
}

export function useActiveSemesterQuery(enabled = true) {
  return useQuery<Semester | null>({
    queryKey: ['semesters', 'active'],
    queryFn: async () => {
      const res = await api.get('/semesters/active');
      return res.data || null;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 35 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled,
  });
}

export function useSemestersQuery(academicYearId?: string, enabled = true) {
  return useQuery<Semester[]>({
    queryKey: ['semesters', 'list', academicYearId || 'all'],
    queryFn: async () => {
      const params = academicYearId ? { academicYearId } : {};
      const res = await api.get('/semesters', { params });
      return res.data || [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 35 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled,
  });
}
