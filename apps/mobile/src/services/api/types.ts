// Mirrors the backend contracts (apps/backend). Move to packages/shared-types when it exists.

export type PaymentProvider = 'NEQUI' | 'WOMPI';
export type PaymentMethodType = 'WALLET' | 'CARD' | 'BANK_TRANSFER';
export type PaymentMethodStatus =
  | 'PENDING_VALIDATION'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REVOKED'
  | 'FAILED_VALIDATION';
export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type DocumentType = 'CC' | 'CE' | 'NIT' | 'PP' | 'TI';
export type DevicePlatform = 'WEAR_OS' | 'WATCH_OS';
export type DeviceSessionStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'APPROVED'
  | 'DECLINED'
  | 'FAILED'
  | 'VOIDED'
  | 'EXPIRED'
  | 'REFUNDED';
export type TransactionChannel = 'WATCH' | 'MOBILE' | 'WEB';

export interface UserProfile {
  id: string;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  status: UserStatus;
  createdAt: string;
  hasPaymentPin?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  phoneNumber: string;
  password: string;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
}

export interface SessionTokens {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface AuthResponse extends SessionTokens {
  user: UserProfile;
}

export interface SetPaymentPinRequest {
  currentPassword: string;
  pin: string;
}

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
  cardExpMonth: number | null;
  cardExpYear: number | null;
  maskedPhoneNumber: string | null;
  tokenExpiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentMethodRequest {
  provider: PaymentProvider;
  type: PaymentMethodType;
  providerToken: string;
  alias?: string;
  isDefault?: boolean;
  walletPhoneNumber?: string;
  last4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  acceptanceToken?: string;
  personalDataAuthToken?: string;
}

/** Served by the backend so the app never ships payment configuration. */
export interface WompiCheckout {
  mode: 'SIMULATED' | 'LIVE';
  publicKey: string | null;
  apiUrl: string | null;
  acceptance: {
    acceptanceToken: string;
    termsUrl: string;
    personalDataAuthToken: string;
    personalDataUrl: string;
  } | null;
}

export interface ApprovedPairing {
  platform: DevicePlatform;
  deviceName: string | null;
  deviceModel: string | null;
  approvedAt: string;
}

export interface DeviceSession {
  id: string;
  platform: DevicePlatform;
  status: DeviceSessionStatus;
  deviceId: string;
  deviceName: string | null;
  deviceModel: string | null;
  osVersion: string | null;
  appVersion: string | null;
  pairedAt: string | null;
  lastSeenAt: string | null;
  maxAmountPerTransaction: number | null;
  dailyLimitInCents: number | null;
  requirePinAboveInCents: number | null;
  defaultPaymentMethodId: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** Omitted fields stay unchanged; null clears a limit. */
export interface UpdateDeviceSettingsRequest {
  deviceName?: string;
  maxAmountPerTransaction?: number | null;
  dailyLimitInCents?: number | null;
  requirePinAboveInCents?: number | null;
  defaultPaymentMethodId?: string | null;
}

export interface Transaction {
  id: string;
  reference: string;
  provider: PaymentProvider;
  channel: TransactionChannel;
  status: TransactionStatus;
  amountInCents: number;
  feeInCents: number;
  currency: string;
  description: string | null;
  failureCode: string | null;
  createdAt: string;
  approvedAt: string | null;
  paymentMethod: { id: string; provider: PaymentProvider; type: PaymentMethodType; displayLabel: string };
  merchant: { id: string; name: string; logoUrl: string | null } | null;
}

export interface TransactionsPage {
  items: Transaction[];
  nextCursor: string | null;
}
