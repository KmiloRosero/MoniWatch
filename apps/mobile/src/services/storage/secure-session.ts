import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'smartwatch-pay.session';

export interface StoredSession {
  accessToken: string;
  /** Epoch milliseconds. */
  accessTokenExpiresAt: number;
  refreshToken: string;
  /** Epoch milliseconds. */
  refreshTokenExpiresAt: number;
}

type Listener = (session: StoredSession | null) => void;

let current: StoredSession | null = null;
const listeners = new Set<Listener>();

function isStoredSession(value: unknown): value is StoredSession {
  const session = value as StoredSession;
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof session.accessToken === 'string' &&
    typeof session.refreshToken === 'string' &&
    typeof session.accessTokenExpiresAt === 'number' &&
    typeof session.refreshTokenExpiresAt === 'number'
  );
}

function emit() {
  listeners.forEach((listener) => listener(current));
}

/**
 * Single source of truth for the login session, persisted in the Keychain (iOS) /
 * Keystore (Android), never AsyncStorage. The HTTP client refreshes it; AuthProvider listens.
 */
export const secureSession = {
  async restore(): Promise<StoredSession | null> {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      current = isStoredSession(parsed) && parsed.refreshTokenExpiresAt > Date.now() ? parsed : null;
      if (!current && raw) await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch {
      current = null;
    }
    return current;
  },

  get(): StoredSession | null {
    return current;
  },

  async set(session: StoredSession): Promise<void> {
    current = session;
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    emit();
  },

  async clear(): Promise<void> {
    current = null;
    await SecureStore.deleteItemAsync(SESSION_KEY);
    emit();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
