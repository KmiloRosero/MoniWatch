import type { PaymentProvider } from '@/services/api/types';

/** What the user picked on the home screen; travels through the whole payment flow. */
export interface PaymentDraft {
  paymentMethodId: string;
  provider: PaymentProvider;
  methodDetail: string;
}

export type WatchStackParamList = {
  Home: undefined;
  Amount: PaymentDraft;
  Pin: PaymentDraft & { amountInCents: number };
  Processing: PaymentDraft & { amountInCents: number; paymentPin?: string };
};
