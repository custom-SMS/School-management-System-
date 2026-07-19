import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

// ── Classroom CRUD ──────────────────────────────────────────────────────────
export function useCreateClassMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await api.post('/classroom/classes', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });
}

export function useUpdateClassMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      (await api.put(`/classroom/classes/${id}`, data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });
}

export function useDeleteClassMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/classroom/classes/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });
}

// ── Section CRUD ────────────────────────────────────────────────────────────
export function useCreateSectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await api.post('/classroom/sections', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });
}

export function useUpdateSectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sectionId, data }: { sectionId: string; data: any }) =>
      (await api.put(`/classroom/sections/detail/${sectionId}`, data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });
}

export function useDeleteSectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sectionId: string) =>
      (await api.delete(`/classroom/sections/detail/${sectionId}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });
}

export function useAssignStudentsToSectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sectionId, studentIds }: { sectionId: string; studentIds: string[] }) =>
      (await api.put(`/classroom/sections/detail/${sectionId}/students`, { studentIds })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

// ── Attendance ──────────────────────────────────────────────────────────────
export function useRecordAttendanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await api.post('/classroom/attendance', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

// ── Grades ──────────────────────────────────────────────────────────────────
export function useSaveGradesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await api.post('/classroom/grades', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grades'] }),
  });
}

export function useApproveGradesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await api.post('/classroom/grades/approve', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grades'] }),
  });
}

// ── Class Subjects ──────────────────────────────────────────────────────────
export function useAddSubjectToClassMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await api.post('/classroom/class-subjects', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });
}

export function useRemoveSubjectFromClassMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ classId, subjectId }: { classId: string; subjectId: string }) =>
      (await api.delete(`/classroom/class-subjects/${classId}/${subjectId}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });
}

export function useUpdateClassSubjectTeacherMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      classId,
      subjectId,
      data,
    }: {
      classId: string;
      subjectId: string;
      data: any;
    }) => (await api.put(`/classroom/class-subjects/${classId}/${subjectId}/teacher`, data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });
}
