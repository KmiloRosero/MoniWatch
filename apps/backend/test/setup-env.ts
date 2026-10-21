// Loaded by Jest before any test file imports AppModule.
// Real environment variables win over .env, so the tests never touch the dev database or schema.
Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '3999', // Never listened on: supertest binds an ephemeral port.
  // Set by global-setup: a throwaway PostgreSQL schema for this run.
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  JWT_SECRET: 'test-jwt-secret-that-is-long-enough-1234567890',
  JWT_USER_ACCESS_TTL_SECONDS: '900',
  JWT_DEVICE_ACCESS_TTL_SECONDS: '600',
  USER_REFRESH_TOKEN_TTL_DAYS: '30',
  DEVICE_REFRESH_TOKEN_TTL_DAYS: '30',
  DEVICE_PAIRING_CODE_TTL_SECONDS: '300',
  DEVICE_PAIRING_CODE_LENGTH: '8',
  DEVICE_PAIRING_POLL_INTERVAL_SECONDS: '1',
  BCRYPT_SALT_ROUNDS: '10',
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  TOKEN_ENCRYPTION_KEY_ID: 'test-key',
  TOKEN_FINGERPRINT_SECRET: 'test-fingerprint-secret-long-enough-123456',
  PAYMENT_PIN_MAX_ATTEMPTS: '3',
  PAYMENT_PIN_LOCK_MINUTES: '15',
  TRANSACTION_EXPIRATION_MINUTES: '15',
  TRANSACTION_SWEEP_INTERVAL_SECONDS: '3600',
  NEQUI_MODE: 'SIMULATED',
  WOMPI_MODE: 'SIMULATED',
  WOMPI_STATUS_POLL_ATTEMPTS: '0',
  WOMPI_STATUS_POLL_INTERVAL_MS: '200',
  // Deterministic: every charge is approved unless a test forces a decline.
  PAYMENT_SIMULATOR_APPROVAL_RATE: '1',
  PAYMENT_SIMULATOR_LATENCY_MS: '0',
  WOMPI_EVENTS_SECRET: 'test_events_secret',
  THROTTLE_TTL_SECONDS: '60',
  THROTTLE_LIMIT: '10000',
  THROTTLE_SENSITIVE_LIMIT: '10000',
});
