import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export interface StudentDashboardData {
  stats: any;
  timetable: any[];
  gradingSettings: { gpaEnabled: boolean; passMark: number };
  subjects: any[];
}

export function useStudentDashboardQuery() {
  return useQuery<StudentDashboardData>({
    queryKey: ['student', 'dashboard'],
    queryFn: async () => {
      const [statsRes, timetableRes, settingsRes, subjectsRes] = await Promise.all([
        api.get('/stats/student/me').catch(() => ({ data: null })),
        api.get('/timetables/student/me').catch(() => ({ data: { timetable: [] } })),
        api.get('/settings/public').catch(() => ({ data: { grading: { gpaEnabled: false, passMark: 50 } } })),
        api.get('/students/me/subjects').catch(() => ({ data: { subjects: [] } })),
      ]);

      return {
        stats: statsRes.data,
        timetable: timetableRes.data?.timetable || [],
        gradingSettings: settingsRes.data?.grading || { gpaEnabled: false, passMark: 50 },
        subjects: subjectsRes.data?.subjects || [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useStudentAcademicsQuery(semesterId?: string) {
  return useQuery({
    queryKey: ['student', 'academics', semesterId || 'default'],
    queryFn: async () => {
      const params = semesterId ? `?semesterId=${semesterId}` : '';
      const [statsRes, timetableRes, subjectsRes] = await Promise.all([
        api.get(`/stats/student/me${params}`).catch(() => ({ data: null })),
        api.get('/timetables/student/me').catch(() => ({ data: { timetable: [] } })),
        api.get(`/students/me/subjects${params}`).catch(() => ({ data: { subjects: [] } })),
      ]);

      return {
        stats: statsRes.data,
        timetable: timetableRes.data?.timetable || [],
        subjects: subjectsRes.data?.subjects || [],
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useStudentAttendanceQuery() {
  return useQuery({
    queryKey: ['student', 'attendance'],
    queryFn: async () => {
      const res = await api.get('/stats/student/me');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useStudentFinanceQuery() {
  return useQuery({
    queryKey: ['student', 'finance'],
    queryFn: async () => {
      const [feesRes, profileRes] = await Promise.all([
        api.get('/fees/my').catch(() => ({ data: [] })),
        api.get('/stats/student/me').catch(() => ({ data: null })),
      ]);
      return {
        fees: feesRes.data || [],
        profile: profileRes.data || null,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
