import { createRequire } from 'node:module';
const compiled = createRequire(import.meta.url);
// Run the compiled application outside Vitest's VM/worker instrumentation.
// This is never a production entry point or a cleanup/control HTTP endpoint.
const database = new URL(process.env.DATABASE_URL);
if (
  process.env.NODE_ENV !== 'test' ||
  !['127.0.0.1', 'localhost'].includes(database.hostname) ||
  !/^\/ventro_org_it_[a-f0-9]{32}$/.test(database.pathname)
)
  throw new Error('Isolated local organization test database required');
const { NestFactory } = compiled('@nestjs/core');
const { Logger } = compiled('nestjs-pino');
const { AppModule } = compiled('../dist/app.module.js');
const { configureApp } = compiled('../dist/config/configure-app.js');
let app;
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await app?.close();
  process.exit(0);
}
process.on('message', (value) => {
  if (value === 'stop') void stop();
});
process.once('disconnect', () => void stop());
process.once('SIGTERM', () => void stop());
try {
  app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  process.send?.({ port: address.port });
} catch {
  process.stderr.write('Isolated integration API failed to start.\n');
  process.exit(1);
}
