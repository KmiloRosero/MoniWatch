import { useQuery } from '@tanstack/react-query';
import { devicesApi, paymentMethodsApi, queryKeys } from '@/services/api/endpoints';
import type { DeviceSettings, PaymentMethod } from '@/services/api/types';

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

export function usePayablePaymentMethods() {
  const settings = useDeviceSettings();
  const methods = useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: paymentMethodsApi.list,
  });

  return {
    methods: methods.data ? sortForWatch(methods.data, settings.data) : [],
    isPending: methods.isPending,
    isError: methods.isError,
    error: methods.error,
    refetch: () => Promise.all([methods.refetch(), settings.refetch()]),
  };
}
