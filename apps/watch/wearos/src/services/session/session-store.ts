import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'smartwatch-pay.device-session';

export interface DeviceSessionTokens {
  deviceSessionId: string;
  accessToken: string;
  /** Epoch milliseconds. */
  accessTokenExpiresAt: number;
  refreshToken: string;
  /** Epoch milliseconds. */
  refreshTokenExpiresAt: number;
}

type Listener = (session: DeviceSessionTokens | null) => void;

let current: DeviceSessionTokens | null = null;
const listeners = new Set<Listener>();

function isSession(value: unknown): value is DeviceSessionTokens {
  const session = value as DeviceSessionTokens;
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof session.deviceSessionId === 'string' &&
    typeof session.accessToken === 'string' &&
    typeof session.refreshToken === 'string' &&
    typeof session.accessTokenExpiresAt === 'number' &&
    typeof session.refreshTokenExpiresAt === 'number'
  );
}

function emit() {
  listeners.forEach((listener) => listener(current));
}

/** Single source of truth for the watch credentials, persisted in the Android Keystore. */
export const sessionStore = {
  async restore(): Promise<DeviceSessionTokens | null> {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      current = isSession(parsed) && parsed.refreshTokenExpiresAt > Date.now() ? parsed : null;
      if (!current && raw) await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch {
      current = null;
    }
    return current;
  },

  get(): DeviceSessionTokens | null {
    return current;
  },

  async set(session: DeviceSessionTokens): Promise<void> {
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
