import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation hook helper that invalidates relevant TanStack Query keys
 * upon successful data modifications (POST/PUT/PATCH/DELETE).
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateStudentQueries: () => {
      queryClient.invalidateQueries({ queryKey: ['student'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    invalidateTeacherQueries: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    invalidateAdminQueries: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    invalidateClassroomQueries: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries();
    },
  };
}

/**
 * Custom mutation wrapper that executes an API request and automatically
 * invalidates matching query keys upon success.
 */
export function useGenericMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  queryKeysToInvalidate: (string[])[]
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: () => {
      queryKeysToInvalidate.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}
