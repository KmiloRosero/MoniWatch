import { apiRequest } from './http-client';
import type { CreatePaymentMethodRequest, PaymentMethod, WompiCheckout } from './types';

export const paymentMethodsApi = {
  list() {
    return apiRequest<PaymentMethod[]>('/payment-methods');
  },

  create(body: CreatePaymentMethodRequest) {
    return apiRequest<PaymentMethod>('/payment-methods', { method: 'POST', body });
  },

  setDefault(id: string) {
    return apiRequest<PaymentMethod>(`/payment-methods/${encodeURIComponent(id)}/default`, {
      method: 'PATCH',
    });
  },

  wompiCheckout() {
    return apiRequest<WompiCheckout>('/payment-methods/providers/wompi');
  },

  revoke(id: string) {
    return apiRequest<void>(`/payment-methods/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
