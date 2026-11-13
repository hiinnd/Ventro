import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const installedChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  (process.platform === 'win32' && existsSync(installedChrome) ? installedChrome : undefined);

export default defineConfig({
  testDir: './test/ui',
  timeout: 90000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    launchOptions: { executablePath },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer:
    process.env.PLAYWRIGHT_PRODUCTION === '1'
      ? undefined
      : [
          {
            command: 'pnpm --filter @ventro/api start',
            url: 'http://127.0.0.1:4000/api/health',
            reuseExistingServer: !process.env.CI,
            timeout: 180000,
            env: {
              NEXT_TELEMETRY_DISABLED: '1',
              AUTH_RATE_NAMESPACE: 'ventro-browser-' + process.pid,
            },
          },
          {
            command: 'pnpm dev',
            url: 'http://127.0.0.1:3000/dev/design-system',
            reuseExistingServer: !process.env.CI,
            timeout: 180000,
            env: { NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1' },
          },
        ],
});
