import { env } from '@/config/env';
import { onlyDigits } from './card';

/** Nequi accounts are Colombian mobile numbers: 10 digits starting with 3. */
export const LOCAL_MOBILE_LENGTH = 10;
const LOCAL_MOBILE_PATTERN = /^3\d{9}$/;

export function isValidLocalMobile(digits: string): boolean {
  return LOCAL_MOBILE_PATTERN.test(digits);
}

/** "3001234567" -> "300 123 4567" */
export function formatLocalMobile(digits: string): string {
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, LOCAL_MOBILE_LENGTH)]
    .filter(Boolean)
    .join(' ');
}

export function toE164(localNumber: string): string {
  return `+${env.defaultCountryCode}${onlyDigits(localNumber)}`;
}
