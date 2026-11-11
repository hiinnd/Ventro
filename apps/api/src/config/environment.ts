import { z } from 'zod';

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}
const origin = z
  .string()
  .url()
  .refine((value) => {
    const url = parseUrl(value);
    return Boolean(url && ['http:', 'https:'].includes(url.protocol) && url.origin === value);
  }, 'Origins must be exact HTTP(S) origins without paths or wildcards');

export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_HOST: z.string().min(1).default('127.0.0.1'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (value) => ['postgres:', 'postgresql:'].includes(parseUrl(value)?.protocol ?? ''),
        'Use PostgreSQL',
      ),
    REDIS_URL: z
      .string()
      .url()
      .refine(
        (value) => ['redis:', 'rediss:'].includes(parseUrl(value)?.protocol ?? ''),
        'Use Redis',
      ),
    WEB_ORIGINS: z
      .string()
      .transform((value) => value.split(',').map((item) => item.trim()))
      .pipe(z.array(origin).min(1)),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    SWAGGER_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .superRefine((env, ctx) => {
    if (
      env.NODE_ENV === 'production' &&
      env.WEB_ORIGINS.some((value) => !value.startsWith('https://'))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['WEB_ORIGINS'],
        message: 'Production origins must use HTTPS',
      });
    }
  });
export type Environment = z.infer<typeof environmentSchema>;
export function validateEnvironment(value: Record<string, unknown>): Environment {
  const result = environmentSchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      'Invalid environment: ' +
        result.error.issues.map((issue) => issue.path.join('.') + ': ' + issue.message).join('; '),
    );
  }
  return result.data;
}
