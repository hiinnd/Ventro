import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.literal('ventro-api'),
  timestamp: z.iso.datetime(),
  checks: z.object({
    database: z.enum(['up', 'down']),
    redis: z.enum(['up', 'down']),
  }),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId: string;
}
export type Locale = 'en' | 'ar';

export const authUserSchema = z.object({
  id: z.uuid(), email: z.email(), name: z.string(), locale: z.enum(['en', 'ar']),
  emailVerifiedAt: z.iso.datetime().nullable(), createdAt: z.iso.datetime(),
});
export const authSessionSchema = z.object({ user: authUserSchema, expiresAt: z.iso.datetime(), absoluteExpiresAt: z.iso.datetime() });
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
