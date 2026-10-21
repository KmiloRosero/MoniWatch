import { copy } from '@/i18n/es';
import { ApiError, NetworkError } from './api-error';

/** Backend messages are English and technical; the watch only ever shows Spanish copy. */
export function toUserMessage(error: unknown, byStatus: Partial<Record<number, string>> = {}): string {
  if (error instanceof NetworkError) return copy.errors.network;
  if (error instanceof ApiError) {
    return byStatus[error.status] ?? (error.status >= 500 ? copy.errors.server : copy.errors.generic);
  }
  return copy.errors.generic;
}
