import { apiRequest } from './http-client';
import type { TransactionsPage } from './types';

export const transactionsApi = {
  list(cursor: string | null, limit: number) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return apiRequest<TransactionsPage>(`/transactions?${params.toString()}`);
  },
};
