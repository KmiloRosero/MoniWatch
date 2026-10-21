import { execSync } from 'child_process';
import { rmSync } from 'fs';
import { join } from 'path';

/** Throwaway database used only by the e2e suite (never the dev or prod database). */
const TEST_DATABASE_FILE = 'test.db';
const SQLITE_SIDE_FILES = ['', '-journal', '-wal', '-shm'];

/** Builds a fresh test.db from the migrations once per run. */
export default function globalSetup(): void {
  const prismaDir = join(__dirname, '..', 'prisma');
  for (const suffix of SQLITE_SIDE_FILES) {
    rmSync(join(prismaDir, `${TEST_DATABASE_FILE}${suffix}`), { force: true });
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: `file:./${TEST_DATABASE_FILE}` },
  });
}
