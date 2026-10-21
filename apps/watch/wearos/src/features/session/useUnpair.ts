import { useCallback, useEffect, useRef, useState } from 'react';
import { devicesApi } from '@/services/api/endpoints';
import { haptics } from '@/services/haptics';
import { sessionStore } from '@/services/session/session-store';

/** The confirmation window closes on its own so a stray tap later cannot unpair. */
const CONFIRM_WINDOW_MS = 4_000;

/**
 * Two-tap unpair (no dialog: dialogs are awkward on a round screen).
 * The server session is revoked first when reachable; the local session is cleared regardless.
 */
export function useUnpair() {
  const [armed, setArmed] = useState(false);
  const [isUnpairing, setIsUnpairing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const press = useCallback(async () => {
    if (!armed) {
      haptics.tap();
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS);
      return;
    }

    if (timer.current) clearTimeout(timer.current);
    setIsUnpairing(true);
    try {
      await devicesApi.unpair();
    } catch {
      // Offline or already revoked: forgetting the credentials locally is what matters here.
    }
    await sessionStore.clear();
  }, [armed]);

  return { armed, isUnpairing, press };
}
