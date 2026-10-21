import { Prisma, TransactionStatus } from '@prisma/client';

export enum TransitionSource {
  Api = 'API',
  Provider = 'PROVIDER',
  Webhook = 'WEBHOOK',
  ExpirationSweep = 'EXPIRATION_SWEEP',
  Reconciliation = 'RECONCILIATION',
}

/** Statuses a transaction can still leave; everything else is final. */
export const OPEN_STATUSES: TransactionStatus[] = [TransactionStatus.PENDING, TransactionStatus.PROCESSING];

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Device daily limits use a rolling 24h window, independent of server timezone. */
export const DEVICE_LIMIT_WINDOW_MS = 86_400_000;

/** Statuses that consume a device spending limit. */
export const LIMIT_COUNTED_STATUSES: TransactionStatus[] = [
  TransactionStatus.PENDING,
  TransactionStatus.PROCESSING,
  TransactionStatus.APPROVED,
];

export const transactionPublicSelect = {
  id: true,
  reference: true,
  provider: true,
  channel: true,
  status: true,
  amountInCents: true,
  feeInCents: true,
  currency: true,
  description: true,
  providerTransactionId: true,
  failureCode: true,
  failureReason: true,
  deviceSessionId: true,
  processedAt: true,
  approvedAt: true,
  failedAt: true,
  createdAt: true,
  updatedAt: true,
  paymentMethod: { select: { id: true, provider: true, type: true, displayLabel: true } },
  merchant: { select: { id: true, name: true, logoUrl: true } },
} satisfies Prisma.TransactionSelect;

export type PublicTransaction = Prisma.TransactionGetPayload<{ select: typeof transactionPublicSelect }>;
