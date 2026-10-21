import { copy } from '@/i18n/es';
import type { PaymentMethod } from '@/services/api/types';
import { CardTokenizationError } from '@/services/wompi/card-tokenizer';
import { toUserMessage } from '@/services/api/error-messages';

const t = copy.paymentMethod;

export function cardBrandName(brand: string | null): string {
  if (!brand) return t.types.CARD;
  const upper = brand.toUpperCase();
  return t.cardBrands[upper] ?? upper.charAt(0) + upper.slice(1).toLowerCase();
}

export function paymentMethodTitle(method: PaymentMethod): string {
  if (method.alias) return method.alias;
  if (method.type === 'CARD') return t.cardTitle(cardBrandName(method.cardBrand));
  if (method.provider === 'NEQUI') return t.nequiTitle;
  return `${t.providers[method.provider]} · ${t.types[method.type]}`;
}

export function paymentMethodDetail(method: PaymentMethod): string {
  const lastFour = method.last4 ?? method.maskedPhoneNumber?.slice(-4);
  const masked = lastFour ? `•••• ${lastFour}` : method.displayLabel;

  if (method.type === 'CARD' && method.cardExpMonth && method.cardExpYear) {
    const month = method.cardExpMonth.toString().padStart(2, '0');
    const year = (method.cardExpYear % 100).toString().padStart(2, '0');
    return `${masked}  ·  ${t.expires(month, year)}`;
  }
  return masked;
}

export function linkErrorMessage(error: unknown): string {
  const errors = copy.addPaymentMethod.errors;
  if (error instanceof CardTokenizationError) return errors.tokenization;
  return toUserMessage(error, { 400: errors.invalidData, 409: errors.alreadyLinked, 422: errors.invalidData });
}
