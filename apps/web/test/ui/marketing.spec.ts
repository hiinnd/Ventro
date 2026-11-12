import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import axe from 'axe-core';

const pages = [
  '',
  '/features',
  '/solutions',
  '/pricing',
  '/about',
  '/contact',
  '/faq',
  '/privacy',
  '/terms',
];
const screenshots = resolve('../../.local/screenshots');
mkdirSync(screenshots, { recursive: true });
async function audit(page: Page) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () =>
    (
      await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      })
    ).violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })),
  );
  expect(violations).toEqual([]);
}

test('all eighteen localized public pages have server-rendered language, metadata, and valid internal links', async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  const links = new Set<string>();
  for (const locale of ['en', 'ar']) {
    for (const path of pages) {
      const response = await page.goto('/' + locale + path);
      expect(response?.status()).toBe(200);
      const html = await response!.text();
      expect(html).toContain('lang="' + locale + '"');
      expect(html).toContain('dir="' + (locale === 'ar' ? 'rtl' : 'ltr') + '"');
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
        'href',
        'http://127.0.0.1:3000/' + locale + path,
      );
      await expect(page.locator('link[hreflang=en]')).toHaveAttribute(
        'href',
        'http://127.0.0.1:3000/en' + path,
      );
      await expect(page.locator('link[hreflang=ar]')).toHaveAttribute(
        'href',
        'http://127.0.0.1:3000/ar' + path,
      );
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        'content',
        'http://127.0.0.1:3000/og',
      );
      for (const href of await page
        .locator('a[href]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')!))) {
        expect(href).not.toBe('#');
        if (href.startsWith('/')) links.add(href);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
  for (const href of links) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
    const fragment = href.split('#')[1];
    if (fragment) expect(await response.text(), href).toContain('id="' + fragment + '"');
  }
  expect((await request.get('/', { maxRedirects: 0 })).status()).toBe(308);
  expect((await request.get('/en/not-a-page')).status()).toBe(404);
  expect((await request.get('/ar/features/extra')).status()).toBe(404);
  const spoofed = await request.get('/en', { headers: { 'x-ventro-locale': 'ar' } });
  expect(await spoofed.text()).toContain('lang="en"');
  const sitemap = await request.get('/sitemap.xml');
  expect((await sitemap.text()).match(/<url>/g)).toHaveLength(18);
  expect((await request.get('/robots.txt')).status()).toBe(200);
  const og = await request.get('/og');
  expect(og.status()).toBe(200);
  expect(og.headers()['content-type']).toContain('image/png');
});

