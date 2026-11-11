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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
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
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/openapi.json' });
  }
}
