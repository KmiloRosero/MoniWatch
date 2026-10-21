import { Prisma, UserStatus } from '@prisma/client';

export const BLOCKED_USER_STATUSES: readonly UserStatus[] = [UserStatus.SUSPENDED, UserStatus.CLOSED];

export const userPublicSelect = {
  id: true,
  email: true,
  phoneNumber: true,
  firstName: true,
  lastName: true,
  documentType: true,
  status: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export const deviceSessionPublicSelect = {
  id: true,
  platform: true,
  status: true,
  deviceId: true,
  deviceName: true,
  deviceModel: true,
  osVersion: true,
  appVersion: true,
  pairedAt: true,
  lastSeenAt: true,
  maxAmountPerTransaction: true,
  dailyLimitInCents: true,
  requirePinAboveInCents: true,
  defaultPaymentMethodId: true,
  revokedAt: true,
  createdAt: true,
} satisfies Prisma.DeviceSessionSelect;
