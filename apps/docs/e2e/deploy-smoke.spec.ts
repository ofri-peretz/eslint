/**
 * Deploy Smoke Test
 *
 * Runs against a freshly-built docs site (locally via `next start` on the
 * Vercel-built output, OR remotely via SMOKE_URL → see playwright.smoke.config.ts).
 *
 * Purpose: catch the failure modes CLAUDE.md describes that the structural
 * vitest locks cannot catch on their own —
 *   - homepage sections silently disappear from the rendered DOM
 *     (component renders empty, no error)
 *   - cached external image URLs return non-2xx because the TTL outlived
 *     the upstream rotation
 *   - mobile (390px) layout collapses while desktop still looks fine
 *
 * If you add a new top-level homepage section, add its title to
 * REQUIRED_HOMEPAGE_TITLES below. The list is the deploy-time contract.
 */

import { test, expect } from '@playwright/test';

const REQUIRED_HOMEPAGE_TITLES = [
  'Secure your code',         // hero headline (split across two spans)
  'See it in action',
  'What it catches',
  'Trusted by developers',
  'Two Pillars of Excellence',
  'How it works',
  'Our edges',
];

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe('Deploy smoke: homepage', () => {
  test('every required section renders in the DOM', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const missing: string[] = [];
    for (const title of REQUIRED_HOMEPAGE_TITLES) {
      const locator = page.getByText(title, { exact: false }).first();
      if (!(await locator.isVisible().catch(() => false))) {
        missing.push(title);
      }
    }
    expect(missing, `Missing homepage sections: ${missing.join(', ')}`).toEqual([]);
  });

  test('every rendered image returns 2xx', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll the page so lazy-loaded images (TweetCard / DevToCard previews
    // below the fold) actually hit the network and populate `currentSrc`.
    await page.evaluate(async () => {
      const step = Math.max(window.innerHeight * 0.8, 600);
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');

    const urls = await page.$$eval('img', (imgs) =>
      imgs
        .map((i) => (i as HTMLImageElement).currentSrc || (i as HTMLImageElement).src)
        .filter(Boolean),
    );
    const unique = [...new Set(urls)].filter(
      (u) => u.startsWith('http://') || u.startsWith('https://'),
    );

    const failures: { url: string; status: number }[] = [];
    for (const url of unique) {
      try {
        const res = await page.request.fetch(url, { method: 'HEAD' });
        if (!res.ok()) failures.push({ url, status: res.status() });
      } catch {
        failures.push({ url, status: 0 });
      }
    }

    expect(
      failures,
      `Broken image URLs:\n${failures.map((f) => `  [${f.status}] ${f.url}`).join('\n')}`,
    ).toEqual([]);
  });

  test('every required section renders at mobile viewport (390px)', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const missing: string[] = [];
    for (const title of REQUIRED_HOMEPAGE_TITLES) {
      const locator = page.getByText(title, { exact: false }).first();
      if (!(await locator.isVisible().catch(() => false))) {
        missing.push(title);
      }
    }
    expect(missing, `Missing at mobile: ${missing.join(', ')}`).toEqual([]);
  });
});
