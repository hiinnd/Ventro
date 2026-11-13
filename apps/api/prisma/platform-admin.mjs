import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const requireApi = createRequire(import.meta.url);
requireApi('dotenv').config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  quiet: true,
});
const { ConfigService } = requireApi('@nestjs/config');
const { validateEnvironment } = requireApi('../dist/config/environment.js');
const { PrismaService } = requireApi('../dist/database/prisma.service.js');
const settings = validateEnvironment(process.env);
const args = process.argv.slice(2).filter((value) => value !== '--');
const address = args[1]?.trim().toLowerCase();
const role = args[0] === '--grant' ? 'PLATFORM_ADMIN' : args[0] === '--revoke' ? 'USER' : undefined;
if (!role || args.length !== 2 || !address)
  throw new Error('Usage: pnpm platform:admin --grant|--revoke <existing-verified-email>');
if (
  settings.NODE_ENV === 'production' ||
  !['127.0.0.1', 'localhost'].includes(new URL(settings.DATABASE_URL).hostname)
)
  throw new Error(
    'This operator tool is limited to a local development database. Production provisioning needs a reviewed operator procedure.',
  );
const db = new PrismaService(new ConfigService(settings));
try {
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email: address } });
    if (!user || user.status !== 'ACTIVE' || !user.emailVerifiedAt)
      throw new Error('An active verified account is required');
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id}::uuid FOR UPDATE`;
    await tx.user.update({ where: { id: user.id }, data: { platformRole: role } });
    await tx.auditLog.create({
      data: {
        action: 'PLATFORM_ROLE_CHANGED',
        metadata: { userId: user.id, role, source: 'LOCAL_OPERATOR_TOOL' },
      },
    });
  });
  console.log('Local platform role updated and audited. No credentials were created.');
} finally {
  await db.onModuleDestroy();
}
