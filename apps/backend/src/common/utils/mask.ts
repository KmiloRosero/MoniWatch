const VISIBLE_DIGITS = 4;

export function maskPhoneNumber(phoneNumber: string): string {
  const hiddenLength = Math.max(0, phoneNumber.length - VISIBLE_DIGITS);
  return `${'*'.repeat(hiddenLength)}${phoneNumber.slice(-VISIBLE_DIGITS)}`;
}

export function lastDigits(value: string): string {
  return value.slice(-VISIBLE_DIGITS);
}
