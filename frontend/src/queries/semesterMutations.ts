import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

export function useSeedSemestersMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (academicYearId: string) =>
      (await api.post(`/semesters/seed/${academicYearId}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['semesters'] }),
  });
}

export function useSetActiveSemesterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.patch(`/semesters/${id}/active`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['semesters'] }),
  });
}

export function useUpdateSemesterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      (await api.patch(`/semesters/${id}`, data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['semesters'] }),
  });
}
