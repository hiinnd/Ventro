import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash, argon2id } from 'argon2';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('../dist/generated/prisma/client.js');
config({ path: resolve(process.cwd(), '../../.env'), quiet: true });
const url = new URL(process.env.DATABASE_URL ?? '');
const email = process.env.SEED_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_PASSWORD;
if (
  !['development', 'test'].includes(process.env.NODE_ENV ?? 'development') ||
  !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
)
  throw new Error('Seed is restricted to explicit local development/test databases.');
if (
  !email ||
  !/^[a-z0-9._+-]+@[a-z0-9.-]+\.test$/.test(email) ||
  !password ||
  password.length < 12 ||
  password.length > 128
)
  throw new Error(
    'Set a .test SEED_EMAIL and a 12–128 character SEED_PASSWORD, or run pnpm env:init --seed.',
  );
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url.href, options: '-c timezone=UTC' }),
});
try {
  const passwordHash = await hash(password, {
    type: argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
  await db.$transaction(async (tx) => {
    // Rerunning the seed never overwrites an existing password/profile or promotes an existing member.
    const user = await tx.user.upsert({
      where: { email },
      create: { email, name: 'Development Organizer', passwordHash, emailVerifiedAt: new Date() },
      update: {},
    });
    const organization = await tx.organization.upsert({
      where: { slug: 'ventro-development' },
      create: { slug: 'ventro-development', name: 'VENTRO Development' },
      update: {},
    });
    await tx.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
      create: { organizationId: organization.id, userId: user.id, role: 'OWNER' },
      update: {},
    });
    const exists = await tx.auditLog.findFirst({
      where: {
        actorId: user.id,
        organizationId: organization.id,
        action: 'DEVELOPMENT_SEED_CREATED',
      },
    });
    if (!exists)
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          organizationId: organization.id,
          action: 'DEVELOPMENT_SEED_CREATED',
        },
      });
  });
  console.log(
    'Development user, organization, membership, and audit seed are ready. Credentials are never printed.',
  );
} finally {
  await db.$disconnect();
}
