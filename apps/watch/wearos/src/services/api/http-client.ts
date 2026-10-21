import { env } from '@/config/env';
import { sessionStore, type DeviceSessionTokens } from '../session/session-store';
import { ApiError, NetworkError, SessionLostError } from './api-error';
import type { DeviceTokensResponse } from './types';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  /** Attach and auto-refresh the device token. Defaults to true. */
  authenticated?: boolean;
}

const REQUEST_TIMEOUT_MS = 15_000;
/** Cold starts on free hosting take up to about a minute. */
const WARM_UP_TIMEOUT_MS = 60_000;
/** Refresh a little before expiry so a payment never starts with a dying token. */
const ACCESS_TOKEN_REFRESH_MARGIN_MS = 30_000;
const MS_PER_SECOND = 1_000;

let refreshInFlight: Promise<DeviceSessionTokens | null> | null = null;

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (options.authenticated === false) {
    return send<T>(path, options, null);
  }

  const session = await ensureFreshSession();
  try {
    return await send<T>(path, options, session.accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    // The access token was rejected (e.g. clock skew): refresh once and retry.
    const refreshed = await refreshSession();
    if (!refreshed) throw new SessionLostError();
    return send<T>(path, options, refreshed.accessToken);
  }
}

async function ensureFreshSession(): Promise<DeviceSessionTokens> {
  const session = sessionStore.get();
  if (!session) throw new SessionLostError();
  if (session.accessTokenExpiresAt - ACCESS_TOKEN_REFRESH_MARGIN_MS > Date.now()) return session;

  const refreshed = await refreshSession();
  if (!refreshed) throw new SessionLostError();
  return refreshed;
}

/** Single-flight: concurrent requests share one refresh, since refresh tokens are single-use. */
function refreshSession(): Promise<DeviceSessionTokens | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function performRefresh(): Promise<DeviceSessionTokens | null> {
  const current = sessionStore.get();
  if (!current || current.refreshTokenExpiresAt <= Date.now()) {
    await sessionStore.clear();
    return null;
  }

  try {
    const tokens = await send<DeviceTokensResponse>(
      '/devices/token/refresh',
      { method: 'POST', body: { refreshToken: current.refreshToken } },
      null,
    );
    const next: DeviceSessionTokens = {
      deviceSessionId: current.deviceSessionId,
      ...toStoredTokens(tokens),
    };
    await sessionStore.set(next);
    return next;
  } catch (error) {
    // Rejected refresh = revoked watch. Network failures keep the session for a later retry.
    if (error instanceof ApiError && error.status === 401) {
      await sessionStore.clear();
      return null;
    }
    throw error;
  }
}

export function toStoredTokens(tokens: DeviceTokensResponse): Omit<DeviceSessionTokens, 'deviceSessionId'> {
  return {
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: Date.now() + tokens.expiresInSeconds * MS_PER_SECOND,
    refreshToken: tokens.refreshToken,
    refreshTokenExpiresAt: Date.parse(tokens.refreshTokenExpiresAt),
  };
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

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload ? String((payload as { message: unknown }).message) : '';
    throw new ApiError(response.status, message || `Request failed with status ${response.status}`);
  }

  return payload as T;
}

/**
 * Fire-and-forget request that wakes the API up (free hosting sleeps when idle),
 * so it is warm by the time the user reaches a real request.
 */
export function warmUpBackend(): void {
  fetch(`${env.apiUrl}/health`, { signal: AbortSignal.timeout(WARM_UP_TIMEOUT_MS) }).catch(() => undefined);
}
