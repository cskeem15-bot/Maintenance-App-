import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Local SQLite reads are cheap and the source of truth offline, so
      // refetch fairly often but tolerate being briefly stale.
      staleTime: 30_000,
      retry: 2,
    },
    mutations: {
      retry: 0,
    },
  },
});
