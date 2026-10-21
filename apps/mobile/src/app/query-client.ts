import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/services/api/api-error';

const MAX_QUERY_RETRIES = 2;
const STALE_TIME_MS = 30_000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        // 4xx answers will not change on retry; only retry network and 5xx failures.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < MAX_QUERY_RETRIES,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
