export type PaymentGatewayMode = 'SIMULATED' | 'LIVE';

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

function parseGatewayMode(value: string | undefined): PaymentGatewayMode {
  const mode = required('EXPO_PUBLIC_PAYMENT_GATEWAY_MODE', value);
  if (mode !== 'SIMULATED' && mode !== 'LIVE') {
    throw new Error('EXPO_PUBLIC_PAYMENT_GATEWAY_MODE must be SIMULATED or LIVE');
  }
  return mode;
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
  paymentGatewayMode: parseGatewayMode(process.env.EXPO_PUBLIC_PAYMENT_GATEWAY_MODE),
  wompiApiUrl: (process.env.EXPO_PUBLIC_WOMPI_API_URL ?? '').replace(/\/+$/, ''),
  wompiPublicKey: process.env.EXPO_PUBLIC_WOMPI_PUBLIC_KEY ?? '',
  locale: required('EXPO_PUBLIC_LOCALE', process.env.EXPO_PUBLIC_LOCALE),
  currency: required('EXPO_PUBLIC_CURRENCY', process.env.EXPO_PUBLIC_CURRENCY),
  minorUnitsPerMajor: positiveInteger(
    'EXPO_PUBLIC_CURRENCY_MINOR_UNITS_PER_MAJOR',
    process.env.EXPO_PUBLIC_CURRENCY_MINOR_UNITS_PER_MAJOR,
  ),
} as const;
