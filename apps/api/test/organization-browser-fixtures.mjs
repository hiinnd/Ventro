import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const fromApi = createRequire(resolve('../api/package.json'));
const { ConfigService } = fromApi('@nestjs/config');
const { validateEnvironment } = fromApi('./dist/config/environment.js');
const { PrismaService } = fromApi('./dist/database/prisma.service.js');
const { privateIdentifier } = fromApi('./dist/auth/crypto.js');
const { hash, argon2id } = fromApi('argon2');
function local(prefix) {
  if (!/^org-ui-[a-f0-9]{32}$/.test(prefix)) throw new Error('Invalid fixture ownership');
  fromApi('dotenv').config({ path: resolve('../../.env'), quiet: true });
  const env = validateEnvironment(process.env);
  if (
    env.NODE_ENV === 'production' ||
    !['localhost', '127.0.0.1'].includes(new URL(env.DATABASE_URL).hostname)
  )
    throw new Error('Local development only');
  return { db: new PrismaService(new ConfigService(env)), env };
}
export async function setupOrganizationUsers(prefix, password) {
  const { db } = local(prefix);
  try {
    const passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
    for (const kind of ['owner', 'member', 'admin'])
      await db.user.create({
        data: {
          email: prefix + '-' + kind + '@example.test',
          name: 'Browser Organization ' + kind,
          passwordHash,
          emailVerifiedAt: new Date(),
          platformRole: kind === 'admin' ? 'PLATFORM_ADMIN' : 'USER',
        },
      });
  } finally {
    await db.onModuleDestroy();
  }
}
export async function expireOrganizationInvitation(prefix, id) {
  const { db } = local(prefix);
  try {
    const row = await db.organizationInvitation.findFirst({
      where: {
        id,
        organization: { slug: { startsWith: prefix + '-' } },
        email: { startsWith: prefix + '-' },
        status: 'PENDING',
      },
    });
    if (!row) throw new Error('Invitation fixture ownership mismatch');
    await db.organizationInvitation.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
  } finally {
    await db.onModuleDestroy();
  }
}
export async function cleanupOrganizationUsers(prefix) {
  const { db, env } = local(prefix);
  try {
    const users = await db.user.findMany({
      where: { email: { startsWith: prefix + '-', endsWith: '@example.test' } },
      select: { id: true, email: true },
    });
    if (
      users.some(
        (user) =>
          !['owner', 'member', 'admin'].some(
            (kind) => user.email === prefix + '-' + kind + '@example.test',
          ),
      )
    )
      throw new Error('Unexpected user fixture');
    const ids = users.map((user) => user.id);
    const orgs = await db.organization.findMany({
      where: { slug: { startsWith: prefix + '-' } },
      select: {
        id: true,
        members: { select: { userId: true } },
        invitations: { select: { email: true } },
      },
    });
    if (
      orgs.some(
        (org) =>
          org.members.some((member) => !ids.includes(member.userId)) ||
          org.invitations.some(
            (invite) =>
              !invite.email.startsWith(prefix + '-') || !invite.email.endsWith('@example.test'),
          ),
      )
    )
      throw new Error('Unexpected organization ownership');
    const orgIds = orgs.map((org) => org.id);
    for (let i = 0; i < 40; i++) {
      if (
        !(await db.emailOutbox.count({
          where: {
            invitation: { organizationId: { in: orgIds } },
            status: { in: ['PENDING', 'PROCESSING'] },
          },
        }))
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await db.$transaction(async (tx) => {
      await tx.auditLog.deleteMany({
        where: {
          OR: [
            { organizationId: { in: orgIds } },
            { actorId: { in: ids } },
            ...users.map((user) => ({
              metadata: {
                path: ['accountKey'],
                equals: privateIdentifier(env.AUTH_SECRET, user.email),
              },
            })),
          ],
        },
      });
      await tx.organization.deleteMany({ where: { id: { in: orgIds } } });
      await tx.user.deleteMany({ where: { id: { in: ids } } });
    });
  } finally {
    await db.onModuleDestroy();
  }
}
