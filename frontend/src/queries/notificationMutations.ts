import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

export function useSendNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await api.post('/notifications/broadcast', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.patch(`/notifications/${id}/read`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.patch('/notifications/read-all')).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useSendParentNotificationsMutation() {
  return useMutation({
    mutationFn: async (data: any) => (await api.post('/notifications/parents', data)).data,
  });
}

export function useSendSmsToParentsMutation() {
  return useMutation({
    mutationFn: async (data: any) => (await api.post('/notifications/sms', data)).data,
  });
}
