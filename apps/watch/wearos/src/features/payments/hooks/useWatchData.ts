import { useQuery } from '@tanstack/react-query';
import { devicesApi, merchantsApi, paymentMethodsApi, queryKeys } from '@/services/api/endpoints';
import type { DeviceSettings, Merchant, PaymentMethod } from '@/services/api/types';

/** A merchant the watch can pay right now, with the methods that can pay it (best first). */
export interface Payee {
  merchant: Merchant;
  methods: PaymentMethod[];
}

export function useDeviceSettings() {
  return useQuery({
    queryKey: queryKeys.deviceSettings,
    queryFn: devicesApi.current,
  });
}

/** Watch default first, then account default, then the order the backend returns. */
function sortForWatch(methods: PaymentMethod[], settings: DeviceSettings | undefined): PaymentMethod[] {
  const rank = (method: PaymentMethod) =>
    method.id === settings?.defaultPaymentMethodId ? 0 : method.isDefault ? 1 : 2;
  return methods
    .filter((method) => method.status === 'ACTIVE')
    .map((method, index) => ({ method, index }))
    .sort((a, b) => rank(a.method) - rank(b.method) || a.index - b.index)
    .map(({ method }) => method);
}

/** A card pays only its own merchant; a wallet pays any merchant. */
function canPay(method: PaymentMethod, merchantId: string): boolean {
  return method.merchant === null || method.merchant.id === merchantId;
}

/**
 * Merchants added on the phone that have at least one way to pay them.
 * hasMerchants tells an empty list apart: no merchants at all vs. merchants without methods.
 */
export function usePayees() {
  const settings = useDeviceSettings();
  const methods = useQuery({ queryKey: queryKeys.paymentMethods, queryFn: paymentMethodsApi.list });
  const merchants = useQuery({ queryKey: queryKeys.savedMerchants, queryFn: merchantsApi.saved });

  const sorted = methods.data ? sortForWatch(methods.data, settings.data) : [];
  const payees: Payee[] = (merchants.data ?? [])
    .map((merchant) => ({ merchant, methods: sorted.filter((method) => canPay(method, merchant.id)) }))
    .filter((payee) => payee.methods.length > 0);

  return {
    payees,
    hasMerchants: (merchants.data?.length ?? 0) > 0,
    isPending: methods.isPending || merchants.isPending,
    isError: methods.isError || merchants.isError,
    error: methods.error ?? merchants.error,
    refetch: () => Promise.all([methods.refetch(), merchants.refetch(), settings.refetch()]),
  };
}
