import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await api.put('/settings', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['publicSettings'] });
    },
  });
}
