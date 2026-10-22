import { copy } from '@/i18n/es';
import type { PaymentMethod, PaymentProvider } from '@/services/api/types';
import { providerColors } from '@/theme/tokens';

export function providerName(provider: PaymentProvider): string {
  return copy.paymentMethod.providers[provider];
}

export function providerColor(provider: PaymentProvider): string {
  return providerColors[provider];
}

function cardBrandName(brand: string | null): string | null {
  if (!brand) return null;
  const upper = brand.toUpperCase();
  return copy.paymentMethod.cardBrands[upper] ?? upper;
}

/** Short identifier that fits under a chip label: "Visa •••• 4242", "Nequi •••• 4321". */
export function methodDetail(method: PaymentMethod): string {
  const lastFour = method.last4 ?? method.maskedPhoneNumber?.slice(-4) ?? null;
  const masked = lastFour ? `•••• ${lastFour}` : method.displayLabel;
  const brand = method.type === 'CARD' ? cardBrandName(method.cardBrand) : null;
  const prefix = method.alias ?? brand ?? providerName(method.provider);
  return prefix ? `${prefix} ${masked}` : masked;
}
