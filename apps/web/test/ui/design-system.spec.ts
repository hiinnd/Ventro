import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import axe from 'axe-core';

declare global {
  interface Window {
    axe: typeof axe;
  }
}
const screenshotDirectory = resolve('../../.local/screenshots');
mkdirSync(screenshotDirectory, { recursive: true });

async function openShowcase(page: Page) {
  await page.goto('/dev/design-system');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
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

for (const locale of ['en', 'ar'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test('renders and passes accessibility checks: ' + locale + ' / ' + theme, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.addInitScript(
        ({ locale, theme }) => {
          localStorage.setItem('ventro-locale', locale);
          localStorage.setItem('theme', theme);
        },
        { locale, theme },
      );
      await openShowcase(page);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('html')).toHaveClass(new RegExp(theme));
      await expect(page.locator('[data-slot=sidebar]')).toBeVisible();
      await audit(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: resolve(
          screenshotDirectory,
          'design-system-' + locale + '-' + theme + '-desktop.png',
        ),
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator('[data-slot=sidebar]')).toBeHidden();
      await expect(page.locator('summary')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await audit(page);
      await page.screenshot({
        path: resolve(screenshotDirectory, 'design-system-' + locale + '-' + theme + '-mobile.png'),
      });
      expect(errors).toEqual([]);
    });
  }
}

test('controls, local validation, dialogs, menus, tabs, and feedback work', async ({ page }) => {
  await openShowcase(page);
  const checkbox = page.getByRole('checkbox', { name: 'Enable example preference' });
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).not.toBeChecked();
  const radio = page.getByRole('radio', { name: 'Standard', exact: true });
  await radio.focus();
  await page.keyboard.down('ArrowDown');
  await expect(page.getByRole('radio', { name: 'Minimal', exact: true })).toBeChecked();
  await page.keyboard.up('ArrowDown');
  const select = page.getByRole('combobox', { name: 'Spacing preference' });
  await select.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('option', { name: 'Compact', exact: true }).click();
  await expect(select).toHaveText('Compact');
  const email = page.getByRole('textbox', { name: 'Preview email' });
  await email.fill('invalid');
  await page.getByRole('button', { name: 'Validate example' }).click();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await email.fill('preview@ventro.test');
  await page.getByRole('button', { name: 'Validate example' }).click();
  await expect(page.getByText('Example validated locally', { exact: true })).toBeVisible();
  const openModal = page.getByRole('button', { name: 'Open modal', exact: true });
  await openModal.click();
  const modal = page.getByRole('dialog', { name: 'Example modal' });
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('textbox', { name: 'Preview name' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await modal.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await audit(page);
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  await expect(openModal).toBeFocused();
  await page.getByRole('button', { name: 'Open dialog', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Dialog anatomy' })).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Open confirmation', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Confirm preview', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toBeHidden();
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('tab', { name: 'Overview', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Accessibility', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'About tooltips' }).focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toBeHidden();
  await page.getByRole('button', { name: 'Add example', exact: true }).click();
  await expect(page.getByText('Example item added')).toBeVisible();
  await page.getByRole('button', { name: 'Retry example', exact: true }).click();
  await expect(page.getByText('Preview recovered')).toBeVisible();
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('cell', { name: 'Select', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Error toast', exact: true }).click();
  await expect(page.getByText('Error example', { exact: true })).toBeVisible();
});

test('theme and direction switch and persist; keyboard direction follows RTL', async ({ page }) => {
  await openShowcase(page);
  await page.getByRole('button', { name: 'العربية', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.getByRole('tab', { name: 'نظرة عامة', exact: true }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'إمكانية الوصول', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const arabicModalTrigger = page.getByRole('button', { name: 'فتح نافذة', exact: true });
  await arabicModalTrigger.click();
  const arabicModal = page.getByRole('dialog', { name: 'نافذة تجريبية' });
  expect(await arabicModal.evaluate((node) => getComputedStyle(node).direction)).toBe('rtl');
  await page.keyboard.press('Escape');
  await expect(arabicModalTrigger).toBeFocused();
  await page.getByRole('button', { name: 'تغيير مظهر الألوان' }).click();
  const theme = await page.locator('html').getAttribute('class');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveClass(theme!);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});

test('reduced motion keeps focus and interactions available', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openShowcase(page);
  const primary = page.getByRole('button', { name: 'Primary', exact: true });
  await primary.hover();
  expect(await primary.locator('..').evaluate((node) => getComputedStyle(node).transform)).toBe(
    'none',
  );
  expect(
    await page
      .locator('[data-slot=skeleton]')
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  await page.locator('#focus-demo').focus();
  expect(
    await page.locator('#focus-demo').evaluate((node) => getComputedStyle(node).outlineWidth),
  ).toBe('3px');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Component activated', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('SVG exports and all three local font families are available', async ({ page, request }) => {
  await openShowcase(page);
  for (const name of [
    'logo-on-light',
    'logo-on-dark',
    'symbol-on-light',
    'symbol-on-dark',
    'logo-mono-light',
    'logo-mono-dark',
    'favicon',
    'app-icon',
  ]) {
    const response = await request.get('/brand/' + name + '.svg');
    expect(response.ok()).toBe(true);
    const source = await response.text();
    expect(source).toContain('<svg');
    expect(source).toContain('<path');
    expect(source).not.toMatch(/<script|<image|<text|https?:\/\/(?!www.w3.org)/);
  }
  const fonts = await page.evaluate(async () => {
    const checks = [
      '500 16px "Plus Jakarta Sans Variable"',
      '400 16px "Inter Variable"',
      '400 16px "IBM Plex Sans Arabic"',
    ];
    await Promise.all(
      checks.map((font) => document.fonts.load(font, font.includes('Arabic') ? 'مرحبا' : 'VENTRO')),
    );
    return checks.map((font) => document.fonts.check(font));
  });
  expect(fonts).toEqual([true, true, true]);
});
