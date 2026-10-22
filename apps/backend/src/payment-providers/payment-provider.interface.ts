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

/**
 * A merchant's account at the gateway (decrypted, in memory only). Charges made with it
 * settle directly into that merchant's account.
 */
export interface MerchantGatewayAccount {
  merchantId: string;
  apiUrl: string;
  publicKey: string;
  privateKey: string;
  integritySecret: string;
  eventsSecret: string;
}

/** What the gateway says about an account when a merchant registers it. */
export interface GatewayAccountInfo {
  name: string;
  active: boolean;
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
  /** Required by gateways that tokenize per merchant (Wompi). */
  account: MerchantGatewayAccount | null;
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
  account: MerchantGatewayAccount | null;
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
  getChargeStatus?(providerTransactionId: string, account: MerchantGatewayAccount | null): Promise<ChargeResult>;
  getCheckoutConfig?(account: MerchantGatewayAccount): Promise<CheckoutConfig>;
  /** Checks a merchant's keys against the gateway before they are stored. */
  verifyAccount?(account: Omit<MerchantGatewayAccount, 'merchantId'>): Promise<GatewayAccountInfo>;
}
