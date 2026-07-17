import { QueryClient } from '@tanstack/react-query';

// Production-friendly defaults.
// - staleTime: keep data fresh for a while to reduce refetching
// - gcTime: how long unused caches are kept in memory
// - retry: limited retries for flaky networks
// - refetchOnWindowFocus: avoid surprise refetching
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s
      gcTime: 10 * 60_000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

