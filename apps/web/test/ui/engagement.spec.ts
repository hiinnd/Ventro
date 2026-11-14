import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const fromApi = createRequire(resolve('../api/package.json'));
const fixtures = fromApi('./test/organization-browser-fixtures.mjs') as {
  setupOrganizationUsers: (prefix: string, password: string) => Promise<void>;
  cleanupOrganizationUsers: (prefix: string) => Promise<void>;
};

const prefix = 'org-ui-' + randomUUID().replaceAll('-', '');
const password = 'Engagement browser passphrase ' + randomUUID();
const owner = prefix + '-owner@example.test';
let cookie = '';
let organizationId = '';
let slug = '';
let eventId = '';
const origin = 'http://127.0.0.1:4000/api/v1/';

async function api(path: string, method = 'GET', body?: object) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      Origin: 'http://127.0.0.1:3000',
      'X-Ventro-CSRF': '1',
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
  });
  if (!response.ok) throw new Error(path + ': ' + response.status + ' ' + (await response.text()));
  const setCookie = response.headers.getSetCookie()[0]?.split(';')[0];
  if (setCookie) cookie = setCookie;
  return response.status === 204 ? null : ((await response.json()) as Record<string, unknown>);
}

async function signIn(page: Page, destination: string) {
  await page.getByRole('textbox', { name: 'Email address', exact: true }).fill(owner);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(destination);
}

test.beforeAll(async () => {
  await fixtures.setupOrganizationUsers(prefix, password);
  await api('auth/login', 'POST', { email: owner, password });
  const organization = await api('organizations', 'POST', {
    name: 'Live Engagement Studio',
    slug: prefix + '-live',
    description: 'Browser verification workspace.',
    website: 'https://example.test',
    contactEmail: 'team@example.test',
    timezone: 'Asia/Amman',
    locale: 'en',
  });
  if (!organization) throw new Error('Organization fixture was not created');
  organizationId = String(organization.id);
  const draft = await api('organizations/' + organizationId + '/events', 'POST');
  if (!draft) throw new Error('Event fixture was not created');
  eventId = String(draft.id);
  const startsAt = new Date(Date.now() + 86_400_000).toISOString();
  const endsAt = new Date(Date.now() + 172_800_000).toISOString();
  const saved = await api('organizations/' + organizationId + '/events/' + eventId, 'PATCH', {
    title: 'Live audience browser event',
    description: 'A real published event for browser verification.',
    category: 'Conference',
    visibility: 'PUBLIC',
    locationType: 'VENUE',
    venue: 'Amman',
    timezone: 'Asia/Amman',
    startsAt,
    endsAt,
  });
  if (!saved) throw new Error('Event fixture was not saved');
  slug = String(saved.slug);
  await api('organizations/' + organizationId + '/events/' + eventId + '/publish', 'POST');
  const poll = await api('engagement/events/' + eventId + '/polls', 'POST', {
    question: 'Which session should open?',
    options: ['Product vision', 'Community panel'],
    multiple: false,
  });
  if (!poll) throw new Error('Poll fixture was not created');
  await api('engagement/polls/' + String(poll.id) + '/launch', 'POST');
});

test.afterAll(async () => {
  await fixtures.cleanupOrganizationUsers(prefix);
});

test('optional AI shows disabled state and gates copying on explicit review', async ({ page }) => {
  const destination = '/en/organizations/' + organizationId + '/dashboard/events';
  await page.goto('/en/login?next=' + encodeURIComponent(destination));
  await signIn(page, 'http://127.0.0.1:3000' + destination);
  await expect(
    page.getByText('Assistant disabled. No AI provider is configured.', { exact: true }),
  ).toBeVisible();
  // Explicit UI fixture, not a live provider or model-quality assertion.
  await page.route('**/api/organizations/' + organizationId + '/ai', (route) =>
    route.fulfill({
      json:
        route.request().method() === 'GET'
          ? { enabled: true, provider: 'Anthropic', dailyLimit: 20 }
          : {
              content: 'Test fixture draft for human review',
              aiGenerated: true,
              requiresReview: true,
              provider: 'Anthropic',
            },
    }),
  );
  await page.reload();
  await page
    .getByLabel('Brief and context', { exact: true })
    .fill('A public technology workshop in Amman');
  await expect(page.getByRole('button', { name: 'Generate draft', exact: true })).toBeDisabled();
  await page
    .getByLabel(
      'I confirm this brief contains no participant personal information and is authorized for provider processing.',
    )
    .check();
  await page.getByRole('button', { name: 'Generate draft', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Review and edit draft', exact: true }),
  ).toHaveValue('Test fixture draft for human review');
  const copy = page.getByRole('button', { name: 'Copy approved draft', exact: true });
  await expect(copy).toBeDisabled();
  await page.getByLabel('I reviewed the content and its accuracy and approve its use.').check();
  await expect(copy).toBeEnabled();
  await page
    .getByRole('textbox', { name: 'Review and edit draft', exact: true })
    .fill('Revised draft');
  await expect(copy).toBeDisabled();
});

test('live room, organizer controls, and presenter results render through the authenticated browser', async ({
  page,
}) => {
  test.setTimeout(180000);
  const livePath = '/en/events/' + slug + '/live';
  await page.goto(livePath);
  await expect(page).toHaveURL(/\/en\/login\?next=/);
  await signIn(page, 'http://127.0.0.1:3000' + livePath);
  await expect(
    page.getByRole('heading', { name: 'Live audience browser event', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Which session should open?', { exact: true })).toBeVisible();

  await page.goto('/en/organizations/' + organizationId + '/dashboard/polls');
  await expect(
    page.getByRole('heading', { name: 'Live polling and Q&A', exact: true }),
  ).toBeVisible();
  await page.getByRole('combobox').selectOption({ label: 'Live audience browser event' });
  await expect(page.getByText('Which session should open?', { exact: true })).toBeVisible();

  await page.goto('/en/events/' + slug + '/presenter');
  await expect(page.getByText('Live audience results', { exact: true })).toBeVisible();
  await expect(page.getByText('Which session should open?', { exact: true })).toBeVisible();
  await expect(page.getByText('Product vision', { exact: true })).toBeVisible();
});
