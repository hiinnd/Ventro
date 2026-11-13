import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import axe from 'axe-core';
const fromApi = createRequire(resolve('../api/package.json'));
const fixtures = fromApi('./test/organization-browser-fixtures.mjs') as { setupOrganizationUsers: (prefix: string, password: string) => Promise<void>; cleanupOrganizationUsers: (prefix: string) => Promise<void> };
test.describe.configure({ mode: 'serial' });
const prefix = 'org-ui-' + randomUUID().replaceAll('-', ''); const password = 'Dashboard browser passphrase ' + randomUUID();
const owner = prefix + '-owner@example.test'; const member = prefix + '-member@example.test'; const admin = prefix + '-admin@example.test';
const shots = resolve('../../.local/screenshots'); mkdirSync(shots, { recursive: true });
let ownerCookie = ''; let memberCookie = ''; let first = ''; let second = ''; let foreign = ''; let memberId = '';
const route = (id: string, section = '', locale = 'en') => '/' + locale + '/organizations/' + id + '/dashboard' + (section ? '/' + section : '');
async function backend(path: string, method = 'GET', body?: object, cookie?: string) {
  const response = await fetch('http://127.0.0.1:4000/api/v1/' + path, { method, headers: { Origin: 'http://127.0.0.1:3000', 'X-Ventro-CSRF': '1', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) });
  if (!response.ok) throw new Error('Fixture API ' + path + ': ' + response.status);
  return { data: response.status === 204 ? null : await response.json() as Record<string, unknown>, cookie: response.headers.getSetCookie()[0]?.split(';')[0] ?? '' };
}
test.beforeAll(async () => {
  await fixtures.setupOrganizationUsers(prefix, password);
  ownerCookie = (await backend('auth/login', 'POST', { email: owner, password })).cookie;
  const logged = await backend('auth/login', 'POST', { email: member, password }); memberCookie = logged.cookie; memberId = String((logged.data!.user as { id: string }).id);
  const adminCookie = (await backend('auth/login', 'POST', { email: admin, password })).cookie;
  const create = async (name: string, suffix: string, cookie: string) => String((await backend('organizations', 'POST', { name, slug: prefix + '-' + suffix, description: 'A real organizer workspace in Amman.', website: 'https://example.test', contactEmail: 'team@example.test', timezone: 'Asia/Amman', locale: 'en' }, cookie)).data!.id);
  first = await create('Amman Event Studio', 'first', ownerCookie); second = await create('MENA Creative Collective', 'second', ownerCookie); foreign = await create('Private Other Studio', 'foreign', adminCookie);
  const invitation = await backend('organizations/' + first + '/invitations', 'POST', { email: member, role: 'EVENT_MANAGER' }, ownerCookie);
  await backend('organizations/invitations/' + invitation.data!.id + '/accept', 'POST', {}, memberCookie);
});
test.afterAll(async () => { await fixtures.cleanupOrganizationUsers(prefix); });
async function login(page: Page, email: string, destination: string) {
  await page.goto('/en/login?next=' + encodeURIComponent(destination));
  await page.getByRole('textbox', { name: 'Email address', exact: true }).fill(email);
  await page.getByLabel(/^Password\b/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(destination);
}
async function audit(page: Page) {
  await page.addScriptTag({ content: axe.source });
  expect(await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function metric(page: Page, label: string, value: string) {
  const card = page.locator('.dash-metric-card').filter({ hasText: label });
  await expect(card.locator('.dash-metric-value')).toHaveText(value);
}
test('organizer overview uses real metrics, searchable team data, live notices and working planned-section navigation', async ({ page }) => {
  test.setTimeout(240000); const errors: string[] = []; page.on('pageerror', err => errors.push(err.message));
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await login(page, owner, '/en/dashboard');
  await page.getByRole('button', { name: /Amman Event Studio/ }).click();
  await expect(page).toHaveURL(route(first));
  await metric(page, 'Team members', '2'); await metric(page, 'Active members', '2'); await metric(page, 'Pending invitations', '0'); await metric(page, 'Active owners', '1');
  await expect(page.getByRole('navigation', { name: 'Organizer navigation', exact: true }).getByRole('link')).toHaveCount(10);
  await page.getByRole('combobox', { name: 'Activity period', exact: true }).click();
  await page.getByRole('option', { name: 'Last 30 days', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Activity period', exact: true })).toContainText('Last 30 days');
  await page.getByRole('combobox', { name: 'Activity filter', exact: true }).click(); await page.getByRole('option', { name: 'Team changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A fresh start', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show all changes', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Team invitation accepted', exact: true })).toBeVisible();
  await audit(page); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: resolve(shots, 'dashboard-en-light-desktop.png'), fullPage: true });
  await page.keyboard.press('Control+k'); const search = page.getByRole('dialog');
  await search.getByRole('textbox', { name: 'Search team members', exact: true }).fill(member);
  await expect(search.getByText(member, { exact: true })).toBeVisible();
  await search.getByRole('combobox', { name: 'Filter by role', exact: true }).click(); await page.getByRole('option', { name: 'Event Manager', exact: true }).click();
  await expect(search.getByRole('status')).toContainText('Matching members: 1');
  await search.getByRole('textbox', { name: 'Search team members', exact: true }).fill(admin);
  await expect(search.getByText('No matching team members. Try another name or clear the role filter.')).toBeVisible();
  await search.getByRole('button', { name: 'Close search', exact: true }).click();
  await page.getByRole('button', { name: 'Organization updates', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Add optional profile details', { exact: false })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close updates', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Organizer navigation', exact: true });
  for (const [section, label] of [['events', 'Events'], ['registrations', 'Registrations'], ['attendees', 'Attendees'], ['sessions', 'Sessions'], ['polls', 'Polls & Q&A'], ['certificates', 'Certificates'], ['analytics', 'Analytics']]) {
    await nav.getByRole('link', { name: label + ' Planned', exact: true }).click(); await expect(page).toHaveURL(route(first, section));
    await expect(page.getByText('Planned · Not yet available', { exact: true })).toBeVisible();
  }
  await nav.getByRole('link', { name: 'Settings', exact: true }).click(); await expect(page.getByRole('button', { name: 'Save settings', exact: true })).toBeVisible();
  await nav.getByRole('link', { name: 'Team', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Invite a teammate', exact: true })).toBeVisible();
  await nav.getByRole('link', { name: 'Overview', exact: true }).click();
  await page.getByRole('button', { name: 'Switch theme', exact: true }).click(); await expect(page.locator('html')).toHaveClass(/dark/); await audit(page);
  await page.getByRole('button', { name: /Switch organization$/, exact: false }).click();
  const switcher = page.getByRole('dialog'); await expect(switcher.getByRole('button', { name: /Private Other Studio/ })).toHaveCount(0);
  await switcher.getByRole('button', { name: /MENA Creative Collective/ }).click(); await expect(page).toHaveURL(route(second));
  await metric(page, 'Team members', '1'); expect((await (await page.request.get('/api/auth/session')).json()).activeOrganizationId).toBe(second);
  await page.goto('/en/dashboard'); await expect(page).toHaveURL(route(second)); await metric(page, 'Team members', '1');
  await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: resolve(shots, 'dashboard-en-dark-desktop.png'), fullPage: true }); expect(errors).toEqual([]);
});
test('Arabic mobile dashboard supports keyboard navigation, both themes, responsive tables and useful empty sections', async ({ page }) => {
  test.setTimeout(180000); await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await login(page, owner, route(first)); await page.goto(route(first, '', 'ar'));
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar'); await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await metric(page, 'أعضاء الفريق', '٢'); await audit(page);
  await page.getByRole('button', { name: 'فتح التنقل', exact: true }).click();
  const drawer = page.getByRole('dialog'); await expect(drawer.getByRole('navigation').getByRole('link')).toHaveCount(10);
  await audit(page); await page.keyboard.press('Escape'); await expect(drawer).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'فتح التنقل', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'فتح التنقل', exact: true }).click(); await page.getByRole('dialog').getByRole('link', { name: 'التسجيلات مخطّط', exact: true }).click();
  await expect(page.getByText('مخطّط · غير متاح بعد', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'عرض نظرة المؤسسة العامة', exact: true }).click(); await metric(page, 'أعضاء الفريق', '٢');
  await page.getByRole('button', { name: 'قائمة المستخدم', exact: true }).click(); await page.getByRole('menuitem', { name: 'تبديل المظهر', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/light/); await audit(page);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: resolve(shots, 'dashboard-ar-light-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'قائمة المستخدم', exact: true }).click(); await page.getByRole('menuitem', { name: 'تبديل المظهر', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/); await page.screenshot({ path: resolve(shots, 'dashboard-ar-dark-mobile.png'), fullPage: true });
});
test('dashboard loading and service failures are recoverable without replacing real metrics', async ({ page }) => {
  test.setTimeout(120000); let release: (() => void) | undefined; const gate = new Promise<void>(resolve => { release = resolve; });
  const pattern = '**/api/organizations/' + first + '/dashboard/overview?*';
  await page.route(pattern, async intercepted => { const response = await intercepted.fetch(); await gate; await intercepted.fulfill({ response }); }, { times: 1 });
  try { await login(page, owner, route(first)); await expect(page.getByRole('status', { name: 'Loading dashboard data', exact: true }).first()).toBeVisible(); release!(); await metric(page, 'Team members', '2'); }
  finally { release?.(); }
  await page.route(pattern, intercepted => intercepted.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Temporarily unavailable"}' }), { times: 1 });
  await page.getByRole('button', { name: 'Refresh overview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Unable to load this workspace', exact: true })).toBeVisible();
  await expect(page.locator('.dash-metric-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Try again', exact: true }).click(); await metric(page, 'Team members', '2');
});
test('manager access, tenant isolation, live role revocation, onboarding and logout remain enforced', async ({ page }) => {
  test.setTimeout(150000); await login(page, member, route(first)); await metric(page, 'Team members', '2');
  await page.getByRole('navigation', { name: 'Organizer navigation', exact: true }).getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save settings', exact: true })).toHaveCount(0);
  expect((await page.goto(route(foreign)))?.status()).toBe(403);
  expect((await page.request.get('/api/organizations/' + foreign + '/dashboard/overview')).status()).toBe(403);
  await backend('organizations/' + first + '/members/' + memberId, 'PATCH', { role: 'PARTICIPANT' }, ownerCookie);
  expect((await page.goto(route(first)))?.status()).toBe(403);
  expect((await page.request.post('/api/organizations/' + first + '/dashboard/search', { headers: { Origin: 'http://127.0.0.1:3000', 'X-Ventro-CSRF': '1' }, data: { q: 'Browser' } })).status()).toBe(403);
  await page.goto('/en/dashboard'); await expect(page.getByRole('heading', { name: 'No organizer workspaces yet', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Create organization', exact: true }).click(); await expect(page).toHaveURL('/en/organizations/new');
  await page.goto('/en/dashboard'); await page.getByRole('button', { name: 'User menu', exact: true }).click(); await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click(); await expect(page).toHaveURL('/en/login');
  expect((await page.request.get('/api/auth/session')).status()).toBe(401);
});
