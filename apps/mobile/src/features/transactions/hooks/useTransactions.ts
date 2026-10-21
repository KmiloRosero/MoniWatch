import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { transactionsApi } from '@/services/api/transactions.api';

const PAGE_SIZE = 20;

/** Cursor-paginated history, newest first. */
export function useTransactions() {
  return useInfiniteQuery({
    queryKey: queryKeys.transactions,
    queryFn: ({ pageParam }) => transactionsApi.list(pageParam, PAGE_SIZE),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
