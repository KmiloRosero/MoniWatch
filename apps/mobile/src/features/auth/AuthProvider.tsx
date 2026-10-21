import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/services/api/auth.api';
import { toStoredSession } from '@/services/api/http-client';
import type { AuthResponse } from '@/services/api/types';
import { secureSession } from '@/services/storage/secure-session';

type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  signIn: (response: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Mirrors the secure session store into React. Token refresh happens inside the HTTP client;
 * the user is only signed out when the backend rejects the refresh token or they log out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('restoring');

  useEffect(() => {
    const unsubscribe = secureSession.subscribe((session) => {
      if (!session) queryClient.clear();
      setStatus(session ? 'signedIn' : 'signedOut');
    });
    secureSession.restore().then((session) => setStatus(session ? 'signedIn' : 'signedOut'));
    return unsubscribe;
  }, [queryClient]);

  const signIn = useCallback(async (response: AuthResponse) => {
    await secureSession.set(toStoredSession(response));
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Offline or already expired: the local session is cleared anyway.
    }
    await secureSession.clear();
  }, []);

  const value = useMemo(() => ({ status, signIn, signOut }), [status, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
