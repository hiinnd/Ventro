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
    AI_PROVIDER: z.enum(['disabled', 'anthropic']).default('disabled'),
    AI_API_KEY: z.string().default(''),
    AI_MODEL: z.string().max(120).default(''),
    AI_DAILY_LIMIT: z.coerce.number().int().min(1).max(1000).default(20),
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
    AUTH_SECRET: z
      .string()
      .regex(/^[a-fA-F0-9]{64}$/, 'Generate a 32-byte hex secret with pnpm env:init'),
    AUTH_APP_URL: origin.default('http://127.0.0.1:3000'),
    AUTH_RATE_NAMESPACE: z
      .string()
      .regex(/^[a-z0-9-]{1,60}$/)
      .default('ventro-auth-v1'),
    SMTP_HOST: z.string().min(1).default('127.0.0.1'),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SMTP_REQUIRE_TLS: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.email().default('no-reply@ventro.test'),
  })
  .superRefine((env, ctx) => {
    if (!env.WEB_ORIGINS.includes(env.AUTH_APP_URL))
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_APP_URL'],
        message: 'Must be an allowed WEB_ORIGINS origin',
      });
    if (
      env.NODE_ENV === 'production' &&
      (!env.AUTH_APP_URL.startsWith('https://') ||
        (!env.SMTP_SECURE && !env.SMTP_REQUIRE_TLS) ||
        env.SMTP_FROM.endsWith('.test'))
    )
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_APP_URL'],
        message: 'Production requires HTTPS, TLS SMTP, and an approved sender address',
      });
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
