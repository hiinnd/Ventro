import { resolve } from 'node:path';
import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Prisma is used from both the root workspace scripts and apps/api. Keep the
// local connection source independent of the caller's working directory.
config({ path: resolve(import.meta.dirname, '../../.env'), quiet: true });
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'node prisma/seed.mjs' },
  datasource: { url: env('DATABASE_URL') },
});
