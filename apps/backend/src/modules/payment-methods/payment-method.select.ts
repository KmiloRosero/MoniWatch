import { Prisma } from '@prisma/client';

/** Fields safe to expose to the mobile app and the watch. Encrypted token data is never selected. */
export const paymentMethodPublicSelect = {
  id: true,
  provider: true,
  type: true,
  status: true,
  alias: true,
  isDefault: true,
  displayLabel: true,
  last4: true,
  cardBrand: true,
  cardExpMonth: true,
  cardExpYear: true,
  maskedPhoneNumber: true,
  tokenExpiresAt: true,
  lastUsedAt: true,
  createdAt: true,
  updatedAt: true,
  merchant: { select: { id: true, name: true, code: true } },
} satisfies Prisma.PaymentMethodSelect;
