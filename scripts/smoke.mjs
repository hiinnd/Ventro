import assert from 'node:assert/strict';
const api = process.env.SMOKE_API_URL ?? 'http://127.0.0.1:4000';
const web = process.env.SMOKE_WEB_URL ?? 'http://127.0.0.1:3000';
async function get(base, path, options = {}) {
  return fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(10000) });
}
const live = await get(api, '/api/health/live');
assert.equal(live.status, 200);
assert.equal((await live.json()).status, 'ok');
const health = await get(api, '/api/health', { headers: { Origin: web } });
assert.equal(health.status, 200, 'Readiness requires real PostgreSQL and Redis');
assert.equal(health.headers.get('access-control-allow-origin'), web);
assert.ok(health.headers.get('x-request-id'));
const data = await health.json();
assert.deepEqual(data.checks, { database: 'up', redis: 'up' });
const proxied = await get(web, '/api/health');
assert.equal(proxied.status, 200);
assert.deepEqual((await proxied.json()).checks, data.checks);
const page = await get(web, '/');
assert.equal(page.status, 200);
assert.match(await page.text(), /VENTRO/);
const rejected = await get(api, '/api/health', {
  headers: { Origin: 'https://untrusted.example' },
});
assert.equal(rejected.status, 403);
assert.equal(rejected.headers.get('access-control-allow-origin'), null);
const openapi = await get(api, '/api/openapi.json');
assert.equal(openapi.status, 200);
assert.ok((await openapi.json()).paths['/api/health']);
console.log(
  'PASS: live API, real readiness, origin restrictions, request IDs, OpenAPI, frontend page and frontend-to-backend proxy.',
);
