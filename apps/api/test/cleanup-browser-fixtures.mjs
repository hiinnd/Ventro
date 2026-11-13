import { createRequire } from 'node:module';
import { resolve } from 'node:path';
// Playwright may compile helpers as CommonJS; keep the API runtime anchor independent of import.meta.
const loadCompiled = createRequire(resolve('../api/package.json'));
const { ConfigService } = loadCompiled('@nestjs/config');
const { PrismaService } = loadCompiled('./dist/database/prisma.service.js');
const { validateEnvironment } = loadCompiled('./dist/config/environment.js');
const { privateIdentifier } = loadCompiled('./dist/auth/crypto.js');

// Node-only test utility. There is deliberately no cleanup API endpoint.
export async function cleanupAuthFixtures(emails, prefix) {
  if (!/^auth-ui-[a-f0-9]{32}$/.test(prefix)) throw new Error('Invalid fixture prefix');
  const settings = validateEnvironment(process.env);
  if (
    settings.NODE_ENV === 'production' ||
    !['localhost', '127.0.0.1'].includes(new URL(settings.DATABASE_URL).hostname)
  )
    throw new Error('Fixture cleanup requires a local development database');
  const ownedEmails = emails.filter(
    (email) => email.startsWith(prefix + '-') && email.endsWith('@example.test'),
  );
  if (ownedEmails.length !== emails.length) throw new Error('Fixture ownership mismatch');
  const db = new PrismaService(new ConfigService(settings));
  try {
    const owned = await db.user.findMany({
      where: { email: { in: ownedEmails } },
      select: { id: true },
    });
    const ids = owned.map((user) => user.id);
    for (let attempt = 0; attempt < 40; attempt++) {
      if (
        !(await db.emailOutbox.count({
          where: { userId: { in: ids }, status: { in: ['PENDING', 'PROCESSING'] } },
        }))
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await db.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: { in: ids } },
          ...ownedEmails.map((email) => ({
            metadata: {
              path: ['accountKey'],
              equals: privateIdentifier(settings.AUTH_SECRET, email),
            },
          })),
        ],
      },
    });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  } finally {
    await db.onModuleDestroy();
  }
}
