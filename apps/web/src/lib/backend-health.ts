import { healthResponseSchema, type HealthResponse } from '@ventro/types';

export async function fetchBackendHealth(
  baseUrl: string | undefined = process.env.API_INTERNAL_URL,
  request: typeof fetch = fetch,
): Promise<{ data: HealthResponse; status: 200 | 503 }> {
  if (!baseUrl) throw new Error('API_INTERNAL_URL is required');
  const url = new URL(baseUrl);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('API_INTERNAL_URL must be an HTTP(S) origin');
  }
  const response = await request(new URL('/api/health', url), {
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
  });
  if (response.status !== 200 && response.status !== 503)
    throw new Error('Unexpected health response');
  const data = healthResponseSchema.parse(await response.json());
  if ((response.status === 200) !== (data.status === 'ok'))
    throw new Error('Inconsistent health status');
  return { data, status: response.status };
}
