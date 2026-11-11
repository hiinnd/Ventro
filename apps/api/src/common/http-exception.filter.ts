import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import { PinoLogger } from 'nestjs-pino';
import type { Request, Response } from 'express';
import type { ApiErrorResponse } from '@ventro/types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { id?: string }>();
    const response = http.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    let message: string | string[] = status >= 500 ? 'Internal server error' : 'Request failed';
    if (status < 500) {
      if (typeof body === 'string') message = body;
      else if (body && typeof body === 'object' && 'message' in body) {
        const candidate = body.message;
        if (
          typeof candidate === 'string' ||
          (Array.isArray(candidate) && candidate.every((item) => typeof item === 'string'))
        )
          message = candidate;
      }
    }
    if (status === HttpStatus.NOT_FOUND) message = 'Resource not found';
    if (status >= 500)
      this.logger.error({ err: exception, requestId: request.id }, 'Request failed');
    const payload: ApiErrorResponse = {
      statusCode: status,
      error: STATUS_CODES[status] ?? 'Error',
      message,
      timestamp: new Date().toISOString(),
      path: (request.originalUrl ?? request.url).split('?')[0] ?? '/',
      requestId: String(request.id ?? response.getHeader('x-request-id') ?? 'unavailable'),
    };
    response.status(status).json(payload);
  }
}
