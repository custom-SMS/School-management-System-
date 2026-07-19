import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

// ── Fee Structures ──────────────────────────────────────────────────────────
export function useCreateFeeStructureMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await api.post('/fees/structures', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fees', 'structures'] }),
  });
}

export function useDeleteFeeStructureMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/fees/structures/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fees', 'structures'] }),
  });
}

// ── Payments ────────────────────────────────────────────────────────────────
export function useRecordPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await api.post('/fees', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useMarkFeePaidInCashMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (feeId: string) => (await api.patch(`/fees/${feeId}/pay`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fees'] }),
  });
}

export function useGenerateMonthlyFeesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await api.post('/fees/generate', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fees'] }),
  });
}

export function useSendBulkFeeRemindersMutation() {
  return useMutation({
    mutationFn: async (data: any) => (await api.post('/fees/reminders', data)).data,
  });
}

// ── Bank Payments ───────────────────────────────────────────────────────────
export function useSubmitBankPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await api.post('/fees/bank-pay', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fees'] }),
  });
}

export function useVerifyPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, status }: { paymentId: string; status: string }) =>
      (await api.patch(`/fees/verify/${paymentId}`, { status })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fees'] }),
  });
}
