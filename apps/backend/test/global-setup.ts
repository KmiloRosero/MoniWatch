import { execSync } from 'child_process';

/** Same server as local development (docker compose), isolated in a throwaway schema per run. */
const DEFAULT_TEST_DATABASE_BASE_URL = 'postgresql://moniwatch:moniwatch@localhost:5433/moniwatch';

export const TEST_SCHEMA_PREFIX = 'test_';

/**
 * Creates a fresh schema (test_<timestamp>) with every migration applied.
 * Workers inherit TEST_DATABASE_URL; global-teardown drops the schema afterwards.
 */
export default function globalSetup(): void {
  const baseUrl = process.env.TEST_DATABASE_BASE_URL ?? DEFAULT_TEST_DATABASE_BASE_URL;
  const schema = `${TEST_SCHEMA_PREFIX}${Date.now()}`;
  const url = `${baseUrl}?schema=${schema}`;

  process.env.TEST_DATABASE_URL = url;
  process.env.TEST_DATABASE_SCHEMA = schema;

  execSync('npx prisma migrate deploy', { stdio: 'ignore', env: { ...process.env, DATABASE_URL: url } });
}
