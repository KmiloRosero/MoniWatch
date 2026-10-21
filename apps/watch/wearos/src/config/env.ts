function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

function positiveInteger(name: string, value: string | undefined): number {
  const parsed = Number(required(name, value));
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

/** "10000,20000,50000" -> [10000, 20000, 50000] (major currency units). */
function parseQuickAmounts(value: string | undefined): number[] {
  const amounts = required('EXPO_PUBLIC_QUICK_AMOUNTS', value)
    .split(',')
    .map((part) => Number(part.trim()));
  if (amounts.length === 0 || amounts.some((amount) => !Number.isInteger(amount) || amount <= 0)) {
    throw new Error('EXPO_PUBLIC_QUICK_AMOUNTS must be a comma-separated list of positive integers');
  }
  return amounts;
}

// Expo only inlines EXPO_PUBLIC_* variables accessed with static dot notation.
export const env = {
  apiUrl: required('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL).replace(/\/+$/, ''),
  locale: required('EXPO_PUBLIC_LOCALE', process.env.EXPO_PUBLIC_LOCALE),
  currency: required('EXPO_PUBLIC_CURRENCY', process.env.EXPO_PUBLIC_CURRENCY),
  /** Minor units per major unit (COP: 100 cents per peso, as the backend stores amountInCents). */
  minorUnitsPerMajor: positiveInteger(
    'EXPO_PUBLIC_CURRENCY_MINOR_UNITS_PER_MAJOR',
    process.env.EXPO_PUBLIC_CURRENCY_MINOR_UNITS_PER_MAJOR,
  ),
  quickAmounts: parseQuickAmounts(process.env.EXPO_PUBLIC_QUICK_AMOUNTS),
  /** Largest amount (major units) the keypad accepts before the device limit applies. */
  maxKeypadAmount: positiveInteger('EXPO_PUBLIC_MAX_KEYPAD_AMOUNT', process.env.EXPO_PUBLIC_MAX_KEYPAD_AMOUNT),
} as const;
