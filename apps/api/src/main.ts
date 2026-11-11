import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './config/configure-app';
import type { Environment } from './config/environment';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApp(app);
  const config = app.get(ConfigService<Environment, true>);
  await app.listen(
    config.get('API_PORT', { infer: true }),
    config.get('API_HOST', { infer: true }),
  );
  app.get(Logger).log('VENTRO API is listening');
}
void bootstrap().catch(() => {
  // Do not print startup exceptions that could contain connection credentials.
  process.stderr.write(
    'VENTRO API startup failed. Check validated configuration and port availability.\n',
  );
  process.exitCode = 1;
});
