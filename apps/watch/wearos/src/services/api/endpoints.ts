import { apiRequest } from './http-client';
import type {
  CreatePairingRequest,
  CreateTransactionRequest,
  DeviceSettings,
  Merchant,
  PairingPollResponse,
  PairingRequestResponse,
  PaymentMethod,
  Transaction,
} from './types';

export const pairingApi = {
  createRequest(body: CreatePairingRequest) {
    return apiRequest<PairingRequestResponse>('/devices/pairing-requests', {
      method: 'POST',
      body,
      authenticated: false,
    });
  },

  poll(deviceCode: string) {
    return apiRequest<PairingPollResponse>('/devices/pairing-requests/token', {
      method: 'POST',
      body: { deviceCode },
      authenticated: false,
    });
  },
};

export const devicesApi = {
  current() {
    return apiRequest<DeviceSettings>('/devices/me');
  },

  unpair() {
    return apiRequest<void>('/devices/me', { method: 'DELETE' });
  },
};

export const paymentMethodsApi = {
  list() {
    return apiRequest<PaymentMethod[]>('/payment-methods');
  },
};

export const merchantsApi = {
  /** Payees added on the phone. */
  saved() {
    return apiRequest<Merchant[]>('/merchants/saved');
  },
};

export const transactionsApi = {
  create(body: CreateTransactionRequest) {
    return apiRequest<Transaction>('/transactions', { method: 'POST', body });
  },

  get(id: string) {
    return apiRequest<Transaction>(`/transactions/${encodeURIComponent(id)}`);
  },
};

export const queryKeys = {
  paymentMethods: ['payment-methods'] as const,
  deviceSettings: ['devices', 'me'] as const,
  savedMerchants: ['merchants', 'saved'] as const,
};
