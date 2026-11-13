import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import axe from 'axe-core';
const fromApi = createRequire(resolve('../api/package.json'));
// These four stages share one owned fixture and intentionally exercise a single lifecycle.
test.describe.configure({ mode: 'serial' });
const fixtures = fromApi('./test/organization-browser-fixtures.mjs') as {
  setupOrganizationUsers: (prefix: string, password: string) => Promise<void>;
  cleanupOrganizationUsers: (prefix: string) => Promise<void>;
  expireOrganizationInvitation: (prefix: string, id: string) => Promise<void>;
};
const prefix = 'org-ui-' + randomUUID().replaceAll('-', '');
const password = 'Organization browser passphrase ' + randomUUID();
const owner = prefix + '-owner@example.test';
const member = prefix + '-member@example.test';
const admin = prefix + '-admin@example.test';
const screenshots = resolve('../../.local/screenshots');
mkdirSync(screenshots, { recursive: true });
let englishId = '';
test.beforeAll(async () => {
  await fixtures.setupOrganizationUsers(prefix, password);
});
test.afterAll(async () => {
  await fixtures.cleanupOrganizationUsers(prefix);
});
async function login(page: Page, email: string, next: string) {
  const destination = next.replace(/^\/ar\//, '/en/');
  await page.goto('/en/login?next=' + encodeURIComponent(destination));
  await page.getByRole('textbox', { name: 'Email address', exact: true }).fill(email);
  await page.getByLabel(/^Password\b/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(destination);
  if (destination !== next) {
    await page.goto(next);
    await expect(page).toHaveURL(next);
  }
}
async function audit(page: Page) {
  await page.addScriptTag({ content: axe.source });
  expect(
    await page.evaluate(async () =>
      (
        await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
        })
      ).violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })),
    ),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function invitationToken(request: APIRequestContext) {
  for (let i = 0; i < 60; i++) {
    const result = (await (
      await request.get(
        'http://127.0.0.1:8025/api/v1/search?query=' + encodeURIComponent('to:' + member),
      )
    ).json()) as { messages: { ID: string; Subject: string }[] };
    for (const summary of result.messages) {
      if (summary.Subject !== 'Your VENTRO team invitation') continue;
      const message = (await (
        await request.get('http://127.0.0.1:8025/api/v1/message/' + summary.ID)
      ).json()) as { Text: string };
      const token = message.Text.match(/#token=([a-f0-9]{64})/)?.[1];
      if (token) return token;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Invitation not delivered to real Mailpit');
}
test('owners create, edit and brand organizations; real email invites, role changes and removal enforce live access', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await login(page, owner, '/en/organizations');
  await page.getByRole('link', { name: 'Create organization', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Organization name', exact: true })
    .fill('VENTRO Browser Studio');
  await page.getByRole('textbox', { name: 'Unique slug', exact: true }).fill(prefix + '-english');
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('A dedicated team workspace in Amman.');
  await page.getByRole('button', { name: 'Create organization', exact: true }).click();
  await expect(page).toHaveURL(/\/organizations\/[a-f0-9-]+\/settings$/);
  englishId = new URL(page.url()).pathname.split('/')[3]!;
  await page
    .getByRole('textbox', { name: 'Organization name', exact: true })
    .fill('VENTRO Browser Studio Updated');
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Organization saved.' })).toBeVisible();
  const image = (await fromApi('sharp')({
    create: { width: 128, height: 128, channels: 4, background: '#9b8cff' },
  })
    .png()
    .toBuffer()) as Buffer;
  await page
    .getByLabel(/^Choose logo image/)
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: image });
  await page.getByRole('button', { name: 'Upload logo', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Logo updated.' })).toBeVisible();
  await expect(page.locator('img.workspace-org-logo')).toBeVisible();
  await audit(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: resolve(screenshots, 'organizations-settings-en-light.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Switch theme', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await audit(page);
  await page.getByRole('link', { name: 'Team & access', exact: true }).click();
  await page.getByRole('textbox', { name: 'Teammate email', exact: true }).fill(member);
  await page.getByRole('combobox', { name: 'Invitation role', exact: true }).click();
  await page.getByRole('option', { name: 'Event Manager', exact: true }).click();
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Invitation queued for email delivery.' }),
  ).toBeVisible();
  const token = await invitationToken(request);
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  try {
    await login(memberPage, member, '/en/invitations');
    await memberPage.goto('/en/invitations#token=' + token);
    await memberPage.getByRole('button', { name: 'Review email invitation', exact: true }).click();
    await expect(memberPage).toHaveURL('/en/invitations');
    await memberPage.getByRole('button', { name: 'Accept invitation', exact: true }).click();
    await expect(
      memberPage.getByRole('status').filter({ hasText: 'Invitation accepted.' }),
    ).toBeVisible();
    await memberPage.goto('/en/organizations/' + englishId + '/settings');
    await expect(
      memberPage.getByRole('button', { name: 'Save settings', exact: true }),
    ).toHaveCount(0);
    await memberPage.getByRole('link', { name: 'Team & access', exact: true }).click();
    await expect(
      memberPage.getByRole('heading', { name: 'Invite a teammate', exact: true }),
    ).toHaveCount(0);
    await audit(memberPage);
    await page.reload();
    const row = page.getByRole('row').filter({ hasText: member });
    await row.getByRole('button', { name: 'Change role', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: 'New role', exact: true }).click();
    await page.getByRole('option', { name: 'Check-in Staff', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save role', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(
      (await memberPage.request.get('/api/organizations/' + englishId + '/members')).status(),
    ).toBe(403);
    await memberPage.goto('/en/organizations/' + englishId + '/settings');
    await expect(memberPage.getByRole('link', { name: 'Team & access', exact: true })).toHaveCount(
      0,
    );
    await row.getByRole('button', { name: 'Remove', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirm removal', exact: true })
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect((await memberPage.request.get('/api/organizations/' + englishId)).status()).toBe(403);
    await page
      .getByRole('row')
      .filter({ hasText: owner })
      .getByRole('button', { name: 'Remove', exact: true })
      .click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Confirm removal', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText(
      'Keep at least one active organization owner',
    );
    await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await page.getByRole('textbox', { name: 'Teammate email', exact: true }).fill(member);
    await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Invitation queued for email delivery.' }),
    ).toBeVisible();
    await memberPage.goto('/en/invitations');
    await memberPage.getByRole('button', { name: 'Decline', exact: true }).click();
    await expect(
      memberPage.getByRole('status').filter({ hasText: 'Invitation declined.' }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText('Declined', { exact: false })).toBeVisible();
    await audit(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: resolve(screenshots, 'organizations-team-en-dark.png'),
      fullPage: true,
    });
  } finally {
    await memberContext.close();
  }
  expect(errors).toEqual([]);
});
test('Arabic mobile settings support themes, multiple organizations and persistent switching', async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await login(page, owner, '/ar/organizations');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.getByRole('link', { name: 'إنشاء مؤسسة', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'اسم المؤسسة', exact: true })
    .fill('مساحة عمّان للفعاليات');
  await page.getByRole('textbox', { name: 'المعرّف الفريد', exact: true }).fill(prefix + '-arabic');
  await page.getByRole('button', { name: 'إنشاء مؤسسة', exact: true }).click();
  await expect(page).toHaveURL(/\/ar\/organizations\/[a-f0-9-]+\/settings$/);
  const arabicId = new URL(page.url()).pathname.split('/')[3]!;
  await audit(page);
  await page.screenshot({
    path: resolve(screenshots, 'organizations-settings-ar-dark-mobile.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'تبديل المظهر', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/light/);
  await audit(page);
  await page.getByRole('link', { name: 'المؤسسات', exact: true }).click();
  const card = page.locator('[data-slot=card]').filter({
    has: page.getByRole('heading', { name: 'VENTRO Browser Studio Updated', exact: true }),
  });
  await card.getByRole('button', { name: 'فتح المؤسسة', exact: true }).click();
  await expect(page).toHaveURL('/ar/organizations/' + englishId + '/settings');
  expect((await (await page.request.get('/api/auth/session')).json()).activeOrganizationId).toBe(
    englishId,
  );
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'اسم المؤسسة', exact: true })).toHaveValue(
    'VENTRO Browser Studio Updated',
  );
  await page.getByRole('link', { name: 'الفريق والصلاحيات', exact: true }).click();
  await page.getByRole('textbox', { name: 'بريد عضو الفريق', exact: true }).fill(member);
  await page.getByRole('button', { name: 'إرسال الدعوة', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'أُضيفت الدعوة' })).toBeVisible();
  const response = await page.request.get('/api/organizations/' + englishId + '/invitations');
  const invite = (await response.json()).items.find(
    (item: { email: string }) => item.email === member,
  ) as { id: string };
  await fixtures.expireOrganizationInvitation(prefix, invite.id);
  await page.goto('/ar/organizations/' + arabicId + '/settings');
  await expect(page.getByRole('textbox', { name: 'اسم المؤسسة', exact: true })).toHaveValue(
    'مساحة عمّان للفعاليات',
  );
  await audit(page);
});
test('invitations show expiration and private routes and proxies reject unauthorized or unsafe requests', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const anonymous = await page.goto('/en/organizations');
  expect(anonymous?.status()).toBe(200);
  await expect(page).toHaveURL(/\/en\/login\?next=/);
  expect((await request.get('/api/organizations')).status()).toBe(401);
  expect((await request.post('/api/organizations', { data: { name: 'unsafe' } })).status()).toBe(
    403,
  );
  expect((await request.get('/api/organizations/' + englishId + '/unknown')).status()).toBe(404);
  await login(page, member, '/en/invitations');
  await expect(page.getByText('Expired', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept invitation', exact: true })).toBeDisabled();
  expect((await page.goto('/en/organizations/' + englishId + '/team'))?.status()).toBe(403);
  expect((await page.request.get('/api/organizations/' + englishId)).status()).toBe(403);
  expect((await page.goto('/en/platform'))?.status()).toBe(403);
});
test('Platform Admin sees its limited directory without implicit tenant access', async ({
  page,
}) => {
  await login(page, admin, '/en/platform');
  await expect(
    page.getByRole('link', { name: 'Platform administration', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'VENTRO Browser Studio Updated', exact: true }),
  ).toBeVisible();
  await audit(page);
  expect((await page.request.get('/api/organizations/' + englishId + '/members')).status()).toBe(
    403,
  );
  expect((await page.goto('/en/organizations/' + englishId + '/settings'))?.status()).toBe(403);
});
