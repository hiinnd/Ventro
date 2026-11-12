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
const html = await page.text();
assert.match(html, /VENTRO/);
assert.match(html, /brand\/favicon\.svg/);
const manifestResponse = await get(web, '/manifest.webmanifest');
assert.equal(manifestResponse.status, 200);
const manifest = await manifestResponse.json();
assert.equal(manifest.name, 'VENTRO');
assert.ok(manifest.icons.some((icon) => icon.src === '/brand/app-icon.svg'));
assert.equal((await get(web, '/brand/app-icon.svg')).status, 200);
const developmentPage = await get(web, '/dev/design-system');
assert.equal(developmentPage.status, 404, 'The design showcase must be unavailable in production');
assert.equal((await get(web, '/dev/foundation')).status, 404);
const rootRedirect = await get(web, '/', { redirect: 'manual' });
assert.equal(rootRedirect.status, 308);
assert.equal(new URL(rootRedirect.headers.get('location'), web).pathname, '/en');
for (const locale of ['en', 'ar']) {
  for (const path of [
    '',
    '/features',
    '/solutions',
    '/pricing',
    '/about',
    '/contact',
    '/faq',
    '/privacy',
    '/terms',
  ]) {
    const response = await get(web, '/' + locale + path);
    assert.equal(response.status, 200, locale + path);
    const body = await response.text();
    assert.ok(body.includes('lang="' + locale + '"'));
    assert.ok(body.includes('dir="' + (locale === 'ar' ? 'rtl' : 'ltr') + '"'));
    assert.ok(body.includes('rel="canonical"'));
  }
}
assert.equal((await get(web, '/en/unknown')).status, 404);
assert.equal((await get(web, '/og')).headers.get('content-type'), 'image/png');
assert.equal(((await (await get(web, '/sitemap.xml')).text()).match(/<url>/g) ?? []).length, 18);
const rejected = await get(api, '/api/health', {
  headers: { Origin: 'https://untrusted.example' },
});
assert.equal(rejected.status, 403);
assert.equal(rejected.headers.get('access-control-allow-origin'), null);
const openapi = await get(api, '/api/openapi.json');
assert.equal(openapi.status, 200);
assert.ok((await openapi.json()).paths['/api/health']);
console.log(
  'PASS: real readiness, CORS, request IDs, OpenAPI, frontend proxy, brand manifest/icons, 18 localized public pages, metadata/OG/sitemap, and production development-route guards.',
);
