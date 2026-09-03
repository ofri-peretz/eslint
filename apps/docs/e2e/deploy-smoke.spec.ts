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
 *   - wide (1728px) layout breaks while every gate runs at defaults —
 *     the TOC grid regression shipped exactly this way (#697): the TOC is
 *     max-xl:hidden, so nothing under 1280px could ever see it break
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

// 16" MacBook logical resolution — the widest common real-world viewport, and
// the exact screen the #697 TOC regression was reported on. Everything the
// default 1280×720 runners cannot see starts here.
const WIDE_VIEWPORT = { width: 1728, height: 1117 };

/** Representative page per docs template; each renders a distinct layout. */
const WIDE_PAGES = [
  '/docs/getting-started',
  '/docs/security/plugin-jwt-security',
  '/docs/security/plugin-jwt-security/rules/no-algorithm-none',
];

test.describe('Deploy smoke: wide viewport (1728px)', () => {
  for (const path of WIDE_PAGES) {
    test(`no layout break on ${path}`, async ({ page }) => {
      await page.setViewportSize(WIDE_VIEWPORT);
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const layout = await page.evaluate(() => {
        const doc = document.documentElement;
        const article = document.querySelector('#main-content article');
        const a = article?.getBoundingClientRect() ?? null;
        // Any fixed/sticky/static sidebar that intersects the article at this
        // width is a regression — at 1728px there is room for everything.
        const toc =
          document.getElementById('nd-toc') ??
          document.getElementById('nd-toc-placeholder');
        const t = toc?.getBoundingClientRect() ?? null;
        return {
          horizontalScroll: doc.scrollWidth > doc.clientWidth,
          article: a ? { x: a.x, w: a.width } : null,
          toc: t ? { x: t.x, w: t.width, visible: t.width > 0 && t.height > 0 } : null,
        };
      });

      expect(layout.horizontalScroll, 'page scrolls horizontally at 1728px').toBe(false);
      expect(layout.article, 'article missing from #main-content').not.toBeNull();
      // Every WIDE_PAGES entry is a docs page with headings, so the TOC element
      // must exist. Without this, a fumadocs upgrade that renames #nd-toc would
      // skip the overlap assertion silently — a green gate guarding nothing,
      // exactly the vacuous-lock failure mode this repo hunts.
      expect(
        layout.toc,
        'TOC element not found — selector out of date, the #697 gate is void',
      ).not.toBeNull();

      if (layout.toc?.visible && layout.article) {
        const tocOverlapsArticle =
          layout.toc.x < layout.article.x + layout.article.w &&
          layout.toc.x + layout.toc.w > layout.article.x;
        expect(
          tocOverlapsArticle,
          `TOC (x=${layout.toc.x} w=${layout.toc.w}) overlaps the article ` +
            `(x=${layout.article.x} w=${layout.article.w}) — the #697 grid regression`,
        ).toBe(false);
      }
    });
  }
});