for (const locale of ['en', 'ar'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(
      'public website accessibility, images, and responsive layout: ' + locale + ' / ' + theme,
      async ({ page }) => {
        test.setTimeout(180000);
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        await page.addInitScript((theme) => localStorage.setItem('theme', theme), theme);
        await page.goto('/' + locale);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('html')).toHaveClass(new RegExp(theme));
        await expect(page.locator('.m-hero-photo img')).toBeVisible();
        await expect
          .poll(() =>
            page
              .locator('.m-hero-photo img')
              .evaluate((img) => (img as HTMLImageElement).naturalWidth),
          )
          .toBeGreaterThan(0);
        await expect(page.locator('.m-hero-photo img')).toHaveAttribute('src', /\/_next\/image/);
        await audit(page);
        await page.screenshot({
          path: resolve(screenshots, 'marketing-' + locale + '-' + theme + '-desktop.png'),
        });
        await page.setViewportSize({ width: 390, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await audit(page);
        await page.screenshot({
          path: resolve(screenshots, 'marketing-' + locale + '-' + theme + '-mobile.png'),
        });
        for (const path of [
          '/features',
          '/solutions',
          '/pricing',
          '/about',
          '/contact',
          '/faq',
          '/privacy',
          '/terms',
        ]) {
          await page.goto('/' + locale + path);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          await audit(page);
        }
        expect(errors).toEqual([]);
      },
    );
  }
}

test('previews respond to keyboard input, event filters and dialogs work, and CTAs have truthful destinations', async ({
  page,
}) => {
  await page.goto('/en');
  const preview = page.getByTestId('product-preview');
  const plan = preview.getByRole('tab', { name: 'Plan the moment' });
  await plan.focus();
  await page.keyboard.press('ArrowRight');
  await expect(preview.getByRole('tab', { name: 'Welcome people' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(preview.getByText('A clearer arrival.')).toBeVisible();
  await preview.getByRole('tab', { name: 'Carry it forward' }).click();
  await expect(preview.getByText('Remember what mattered.')).toBeVisible();
  const features = page.getByRole('tablist', { name: 'Explore planned features' });
  await features.getByRole('tab').nth(2).click();
  await expect(features.getByRole('tab').nth(2)).toHaveAttribute('aria-selected', 'true');
  await page
    .getByRole('tablist', { name: 'Event lifecycle preview' })
    .getByRole('tab', { name: 'Continue' })
    .click();
  await expect(page.getByRole('tabpanel', { name: 'Continue' })).toContainText('Event Passport');
  await preview.screenshot({ path: resolve(screenshots, 'marketing-product-preview.png') });
  await page.locator('.m-hero').getByRole('link', { name: 'Create Your Event' }).click();
  await expect(page).toHaveURL(/\/en\/contact\?intent=organize/);
  await expect(page.getByRole('combobox', { name: 'What brings you here?' })).toHaveText(
    'Organizing an event',
  );
  await page.goto('/en/solutions#event-preview');
  await expect(page.locator('.m-event-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Community', exact: true }).click();
  await expect(page.locator('.m-event-card')).toHaveCount(1);
  const trigger = page.getByRole('button', { name: 'Preview the journey' });
  await trigger.click();
  await expect(page.getByRole('dialog')).toContainText('not a real event');
  await audit(page);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('mobile navigation, URL-based language, and theme preferences survive navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/features');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await audit(page);
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Pricing' })
    .click();
  await expect(page).toHaveURL('/en/pricing');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'العربية', exact: true }).click();
  await expect(page).toHaveURL('/ar/pricing');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  const before = await page.locator('html').getAttribute('class');
  await page.getByRole('button', { name: 'تغيير مظهر الألوان' }).click();
  await expect.poll(() => page.locator('html').getAttribute('class')).not.toBe(before);
  const after = await page.locator('html').getAttribute('class');
  expect(after).not.toBe(before);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('class', after!);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

test('contact brief validates locally, copies real text, and makes no submission or enrollment', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const writes: string[] = [];
  page.on('request', (request) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url());
  });
  await page.goto('/en/contact?intent=pricing&plan=grow');
  await page.getByRole('button', { name: 'Prepare my brief' }).click();
  await expect(page.getByRole('textbox', { name: 'Your name' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Your name' }).fill('Sample Organizer');
  await page.getByRole('textbox', { name: 'Email address' }).fill('organizer@example.test');
  await page
    .getByRole('textbox', { name: 'Tell us about your idea' })
    .fill('A gathering for our local creative community.');
  await page.getByRole('button', { name: 'Prepare my brief' }).click();
  await expect(page.getByText('Your brief is ready locally. It has not been sent.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Prepared brief' })).toHaveValue(
    /Proposed package: grow/,
  );
  await page.getByRole('button', { name: 'Copy brief', exact: true }).click();
  await expect(page.getByText('Brief copied', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Sample Organizer');
  expect(writes).toEqual([]);
  await audit(page);
});

test('FAQ search includes answers, opens details, and recovers from no results', async ({
  page,
}) => {
  await page.goto('/en/faq');
  const search = page.getByRole('searchbox', { name: 'Find an answer' });
  await search.fill('Passport');
  await expect(page.locator('details')).toHaveCount(1);
  await page.locator('summary').click();
  await expect(page.locator('details')).toHaveAttribute('open', '');
  await search.fill('no-such-question-12345');
  await expect(page.getByText('No matching questions')).toBeVisible();
  await page.getByRole('button', { name: 'Show all questions' }).click();
  await expect(page.locator('details')).toHaveCount(8);
});

test('reduced motion keeps the full experience visible and removes decorative motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/ar');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe(
    'auto',
  );
  await expect(page.locator('.m-orbit-one')).toHaveCSS(
    'transform',
    /none|matrix\(1, 0, 0, 1, 0, 0\)/,
  );
  await page.getByTestId('product-preview').getByRole('tab').nth(2).click();
  await expect(page.getByTestId('product-preview').getByRole('tabpanel')).toBeVisible();
  await page.screenshot({ path: resolve(screenshots, 'marketing-ar-reduced-motion.png') });
});
