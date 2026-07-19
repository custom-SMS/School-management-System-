import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

export function useCreateSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schoolData: any) => {
      const res = await api.post('/branches/schools', schoolData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
  });
}

export function useUpdateSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, schoolData }: { id: string; schoolData: any }) => {
      const res = await api.put(`/branches/schools/${id}`, schoolData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
  });
}

export function useDeleteSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/branches/schools/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
  });
}

export function useCreateBranchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (branchData: any) => {
      const res = await api.post('/branches/branches', branchData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

export function useUpdateBranchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, branchData }: { id: string; branchData: any }) => {
      const res = await api.put(`/branches/branches/${id}`, branchData);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['branch', variables.id] });
    },
  });
}

export function useDeleteBranchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/branches/branches/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}
