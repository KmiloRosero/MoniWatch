import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sessionStore } from '@/services/session/session-store';

type SessionStatus = 'restoring' | 'unpaired' | 'paired';

const SessionContext = createContext<SessionStatus>('restoring');

/** Mirrors the session store into React; losing the session sends the watch back to pairing. */
export function WatchSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>('restoring');

  useEffect(() => {
    const unsubscribe = sessionStore.subscribe((session) => {
      if (!session) queryClient.clear();
      setStatus(session ? 'paired' : 'unpaired');
    });
    sessionStore.restore().then((session) => setStatus(session ? 'paired' : 'unpaired'));
    return unsubscribe;
  }, [queryClient]);

  return <SessionContext.Provider value={status}>{children}</SessionContext.Provider>;
}

export function useSessionStatus(): SessionStatus {
  return useContext(SessionContext);
}
