import { env } from '@/config/env';
import { secureSession, type StoredSession } from '../storage/secure-session';
import { ApiError, NetworkError, SessionExpiredError } from './api-error';
import type { SessionTokens } from './types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  /** Attach and auto-refresh the session token. Defaults to true. */
  authenticated?: boolean;
}

const REQUEST_TIMEOUT_MS = 15_000;
/** Cold starts on free hosting take up to about a minute. */
const WARM_UP_TIMEOUT_MS = 60_000;
/** Refresh a little early so a request never starts with a token about to expire. */
const ACCESS_TOKEN_REFRESH_MARGIN_MS = 30_000;
const MS_PER_SECOND = 1_000;

let refreshInFlight: Promise<StoredSession | null> | null = null;

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (options.authenticated === false) {
    return send<T>(path, options, null);
  }

  const session = await ensureFreshSession();
  try {
    return await send<T>(path, options, session.accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    // Rejected token (e.g. clock skew or a revoked session): refresh once and retry.
    const refreshed = await refreshSession();
    if (!refreshed) throw new SessionExpiredError();
    return send<T>(path, options, refreshed.accessToken);
  }
}

export function toStoredSession(tokens: SessionTokens): StoredSession {
  return {
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: Date.now() + tokens.expiresInSeconds * MS_PER_SECOND,
    refreshToken: tokens.refreshToken,
    refreshTokenExpiresAt: Date.parse(tokens.refreshTokenExpiresAt),
  };
}

async function ensureFreshSession(): Promise<StoredSession> {
  const session = secureSession.get();
  if (!session) throw new SessionExpiredError();
  if (session.accessTokenExpiresAt - ACCESS_TOKEN_REFRESH_MARGIN_MS > Date.now()) return session;

  const refreshed = await refreshSession();
  if (!refreshed) throw new SessionExpiredError();
  return refreshed;
}

/** Single-flight: refresh tokens are single-use, so concurrent requests must share one refresh. */
function refreshSession(): Promise<StoredSession | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function performRefresh(): Promise<StoredSession | null> {
  const current = secureSession.get();
  if (!current || current.refreshTokenExpiresAt <= Date.now()) {
    await secureSession.clear();
    return null;
  }

  try {
    const tokens = await send<SessionTokens>('/auth/refresh', { method: 'POST', body: { refreshToken: current.refreshToken } }, null);
    const next = toStoredSession(tokens);
    await secureSession.set(next);
    return next;
  } catch (error) {
    // A rejected refresh ends the session; network errors keep it for a later retry.
    if (error instanceof ApiError && error.status === 401) {
      await secureSession.clear();
      return null;
    }
    throw error;
  }
}

async function send<T>(path: string, options: RequestOptions, accessToken: string | null): Promise<T> {
  const { method = 'GET', body } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    throw new NetworkError(error);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) return undefined as T;

  const payload = await parseJson(response);
  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(payload, response.status), payload);
  }
  return payload as T;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const { message } = payload as { message: unknown };
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return `Request failed with status ${status}`;
}

/**
 * Fire-and-forget request that wakes the API up (free hosting sleeps when idle),
 * so it is warm by the time the user reaches a real request.
 */
export function warmUpBackend(): void {
  fetch(`${env.apiUrl}/health`, { signal: AbortSignal.timeout(WARM_UP_TIMEOUT_MS) }).catch(() => undefined);
}
