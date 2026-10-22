import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { merchantsApi } from '@/services/api/merchants.api';
import { paymentMethodsApi } from '@/services/api/payment-methods.api';
import { queryKeys } from '@/services/api/query-keys';
import type { WompiCheckout } from '@/services/api/types';
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

export type LinkCardInput = LinkOptions &
  CardDetails & {
    /** The card is tokenized against this merchant's Wompi account and can only pay it. */
    merchantId: string;
    checkout: WompiCheckout;
  };

/** Acceptance tokens are pre-signed by Wompi and short-lived: refetch before they go stale. */
const WOMPI_CHECKOUT_STALE_MS = 4 * 60_000;

export function useWompiCheckout(merchantId: string | null) {
  return useQuery({
    queryKey: queryKeys.wompiCheckout(merchantId ?? ''),
    queryFn: () => merchantsApi.wompiCheckout(merchantId!),
    enabled: merchantId !== null,
    staleTime: WOMPI_CHECKOUT_STALE_MS,
  });
}

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
  const queryClient = useQueryClient();
  const invalidate = useInvalidatePaymentMethods();
  return useMutation({
    mutationFn: async ({ alias, isDefault, checkout, merchantId, ...card }: LinkCardInput) => {
      const token = await tokenizeCard(card, checkout);
      return paymentMethodsApi.create({
        provider: 'WOMPI',
        type: 'CARD',
        merchantId,
        providerToken: token.token,
        last4: token.last4,
        cardBrand: token.brand,
        cardExpMonth: token.expMonth,
        cardExpYear: token.expYear,
        alias,
        isDefault,
        // Present only in LIVE mode, after the user accepted Wompi's terms in the form.
        acceptanceToken: checkout.acceptance?.acceptanceToken,
        personalDataAuthToken: checkout.acceptance?.personalDataAuthToken,
      });
    },
    // The backend also adds the merchant to the user's payees.
    onSuccess: () => Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: queryKeys.savedMerchants })]),
  });
}
