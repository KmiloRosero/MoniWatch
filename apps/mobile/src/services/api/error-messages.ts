import { copy } from '@/i18n/es';
import { ApiError, NetworkError } from './api-error';

/**
 * Backend messages are English and technical, so they are never shown directly.
 * Callers map the statuses they care about to Spanish copy.
 */
export function toUserMessage(error: unknown, byStatus: Partial<Record<number, string>> = {}): string {
  if (error instanceof NetworkError) return copy.errors.network;
  if (error instanceof ApiError) {
    const mapped = byStatus[error.status];
    if (mapped) return mapped;
    return error.status >= 500 ? copy.errors.server : copy.errors.generic;
  }
  return copy.errors.generic;
}
