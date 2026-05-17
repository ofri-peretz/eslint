/**
 * Playwright config — deploy smoke
 *
 * Two run modes:
 *   - local (default):   webServer runs `npm run start` against the
 *                        Vercel-built `.next` output, smokes against
 *                        http://localhost:3000. This is the pre-deploy
 *                        gate in `.github/workflows/deploy-docs.yml`.
 *   - remote (SMOKE_URL): no webServer; smokes whatever URL is passed.
 *                        Used for post-deploy verification against a
 *                        Vercel preview / production URL.
 *
 * Scope is intentionally tiny — one spec, one browser, no retries on
 * green — so the deploy gate adds ~30s, not minutes.
 */

import { defineConfig, devices } from '@playwright/test';

const remoteUrl = process.env.SMOKE_URL;

export default defineConfig({
  testDir: './e2e',
  testMatch: /deploy-smoke\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: remoteUrl ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // When SMOKE_URL is set, do NOT spin up a local server — we're smoking a
  // remote URL. Otherwise, boot `next start` against the prebuilt `.next`.
  webServer: remoteUrl
    ? undefined
    : {
        command: 'npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },

  outputDir: 'test-results-smoke/',
});
