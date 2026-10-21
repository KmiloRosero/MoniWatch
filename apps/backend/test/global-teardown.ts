import { PrismaClient } from '@prisma/client';
import { TEST_SCHEMA_PREFIX } from './global-setup';

/** Drops the schema created by global-setup. Refuses anything that is not a test schema. */
export default async function globalTeardown(): Promise<void> {
  const schema = process.env.TEST_DATABASE_SCHEMA;
  const url = process.env.TEST_DATABASE_URL;
  if (!schema || !url || !/^test_\d+$/.test(schema) || !schema.startsWith(TEST_SCHEMA_PREFIX)) return;

  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await prisma.$disconnect();
  }
}
