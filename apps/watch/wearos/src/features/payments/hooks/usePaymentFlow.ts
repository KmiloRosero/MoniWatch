import { useCallback, useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '@/config/env';
import { copy } from '@/i18n/es';
import { ApiError, NetworkError, SessionLostError } from '@/services/api/api-error';
import { queryKeys, transactionsApi } from '@/services/api/endpoints';
import type { Transaction, TransactionStatus } from '@/services/api/types';
import { haptics } from '@/services/haptics';

export interface PaymentInput {
  paymentMethodId: string;
  amountInCents: number;
  paymentPin?: string;
}

export type PaymentState =
  | { phase: 'processing' }
  | { phase: 'confirming' }
  | { phase: 'approved'; transaction: Transaction }
  | { phase: 'declined'; transaction: Transaction }
  /** outcomeUnknown: the charge may have happened, so a retry must reuse the idempotency key. */
  | { phase: 'failed'; message: string; retryable: boolean; outcomeUnknown: boolean };

const DECLINED_STATUSES: readonly TransactionStatus[] = ['DECLINED', 'FAILED', 'VOIDED', 'EXPIRED'];
const CONFIRMATION_POLL_INTERVAL_MS = 2_000;
const CONFIRMATION_MAX_POLLS = 10;

const t = copy.processing;

/**
 * Drives one payment end to end.
 * Idempotency: the same key is reused when the outcome is unknown (network/5xx), so a retry
 * can never charge twice; a fresh key is only generated after a definitive rejection.
 */
export function usePaymentFlow(input: PaymentInput) {
  const queryClient = useQueryClient();
  const idempotencyKey = useRef(Crypto.randomUUID());
  const [state, setState] = useState<PaymentState>({ phase: 'processing' });
  const [attempt, setAttempt] = useState(0);
  const { paymentMethodId, amountInCents, paymentPin } = input;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = (transaction: Transaction): boolean => {
      if (transaction.status === 'APPROVED') {
        haptics.success();
        setState({ phase: 'approved', transaction });
      } else if (DECLINED_STATUSES.includes(transaction.status)) {
        haptics.error();
        setState({ phase: 'declined', transaction });
      } else {
        return false;
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods });
      return true;
    };

    const failUnknown = () => {
      haptics.error();
      setState({ phase: 'failed', message: t.errors.unknownOutcome, retryable: true, outcomeUnknown: true });
    };

    // Asynchronous providers may answer PENDING: keep checking the transaction for a bit.
    const confirm = (transactionId: string, remaining: number) => {
      timer = setTimeout(async () => {
        try {
          const transaction = await transactionsApi.get(transactionId);
          if (cancelled || settle(transaction)) return;
          if (remaining > 0) confirm(transactionId, remaining - 1);
          else failUnknown();
        } catch {
          if (!cancelled) failUnknown();
        }
      }, CONFIRMATION_POLL_INTERVAL_MS);
    };

    const run = async () => {
      setState({ phase: 'processing' });
      try {
        const transaction = await transactionsApi.create({
          idempotencyKey: idempotencyKey.current,
          paymentMethodId,
          amountInCents,
          currency: env.currency,
          paymentPin,
        });
        if (cancelled || settle(transaction)) return;
        setState({ phase: 'confirming' });
        confirm(transaction.id, CONFIRMATION_MAX_POLLS);
      } catch (error) {
        if (cancelled || error instanceof SessionLostError) return;
        haptics.error();
        setState(toFailedState(error));
      }
    };

    void run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [attempt, paymentMethodId, amountInCents, paymentPin, queryClient]);

  const retry = useCallback(() => {
    // A definitive rejection means a new payment attempt; unknown outcomes reuse the key.
    if (state.phase === 'declined' || (state.phase === 'failed' && !state.outcomeUnknown)) {
      idempotencyKey.current = Crypto.randomUUID();
    }
    setAttempt((value) => value + 1);
  }, [state]);

  return { state, retry };
}

function toFailedState(error: unknown): PaymentState {
  const failed = (message: string, retryable: boolean, outcomeUnknown: boolean): PaymentState => ({
    phase: 'failed',
    message,
    retryable,
    outcomeUnknown,
  });

  if (error instanceof NetworkError) return failed(t.errors.unknownOutcome, true, true);
  if (error instanceof ApiError) {
    if (error.status === 403) return failed(t.errors.pin, false, false);
    if (error.status === 422) return failed(t.errors.limits, false, false);
    if (error.status === 409) return failed(t.errors.idempotency, true, false);
    if (error.status >= 500) return failed(copy.errors.server, true, true);
  }
  return failed(copy.errors.generic, false, false);
}
