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

export interface CreatePaymentSourceInput {
  type: PaymentMethodType;
  credentials: ProviderCredentials;
  customer: ProviderCustomer;
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
}

export interface ChargeResult {
  outcome: ChargeOutcome;
  providerTransactionId: string | null;
  providerStatus: string;
  failureCode: string | null;
  failureReason: string | null;
  rawResponse: Record<string, string | number | boolean | null>;
}

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  readonly supportedMethodTypes: readonly PaymentMethodType[];
  createPaymentSource(input: CreatePaymentSourceInput): Promise<PaymentSourceResult>;
  charge(input: ChargeInput): Promise<ChargeResult>;
}
