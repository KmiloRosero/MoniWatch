import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentMethodsApi } from '@/services/api/payment-methods.api';
import { queryKeys } from '@/services/api/query-keys';
import { tokenizeCard, type CardDetails } from '@/services/wompi/card-tokenizer';
import { toE164 } from '../utils/phone';

interface LinkOptions {
  alias?: string;
  isDefault: boolean;
}

export interface LinkNequiInput extends LinkOptions {
  /** Ten local digits, e.g. "3001234567". */
  localPhoneNumber: string;
}

export type LinkCardInput = LinkOptions & CardDetails;

export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: paymentMethodsApi.list,
  });
}

function useInvalidatePaymentMethods() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods });
}

export function useRevokePaymentMethod() {
  const invalidate = useInvalidatePaymentMethods();
  return useMutation({
    mutationFn: paymentMethodsApi.revoke,
    onSuccess: invalidate,
  });
}

export function useSetDefaultPaymentMethod() {
  const invalidate = useInvalidatePaymentMethods();
  return useMutation({
    mutationFn: paymentMethodsApi.setDefault,
    onSuccess: invalidate,
  });
}

/**
 * Nequi wallets are identified by their phone number; the backend Nequi adapter
 * turns it into a provider subscription and stores it encrypted.
 */
export function useLinkNequiAccount() {
  const invalidate = useInvalidatePaymentMethods();
  return useMutation({
    mutationFn: ({ localPhoneNumber, alias, isDefault }: LinkNequiInput) => {
      const walletPhoneNumber = toE164(localPhoneNumber);
      return paymentMethodsApi.create({
        provider: 'NEQUI',
        type: 'WALLET',
        providerToken: walletPhoneNumber,
        walletPhoneNumber,
        alias,
        isDefault,
      });
    },
    onSuccess: invalidate,
  });
}

/** Tokenizes the card with Wompi first; raw card data never reaches our backend. */
export function useLinkWompiCard() {
  const invalidate = useInvalidatePaymentMethods();
  return useMutation({
    mutationFn: async ({ alias, isDefault, ...card }: LinkCardInput) => {
      const token = await tokenizeCard(card);
      return paymentMethodsApi.create({
        provider: 'WOMPI',
        type: 'CARD',
        providerToken: token.token,
        last4: token.last4,
        cardBrand: token.brand,
        cardExpMonth: token.expMonth,
        cardExpYear: token.expYear,
        alias,
        isDefault,
      });
    },
    onSuccess: invalidate,
  });
}
