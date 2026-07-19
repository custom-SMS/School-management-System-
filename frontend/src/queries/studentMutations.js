import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { getStudentListQueryKey } from './studentQueries';

export function useRegisterStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentData) => {
      const res = await api.post('/students', studentData);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate all student lists
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useUpdateStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, studentData }) => {
      const res = await api.put(`/students/${id}`, studentData);
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
    },
  });
}

export function useDeleteStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/students/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function usePromoteStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promotionData) => {
      const res = await api.post('/students/promote', promotionData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useRepeatStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repeatData) => {
      const res = await api.post('/students/repeat', repeatData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useSetStudentStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await api.patch(`/students/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
    },
  });
}
