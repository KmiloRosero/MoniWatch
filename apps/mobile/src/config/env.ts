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

// Expo only inlines EXPO_PUBLIC_* variables accessed with static dot notation.
export const env = {
  apiUrl: required('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL).replace(/\/+$/, ''),
  defaultCountryCode: required('EXPO_PUBLIC_DEFAULT_COUNTRY_CODE', process.env.EXPO_PUBLIC_DEFAULT_COUNTRY_CODE),
  locale: required('EXPO_PUBLIC_LOCALE', process.env.EXPO_PUBLIC_LOCALE),
  currency: required('EXPO_PUBLIC_CURRENCY', process.env.EXPO_PUBLIC_CURRENCY),
  minorUnitsPerMajor: positiveInteger(
    'EXPO_PUBLIC_CURRENCY_MINOR_UNITS_PER_MAJOR',
    process.env.EXPO_PUBLIC_CURRENCY_MINOR_UNITS_PER_MAJOR,
  ),
} as const;
