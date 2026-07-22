import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export interface TeacherDashboardData {
  stats: any;
  gradingSettings: { gpaEnabled: boolean; passMark: number };
}

export function useTeacherDashboardQuery() {
  return useQuery<TeacherDashboardData>({
    queryKey: ['teacher', 'dashboard'],
    queryFn: async () => {
      const [statsRes, settingsRes] = await Promise.all([
        api.get('/stats/teacher/me').catch(() => ({ data: null })),
        api.get('/settings/public').catch(() => ({ data: { grading: { gpaEnabled: false, passMark: 50 } } })),
      ]);

      return {
        stats: statsRes.data,
        gradingSettings: settingsRes.data?.grading || { gpaEnabled: false, passMark: 50 },
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useTeacherTimetableQuery() {
  return useQuery({
    queryKey: ['teacher', 'timetable'],
    queryFn: async () => {
      const res = await api.get('/timetables/teacher/me');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useTeacherClassesQuery() {
  return useQuery({
    queryKey: ['teacher', 'classes'],
    queryFn: async () => {
      const [yearsRes, statsRes] = await Promise.all([
        api.get('/academic-years').catch(() => ({ data: [] })),
        api.get('/stats/teacher/me').catch(() => ({ data: null })),
      ]);
      const years = yearsRes.data || [];
      const activeYear = years.find((y: any) => y.isActive) || years[0] || null;
      return {
        activeYear,
        classes: statsRes.data?.classSummaries || [],
        stats: statsRes.data || null,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
