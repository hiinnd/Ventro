import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import {
  ForbiddenException,
  type INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json } from 'express';
import type { Environment } from './environment';

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<Environment, true>);
  const origins = config.get('WEB_ORIGINS', { infer: true });
  app.use((request: Request & { id?: string }, response: Response, next: NextFunction) => {
    request.id = randomUUID();
    response.setHeader('X-Request-Id', request.id);
    next();
  });
  app.use(helmet());
  app.use((request: Request, response: Response, next: NextFunction) => { if (request.path.startsWith('/api/v1/auth')) response.setHeader('Cache-Control', 'no-store'); next(); });
  app.use(json({ limit: '16kb', strict: true }));
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableCors({
    origin: (
      value: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!value || origins.includes(value)) callback(null, true);
      else callback(new ForbiddenException('Origin is not allowed'), false);
    },
    credentials: false,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Ventro-CSRF'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      validationError: { target: false, value: false },
    }),
  );
  app.enableShutdownHooks();
  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('VENTRO API')
        .setDescription(
          'VENTRO platform API. Operational health endpoints are version neutral; domain APIs use /api/v1.',
        )
        .setVersion('1.0')
        .addCookieAuth('ventro_session', { type: 'apiKey', in: 'cookie', description: 'Opaque HTTP-only session. Production uses __Host-ventro_session. Mutations require an allowed Origin, JSON, and X-Ventro-CSRF: 1.' }, 'ventro-session')
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/openapi.json' });
  }
}
