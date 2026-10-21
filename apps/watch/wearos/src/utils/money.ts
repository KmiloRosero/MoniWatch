import { env } from '@/config/env';

const THOUSAND = 1_000;

const currencyFormatter = new Intl.NumberFormat(env.locale, {
  style: 'currency',
  currency: env.currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat(env.locale, { maximumFractionDigits: 1 });

/** 20000 -> "$ 20.000" (es-CO). */
export function formatMoney(majorUnits: number): string {
  return currencyFormatter.format(majorUnits);
}

/** 20000 -> "20" so chips can read "20 mil"; null when the amount is not a whole thousand. */
export function formatThousands(majorUnits: number): string | null {
  return majorUnits % THOUSAND === 0 ? numberFormatter.format(majorUnits / THOUSAND) : null;
}

export function toMinorUnits(majorUnits: number): number {
  return Math.round(majorUnits * env.minorUnitsPerMajor);
}

export function toMajorUnits(minorUnits: number): number {
  return minorUnits / env.minorUnitsPerMajor;
}
