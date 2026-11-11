import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { validateEnvironment, type Environment } from './config/environment';

@Module({
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(process.cwd(), '../../.env'),
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => ({
        forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          genReqId: (request, response) => {
            const id = String(request.id ?? randomUUID());
            response.setHeader('X-Request-Id', id);
            return id;
          },
          redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          serializers: {
            req: (request: { id: string; method: string; url: string }) => ({
              id: request.id,
              method: request.method,
              url: request.url.split('?')[0],
            }),
          },
        },
      }),
    }),
    HealthModule,
  ],
})
export class AppModule {}
