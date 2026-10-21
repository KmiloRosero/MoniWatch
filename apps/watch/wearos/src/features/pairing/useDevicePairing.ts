import { useCallback, useEffect, useState } from 'react';
import { ApiError, NetworkError } from '@/services/api/api-error';
import { pairingApi } from '@/services/api/endpoints';
import type { PairingRequestResponse } from '@/services/api/types';
import { toUserMessage } from '@/services/api/error-messages';
import { toStoredTokens } from '@/services/api/http-client';
import { haptics } from '@/services/haptics';
import { getDeviceIdentity } from '@/services/session/device-identity';
import { sessionStore } from '@/services/session/session-store';

export type PairingState =
  | { phase: 'requesting' }
  | { phase: 'waiting'; userCode: string; expiresAt: number }
  | { phase: 'approved' }
  | { phase: 'expired' }
  | { phase: 'error'; message: string };

const MS_PER_SECOND = 1_000;
const BACKOFF_FACTOR = 2;
/** A sleeping free-tier backend needs up to a minute: keep asking before showing an error. */
const CREATE_REQUEST_ATTEMPTS = 4;
const CREATE_REQUEST_RETRY_DELAY_MS = 2_000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Device authorization flow: request a code, show it, poll until the phone approves it.
 * Network blips keep polling; only an expired/consumed code or a hard error stops it.
 */
export function useDevicePairing() {
  const [state, setState] = useState<PairingState>({ phase: 'requesting' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const start = async () => {
      try {
        const identity = await getDeviceIdentity();
        const createRequest = async (attemptNumber: number): Promise<PairingRequestResponse> => {
          try {
            return await pairingApi.createRequest({ platform: 'WEAR_OS', ...identity });
          } catch (error) {
            if (cancelled || !(error instanceof NetworkError) || attemptNumber >= CREATE_REQUEST_ATTEMPTS) throw error;
            await wait(CREATE_REQUEST_RETRY_DELAY_MS);
            return createRequest(attemptNumber + 1);
          }
        };
        const request = await createRequest(1);
        if (cancelled) return;

        const expiresAt = Date.parse(request.expiresAt);
        let intervalMs = request.pollIntervalSeconds * MS_PER_SECOND;
        setState({ phase: 'waiting', userCode: request.userCode, expiresAt });

        const poll = async () => {
          if (cancelled) return;
          try {
            const result = await pairingApi.poll(request.deviceCode);
            if (cancelled) return;
            if (result.status === 'APPROVED') {
              haptics.success();
              setState({ phase: 'approved' });
              // Storing the session flips the navigator to the payment screens.
              await sessionStore.set({ deviceSessionId: result.deviceSessionId, ...toStoredTokens(result) });
              return;
            }
            intervalMs = result.pollIntervalSeconds * MS_PER_SECOND;
          } catch (error) {
            if (cancelled) return;
            if (error instanceof ApiError && error.status === 410) {
              setState({ phase: 'expired' });
              return;
            }
            if (error instanceof ApiError && error.status === 429) {
              intervalMs *= BACKOFF_FACTOR;
            } else if (!(error instanceof NetworkError)) {
              setState({ phase: 'error', message: toUserMessage(error) });
              return;
            }
          }

          if (Date.now() >= expiresAt) {
            setState({ phase: 'expired' });
            return;
          }
          timer = setTimeout(poll, intervalMs);
        };

        timer = setTimeout(poll, intervalMs);
      } catch (error) {
        if (!cancelled) setState({ phase: 'error', message: toUserMessage(error) });
      }
    };

    void start();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [attempt]);

  const restart = useCallback(() => {
    setState({ phase: 'requesting' });
    setAttempt((value) => value + 1);
  }, []);

  return { state, restart };
}
