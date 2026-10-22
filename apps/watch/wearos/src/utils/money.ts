import { env } from '@/config/env';

const currencyFormatter = new Intl.NumberFormat(env.locale, {
  style: 'currency',
  currency: env.currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 20000 -> "$ 20.000" (es-CO). */
export function formatMoney(majorUnits: number): string {
  return currencyFormatter.format(majorUnits);
}

export function toMinorUnits(majorUnits: number): number {
  return Math.round(majorUnits * env.minorUnitsPerMajor);
}

export function toMajorUnits(minorUnits: number): number {
  return minorUnits / env.minorUnitsPerMajor;
}
