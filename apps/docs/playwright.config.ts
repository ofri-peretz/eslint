import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for docs layout E2E tests
 * 
 * Headless Mode (CI):
 * - Playwright runs headless by default when CI=true
 * - GitHub Actions, GitLab CI, etc. set this automatically
 * - Local: Set CI=true to test headless mode
 * 
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use */
  reporter: process.env.CI 
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['html', { outputFolder: 'playwright-report' }], ['list']],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Headless mode - explicit for clarity (default is true) */
    headless: true,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    /* Skip Firefox/WebKit in CI to speed up tests - uncomment if needed */
    ...(process.env.CI ? [] : [
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
    ]),
    /* Mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  
  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',
  
  /* Snapshot directory for visual regression tests */
  snapshotDir: './e2e/__snapshots__',
  
  /* Update snapshots on first run (creates baseline) */
  updateSnapshots: 'missing',
  
  /* Expect settings for visual comparisons */
  expect: {
    /* Threshold for screenshot comparison (0-1, lower = stricter) */
    toHaveScreenshot: {
      threshold: 0.15,
      maxDiffPixelRatio: 0.05,
    },
  },
});
