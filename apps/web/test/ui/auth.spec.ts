import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import axe from 'axe-core';
const prefix = 'auth-ui-' + randomUUID().replaceAll('-', '');
const emails: string[] = [];
const password = 'A unique browser passphrase 2026';
const nextPassword = 'A changed browser passphrase 2026';
const screenshots = resolve('../../.local/screenshots');
mkdirSync(screenshots, { recursive: true });
const apiRequire = createRequire(new URL('../../../api/package.json', import.meta.url));

test.beforeAll(() => {
  apiRequire('dotenv').config({ path: resolve('../../.env'), quiet: true });
  if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname) || !['localhost', '127.0.0.1'].includes(new URL(process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000').hostname)) throw new Error('Authentication UI tests require local development services.');
});
test.afterAll(async () => {
  if (!emails.length) return;
  const { PrismaService } = apiRequire('./dist/database/prisma.service.js') as typeof import('../../../api/dist/database/prisma.service.js');
  const { ConfigService } = apiRequire('@nestjs/config') as typeof import('@nestjs/config');
  const { validateEnvironment } = apiRequire('./dist/config/environment.js') as typeof import('../../../api/dist/config/environment.js');
  const { privateIdentifier } = apiRequire('./dist/auth/crypto.js') as typeof import('../../../api/dist/auth/crypto.js');
  const settings = validateEnvironment(process.env);
  const db = new PrismaService(new ConfigService(settings) as never);
  try {
    const owned = await db.user.findMany({ where: { email: { in: emails.filter((email) => email.startsWith(prefix + '-') && email.endsWith('@example.test')) } }, select: { id: true } });
    const ids = owned.map((user) => user.id);
    for (let attempt = 0; attempt < 40; attempt++) {
      if (!await db.emailOutbox.count({ where: { userId: { in: ids }, status: { in: ['PENDING', 'PROCESSING'] } } })) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await db.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, ...emails.map((email) => ({ metadata: { path: ['accountKey'], equals: privateIdentifier(settings.AUTH_SECRET, email) } }))] } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  } finally { await db.onModuleDestroy(); }
});
async function audit(page: Page) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })));
  expect(violations).toEqual([]);
}
async function readToken(request: APIRequestContext, email: string, subject: string) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await request.get('http://127.0.0.1:8025/api/v1/search?query=' + encodeURIComponent('to:' + email));
    const result = await response.json() as { messages: { ID: string; Subject: string }[] };
    for (const message of result.messages) {
      if (message.Subject !== subject) continue;
      const detail = await (await request.get('http://127.0.0.1:8025/api/v1/message/' + message.ID)).json() as { Text: string };
      const token = detail.Text.match(/#token=([a-f0-9]{64})/)?.[1];
      if (token) return token;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Real authentication email did not arrive in Mailpit');
}

for (const locale of ['en', 'ar'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test('authentication pages are localized, accessible and responsive: ' + locale + '/' + theme, async ({ page }) => {
      test.setTimeout(180000);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      await page.addInitScript((theme) => localStorage.setItem('theme', theme), theme);
      for (const view of ['login', 'register', 'forgot-password', 'reset-password', 'verify-email']) {
        const response = await page.goto('/' + locale + '/' + view);
        expect(response?.status()).toBe(200);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
        await expect(page.locator('html')).toHaveClass(new RegExp(theme));
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await audit(page);
        if (view === 'register') await page.screenshot({ path: resolve(screenshots, 'auth-' + locale + '-' + theme + '-desktop.png') });
        await page.setViewportSize({ width: 390, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await audit(page);
        if (view === 'register') await page.screenshot({ path: resolve(screenshots, 'auth-' + locale + '-' + theme + '-mobile.png') });
        await page.setViewportSize({ width: 1440, height: 1000 });
      }
      expect(errors).toEqual([]);
    });
  }
}
test('unauthenticated and forged sessions cannot open profiles; proxy rejects unsafe auth requests', async ({ page, request, context }) => {
  const response = await request.get('/en/account', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain('/en/login');
  await context.addCookies([{ name: 'ventro_session', value: 'f'.repeat(64), domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' }]);
  await page.goto('/ar/account');
  await expect(page).toHaveURL(/\/ar\/login/);
  expect((await request.get('/api/auth/profile')).status()).toBe(401);
  expect((await request.post('/api/auth/login', { data: { email: 'unknown@example.test', password } })).status()).toBe(403);
  expect((await request.post('/api/auth/login', { headers: { Origin: 'https://attacker.example', 'X-Ventro-CSRF': '1' }, data: {} })).status()).toBe(403);
  expect((await request.get('/api/auth/not-a-real-action')).status()).toBe(404);
  expect((await request.get('/api/auth/login')).status()).toBe(405);
});

test('real browser registration, verification, profile, renewal, logout and password recovery work end to end', async ({ page, request, context }) => {
  test.setTimeout(180000);
  const email = prefix + '-english@example.test'; emails.push(email);
  await page.goto('/en/register');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Full name', { exact: true }).fill('Browser Organizer');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'If this address can be registered' })).toBeVisible();
  expect((await request.get('/api/auth/profile')).status()).toBe(401);
  const verification = await readToken(request, email, 'Verify your VENTRO email');
  await page.goto('/en/verify-email#token=' + verification);
  await expect(page).toHaveURL('/en/verify-email');
  await page.getByRole('button', { name: 'Verify email', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Email verified.' })).toBeVisible();
  await page.goto('/en/login');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/en/account');
  await expect(page.getByText('Email verified', { exact: true })).toBeVisible();
  const cookie = (await context.cookies()).find((item) => item.name === 'ventro_session')!;
  expect(cookie.httpOnly).toBe(true); expect(cookie.sameSite).toBe('Lax');
  expect(await page.evaluate(() => document.cookie)).not.toContain(cookie.value);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(cookie.value);
  await page.getByLabel('Full name', { exact: true }).fill('Updated Browser Organizer');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Your profile has been saved.' })).toBeVisible();
  await page.reload(); await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Updated Browser Organizer');
  await page.getByRole('button', { name: 'Renew session', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Your session has been renewed securely.' })).toBeVisible();
  expect((await context.cookies()).find((item) => item.name === 'ventro_session')!.value).not.toBe(cookie.value);
  await audit(page);
  await page.screenshot({ path: resolve(screenshots, 'auth-account-english.png') });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await expect(page).toHaveURL('/en/login');
  await page.goto('/en/account'); await expect(page).toHaveURL(/\/en\/login/);
  await page.goto('/en/forgot-password'); await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Request reset email', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'If an eligible account exists' })).toBeVisible();
  const reset = await readToken(request, email, 'Reset your VENTRO password');
  await page.goto('/en/reset-password#token=' + reset);
  await page.getByLabel('New password', { exact: true }).fill(nextPassword);
  await page.getByLabel('Confirm password', { exact: true }).fill(nextPassword);
  await page.getByRole('button', { name: 'Set new password', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Password changed.' })).toBeVisible();
  await page.goto('/en/login');
  await page.getByLabel('Email address', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill(nextPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await expect(page).toHaveURL('/en/account');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
});
test('Arabic mobile account flow sends Arabic email and supports verification and session actions', async ({ page, request }) => {
  test.setTimeout(150000);
  const email = prefix + '-arabic@example.test'; emails.push(email);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ar/register');
  await page.getByLabel('الاسم الكامل', { exact: true }).fill('منظّم تجريبي');
  await page.getByLabel('البريد الإلكتروني', { exact: true }).fill(email);
  await page.getByLabel('كلمة المرور', { exact: true }).fill(password);
  await page.getByLabel('تأكيد كلمة المرور', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'إنشاء حساب', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'ستصل رسالة تأكيد' })).toBeVisible();
  await page.goto('/ar/login'); await page.getByLabel('البريد الإلكتروني', { exact: true }).fill(email); await page.getByLabel('كلمة المرور', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click(); await expect(page).toHaveURL('/ar/account');
  await expect(page.getByText('بانتظار تأكيد البريد', { exact: true })).toBeVisible();
  const token = await readToken(request, email, 'تأكيد بريدك في VENTRO');
  await page.goto('/ar/verify-email#token=' + token); await page.getByRole('button', { name: 'تأكيد البريد', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'تم تأكيد البريد.' })).toBeVisible();
  await page.goto('/ar/account'); await expect(page.getByText('البريد مؤكّد', { exact: true })).toBeVisible();
  await audit(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: resolve(screenshots, 'auth-account-arabic-mobile.png') });
  await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click(); await expect(page).toHaveURL('/ar/login');
});
