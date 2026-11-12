import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

const origin = process.env.LIGHTHOUSE_URL ?? 'http://127.0.0.1:3000';
const output = resolve('../../.local/lighthouse');
await mkdir(output, { recursive: true });
const installedChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const chrome = await launch({
  chromePath:
    process.env.CHROME_PATH ?? (existsSync(installedChrome) ? installedChrome : undefined),
  chromeFlags: ['--headless', '--disable-gpu', '--no-first-run'],
});
try {
  const results = [];
  for (const [locale, device] of [
    ['en', 'mobile'],
    ['en', 'desktop'],
    ['ar', 'mobile'],
  ]) {
    const desktop = device === 'desktop';
    const result = await lighthouse(new URL('/' + locale, origin).href, {
      port: chrome.port,
      output: ['html', 'json'],
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      ...(desktop
        ? {
            formFactor: 'desktop',
            screenEmulation: {
              mobile: false,
              width: 1350,
              height: 940,
              deviceScaleFactor: 1,
              disabled: false,
            },
            throttling: {
              rttMs: 40,
              throughputKbps: 10240,
              cpuSlowdownMultiplier: 1,
              requestLatencyMs: 0,
              downloadThroughputKbps: 0,
              uploadThroughputKbps: 0,
            },
          }
        : {}),
    });
    if (!result || result.lhr.runtimeError)
      throw new Error(JSON.stringify(result?.lhr.runtimeError ?? 'No Lighthouse result'));
    const name = locale + '-' + device;
    await writeFile(resolve(output, name + '.html'), result.report[0]);
    await writeFile(resolve(output, name + '.json'), result.report[1]);
    const scores = Object.fromEntries(
      Object.entries(result.lhr.categories).map(([key, value]) => [
        key,
        Math.round(value.score * 100),
      ]),
    );
    const finding = {
      name,
      scores,
      metrics: Object.fromEntries(
        [
          'first-contentful-paint',
          'largest-contentful-paint',
          'total-blocking-time',
          'cumulative-layout-shift',
          'speed-index',
        ].map((id) => [id, result.lhr.audits[id].displayValue]),
      ),
      warnings: result.lhr.runWarnings,
      failedAudits: Object.values(result.lhr.audits)
        .filter((audit) => audit.score !== null && audit.score < 1)
        .map((audit) => ({ id: audit.id, title: audit.title, value: audit.displayValue })),
    };
    results.push(finding);
    console.log(JSON.stringify(finding, null, 2));
  }
  await writeFile(resolve(output, 'summary.json'), JSON.stringify(results, null, 2) + '\n');
} finally {
  await chrome.kill();
}
