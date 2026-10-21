import { env } from '@/config/env';

const currencyFormatter = new Intl.NumberFormat(env.locale, {
  style: 'currency',
  currency: env.currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const groupedNumberFormatter = new Intl.NumberFormat(env.locale, { maximumFractionDigits: 0 });

const dateTimeFormatter = new Intl.DateTimeFormat(env.locale, {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

/** Backend amounts are in minor units (amountInCents). */
export function formatMinorUnits(minorUnits: number): string {
  return currencyFormatter.format(minorUnits / env.minorUnitsPerMajor);
}

export function toMinorUnits(majorUnits: number): number {
  return Math.round(majorUnits * env.minorUnitsPerMajor);
}

export function toMajorUnits(minorUnits: number): number {
  return minorUnits / env.minorUnitsPerMajor;
}

/** "500000" -> "500.000" for money inputs; empty stays empty. */
export function formatAmountInput(digits: string): string {
  return digits ? groupedNumberFormatter.format(Number(digits)) : '';
}

export function formatDateTime(isoDate: string): string {
  return dateTimeFormatter.format(new Date(isoDate));
}
