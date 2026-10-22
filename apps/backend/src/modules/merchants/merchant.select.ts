import { Prisma } from '@prisma/client';

/** What payers see: enough to recognise who they are paying. Never credentials. */
export const merchantPublicSelect = {
  id: true,
  name: true,
  code: true,
  category: true,
  logoUrl: true,
} satisfies Prisma.MerchantSelect;

/** What the owner sees about its own merchant. The public key is not secret; the rest stays encrypted. */
export const merchantOwnerSelect = {
  ...merchantPublicSelect,
  status: true,
  wompiEnvironment: true,
  wompiPublicKey: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MerchantSelect;
