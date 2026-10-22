import type { PaymentProvider } from '@/services/api/types';

/** Who is being paid; chosen first on the home screen. */
export interface PayeeRef {
  merchantId: string;
  merchantName: string;
}

/** Payee plus the method that pays it; travels through the whole payment flow. */
export interface PaymentDraft extends PayeeRef {
  paymentMethodId: string;
  provider: PaymentProvider;
  methodDetail: string;
}

export type ChargeDraft = PaymentDraft & { amountInCents: number };

export type WatchStackParamList = {
  Home: undefined;
  Method: PayeeRef;
  Amount: PaymentDraft;
  Confirm: ChargeDraft;
  Pin: ChargeDraft;
  Processing: ChargeDraft & { paymentPin?: string };
};
