// Mirrors the backend contracts (apps/backend). Move to packages/shared-types when it exists.

export type PaymentProvider = 'NEQUI' | 'WOMPI';
export type PaymentMethodType = 'WALLET' | 'CARD' | 'BANK_TRANSFER';
export type PaymentMethodStatus = 'PENDING_VALIDATION' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'FAILED_VALIDATION';
export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'APPROVED'
  | 'DECLINED'
  | 'FAILED'
  | 'VOIDED'
  | 'EXPIRED'
  | 'REFUNDED';
export type DevicePlatform = 'WEAR_OS' | 'WATCH_OS';

export interface PaymentMethod {
  id: string;
  provider: PaymentProvider;
  type: PaymentMethodType;
  status: PaymentMethodStatus;
  alias: string | null;
  isDefault: boolean;
  displayLabel: string;
  last4: string | null;
  cardBrand: string | null;
  maskedPhoneNumber: string | null;
  createdAt: string;
}

export interface DeviceSettings {
  id: string;
  platform: DevicePlatform;
  deviceName: string | null;
  maxAmountPerTransaction: number | null;
  dailyLimitInCents: number | null;
  requirePinAboveInCents: number | null;
  defaultPaymentMethodId: string | null;
}

export interface CreatePairingRequest {
  platform: DevicePlatform;
  deviceId: string;
  deviceName?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
}

export interface PairingRequestResponse {
  userCode: string;
  deviceCode: string;
  expiresAt: string;
  pollIntervalSeconds: number;
}

export interface DeviceTokensResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export type PairingPollResponse =
  | { status: 'PENDING'; expiresAt: string; pollIntervalSeconds: number }
  | ({ status: 'APPROVED'; deviceSessionId: string } & DeviceTokensResponse);

export interface Transaction {
  id: string;
  reference: string;
  provider: PaymentProvider;
  status: TransactionStatus;
  amountInCents: number;
  currency: string;
  failureCode: string | null;
  createdAt: string;
  approvedAt: string | null;
  paymentMethod: { id: string; provider: PaymentProvider; type: PaymentMethodType; displayLabel: string };
}

export interface CreateTransactionRequest {
  idempotencyKey: string;
  paymentMethodId: string;
  amountInCents: number;
  currency: string;
  paymentPin?: string;
}
