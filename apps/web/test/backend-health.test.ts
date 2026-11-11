import { describe, expect, it, vi } from 'vitest';
import { fetchBackendHealth } from '../src/lib/backend-health';
const body = {
  status: 'ok',
  service: 'ventro-api',
  timestamp: new Date().toISOString(),
  checks: { database: 'up', redis: 'up' },
};
describe('frontend to backend health contract', () => {
  it('uses the real API path without caching and validates the response', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
    await expect(fetchBackendHealth('http://localhost:4000', request)).resolves.toMatchObject({
      data: body,
      status: 200,
    });
    expect(String(request.mock.calls[0]?.[0])).toBe('http://localhost:4000/api/health');
    expect(request.mock.calls[0]?.[1]?.cache).toBe('no-store');
  });
  it('preserves degraded 503 responses', async () => {
    const degraded = { ...body, status: 'degraded', checks: { database: 'down', redis: 'up' } };
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(degraded, { status: 503 }));
    await expect(fetchBackendHealth('http://localhost:4000', request)).resolves.toMatchObject({
      status: 503,
    });
  });
  it.each([{}, { ...body, service: 'fake-api' }, { ...body, timestamp: 'invalid' }])(
    'rejects an invalid response',
    async (payload) => {
      const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json(payload));
      await expect(fetchBackendHealth('http://localhost:4000', request)).rejects.toThrow();
    },
  );
  it('rejects contradictory health status', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status: 503 }));
    await expect(fetchBackendHealth('http://localhost:4000', request)).rejects.toThrow(
      'Inconsistent',
    );
  });
  it.each([
    'file:///etc/passwd',
    'http://user:password@localhost:4000',
    'http://localhost:4000/path',
  ])('rejects unsafe internal URLs', async (url) => {
    await expect(fetchBackendHealth(url)).rejects.toThrow('HTTP(S) origin');
  });
  it('propagates unreachable backends to the route error boundary', async () => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new Error('Network failure'));
    await expect(fetchBackendHealth('http://localhost:4000', request)).rejects.toThrow(
      'Network failure',
    );
  });
});
