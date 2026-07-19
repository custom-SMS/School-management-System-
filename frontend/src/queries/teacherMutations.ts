import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

export function useRegisterTeacherMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teacherData: any) => {
      const res = await api.post('/teachers', teacherData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });
}

export function useUpdateTeacherMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, teacherData }: { id: string; teacherData: any }) => {
      const res = await api.put(`/teachers/${id}`, teacherData);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacher', variables.id] });
    },
  });
}

export function useDeleteTeacherMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/teachers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });
}
