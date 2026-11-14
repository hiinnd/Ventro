import 'reflect-metadata';
import { createRequire } from 'node:module';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validate } from 'class-validator';
const compiled = createRequire(import.meta.url);
const { AiService, AnthropicProvider, GenerateDto } = compiled(
  '../dist/ai/ai.module.js',
) as typeof import('../dist/ai/ai.module.js');
const input = {
  task: 'description' as const,
  brief: 'A public technology workshop for beginners',
  locale: 'en' as const,
  authorizedNonPersonalInput: true,
};
function fixture(enabled = true) {
  const config = new ConfigService({
    AI_PROVIDER: enabled ? 'anthropic' : 'disabled',
    AI_API_KEY: 'test-only',
    AI_MODEL: 'test-model',
    AI_DAILY_LIMIT: 2,
    AUTH_RATE_NAMESPACE: 'ai-test',
  });
  const orgs = { withTenant: vi.fn(async () => undefined) };
  const redis = { rateLimit: vi.fn(async () => ({ count: 1, retryAfter: 10 })) };
  const provider = { generate: vi.fn(async () => 'Test draft, not a live AI response') };
  const service = new AiService(orgs as never, redis as never, config as never, provider);
  return { service, orgs, redis, provider, config };
}
afterEach(() => vi.unstubAllGlobals());
describe('optional AI boundary', () => {
  it('does not call the provider when disabled or tenant permission is denied', async () => {
    const f = fixture(false);
    await expect(f.service.generate({} as never, 'org', input)).rejects.toThrow('disabled');
    expect(f.provider.generate).not.toHaveBeenCalled();
    f.orgs.withTenant.mockRejectedValueOnce(new Error('Forbidden'));
    await expect(f.service.status({} as never, 'other')).rejects.toThrow('Forbidden');
  });
  it('rejects PII and missing consent before consuming usage or contacting provider', async () => {
    const f = fixture();
    for (const brief of [
      'Contact someone@example.test for details',
      'Call +962 79 123 4567 for details',
    ]) {
      await expect(f.service.generate({} as never, 'org', { ...input, brief })).rejects.toThrow(
        'anonymized',
      );
    }
    await expect(
      f.service.generate({} as never, 'org', { ...input, authorizedNonPersonalInput: false }),
    ).rejects.toThrow();
    expect(f.redis.rateLimit).not.toHaveBeenCalled();
    expect(f.provider.generate).not.toHaveBeenCalled();
  });
  it('enforces quota, fails closed on Redis outage and labels drafts for review', async () => {
    const f = fixture();
    expect(await f.service.generate({} as never, 'org', input)).toMatchObject({
      aiGenerated: true,
      requiresReview: true,
    });
    f.redis.rateLimit.mockResolvedValueOnce({ count: 3, retryAfter: 10 });
    await expect(f.service.generate({} as never, 'org', input)).rejects.toMatchObject({
      status: 429,
    });
    f.redis.rateLimit.mockRejectedValueOnce(new Error('Redis secret'));
    await expect(f.service.generate({} as never, 'org', input)).rejects.toThrow(
      'temporarily unavailable',
    );
    expect(f.provider.generate).toHaveBeenCalledTimes(1);
  });
  it('hides provider failures and validates task/input lengths', async () => {
    const f = fixture();
    f.provider.generate.mockRejectedValueOnce(new Error('private upstream key'));
    await expect(f.service.generate({} as never, 'org', input)).rejects.toThrow(
      'AI generation failed',
    );
    expect(await validate(Object.assign(new GenerateDto(), input))).toHaveLength(0);
    expect(
      (
        await validate(
          Object.assign(new GenerateDto(), input, { task: 'execute', brief: 'x'.repeat(6001) }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('uses the real adapter protocol and rejects truncated or malformed outputs', async () => {
    const f = fixture();
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Draft' }] }),
        ),
    );
    vi.stubGlobal('fetch', fetcher);
    const provider = new AnthropicProvider(f.config as never);
    expect(await provider.generate(input)).toBe('Draft');
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST', redirect: 'error' }),
    );
    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ stop_reason: 'max_tokens', content: [] })),
    );
    await expect(provider.generate(input)).rejects.toThrow('Incomplete');
    fetcher.mockResolvedValueOnce(new Response('unauthorized', { status: 401 }));
    await expect(provider.generate(input)).rejects.toThrow('unavailable');
  });
});
