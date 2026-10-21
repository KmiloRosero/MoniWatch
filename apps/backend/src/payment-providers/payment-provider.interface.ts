import { Currency, PaymentMethodStatus, PaymentMethodType, PaymentProvider } from '@prisma/client';

/** Plaintext credentials stored encrypted inside PaymentMethod.encryptedToken. */
export interface ProviderCredentials {
  providerToken: string;
  walletPhoneNumber: string | null;
}

export interface ProviderCustomer {
  email: string;
  phoneNumber: string;
  fullName: string;
}

/** Legal acceptance the end user gave in the app (Wompi: terms + personal data authorization). */
export interface ProviderAcceptance {
  acceptanceToken: string;
  personalDataAuthToken: string;
}

export interface CreatePaymentSourceInput {
  type: PaymentMethodType;
  credentials: ProviderCredentials;
  customer: ProviderCustomer;
  acceptance: ProviderAcceptance | null;
}

export interface PaymentSourceResult {
  providerSourceId: string;
  providerCustomerId: string | null;
  status: PaymentMethodStatus;
  tokenExpiresAt: Date | null;
  metadata: Record<string, string | number | boolean | null>;
}

export interface ChargeInput {
  reference: string;
  amountInCents: number;
  currency: Currency;
  description: string | null;
  credentials: ProviderCredentials;
  providerSourceId: string | null;
  customer: ProviderCustomer;
}

export enum ChargeOutcome {
  Approved = 'APPROVED',
  Declined = 'DECLINED',
  Error = 'ERROR',
  /** The provider accepted the charge but has no final answer yet (webhook or reconciliation will close it). */
  Pending = 'PENDING',
}

export interface ChargeResult {
  outcome: ChargeOutcome;
  providerTransactionId: string | null;
  providerStatus: string;
  failureCode: string | null;
  failureReason: string | null;
  rawResponse: Record<string, string | number | boolean | null>;
}

/** What the phone needs to tokenize a card and show the provider's legal terms. */
export interface CheckoutConfig {
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

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  readonly supportedMethodTypes: readonly PaymentMethodType[];
  createPaymentSource(input: CreatePaymentSourceInput): Promise<PaymentSourceResult>;
  charge(input: ChargeInput): Promise<ChargeResult>;
  /** Asks the provider for the current state of a charge (reconciliation). */
  getChargeStatus?(providerTransactionId: string): Promise<ChargeResult>;
  getCheckoutConfig?(): Promise<CheckoutConfig>;
}
