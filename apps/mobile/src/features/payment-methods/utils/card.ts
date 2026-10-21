export type CardBrand = 'VISA' | 'MASTERCARD' | 'AMEX' | 'DINERS';

const BRAND_PATTERNS: ReadonlyArray<{ brand: CardBrand; pattern: RegExp }> = [
  { brand: 'AMEX', pattern: /^3[47]/ },
  { brand: 'DINERS', pattern: /^3(0[0-5]|[68])/ },
  { brand: 'MASTERCARD', pattern: /^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/ },
  { brand: 'VISA', pattern: /^4/ },
];

export const MIN_CARD_LENGTH = 13;
export const MAX_CARD_LENGTH = 19;

export const onlyDigits = (value: string) => value.replace(/\D/g, '');

export function detectCardBrand(digits: string): CardBrand | null {
  return BRAND_PATTERNS.find(({ pattern }) => pattern.test(digits))?.brand ?? null;
}

export function cvcLength(brand: CardBrand | null): number {
  return brand === 'AMEX' ? 4 : 3;
}

/** "4242424242424242" -> "4242 4242 4242 4242"; Amex uses 4-6-5 grouping. */
export function formatCardNumber(digits: string): string {
  if (detectCardBrand(digits) === 'AMEX') {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(' ');
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function isValidLuhn(digits: string): boolean {
  if (digits.length < MIN_CARD_LENGTH || digits.length > MAX_CARD_LENGTH) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Keeps the expiry input as "MM/AA" while typing. */
export function formatExpiryInput(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export function parseExpiry(value: string): { month: number; year: number } | null {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return null;

  const month = Number(match[1]);
  if (month < 1 || month > 12) return null;

  const currentCentury = Math.floor(new Date().getFullYear() / 100) * 100;
  return { month, year: currentCentury + Number(match[2]) };
}

/** Cards are valid through the last day of their expiry month. */
export function isExpiryInFuture(month: number, year: number): boolean {
  return new Date(year, month, 1) > new Date();
}
