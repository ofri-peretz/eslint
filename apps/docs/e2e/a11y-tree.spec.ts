/**
 * Accessibility-tree walk (AT-walk).
 *
 * Complements the axe scan with structural assertions that go beyond what
 * axe catches automatically — the things a screen-reader user actually
 * navigates by:
 *   - Page title is descriptive (not empty, not "Page")
 *   - Exactly one `<main>` landmark
 *   - At least one H1
 *   - Heading hierarchy doesn't skip levels
 *   - Every interactive element has a non-empty accessible name
 *   - Every image has alt or aria-hidden
 *   - Every form input is labeled
 *
 * Acts as a stand-in for manual AT spot checks (UX_PHILOSOPHY layer 6).
 * Real VoiceOver / NVDA passes still happen quarterly per the doc, but
 * this catches the regression-class violations between those passes.
 */

import { test, expect } from '@playwright/test';

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'articles', path: '/articles' },
  { name: 'docs-getting-started', path: '/docs/getting-started' },
  {
    name: 'rule-page',
    path: '/docs/security/plugin-node-security/rules/no-sha1-hash',
  },
];

for (const route of ROUTES) {
  test.describe(`AT-walk: ${route.name}`, () => {
    test('page has a descriptive title', async ({ page }) => {
      await page.goto(route.path);
      const title = await page.title();
      expect(title.trim().length).toBeGreaterThan(0);
      expect(title).not.toMatch(/^(Page|Untitled|404|Loading)$/i);
    });

    test('exactly one <main> landmark in the document', async ({ page }) => {
      await page.goto(route.path);
      // Scope to body so the Next.js dev portal's <nextjs-portal> custom
      // element's internal shadow doc doesn't count.
      const count = await page
        .locator('body main, body [role="main"]')
        .count();
      expect(count).toBe(1);
    });

    test('page has at least one H1', async ({ page }) => {
      await page.goto(route.path);
      const h1s = await page.locator('h1').count();
      expect(h1s).toBeGreaterThanOrEqual(1);
    });

    test('heading hierarchy does not skip levels', async ({ page }) => {
      await page.goto(route.path);
      const levels = await page.evaluate(() => {
        const headings = Array.from(
          document.body.querySelectorAll('h1, h2, h3, h4, h5, h6'),
        );
        return headings.map((h) => parseInt(h.tagName.slice(1), 10));
      });
      // First heading must be H1.
      if (levels.length > 0) {
        expect(levels[0]).toBe(1);
      }
      // No skips greater than 1 (H1 → H3 not allowed; H1 → H2 fine).
      for (let i = 1; i < levels.length; i++) {
        const jump = levels[i] - levels[i - 1];
        expect(jump).toBeLessThanOrEqual(1);
      }
    });

    test('every form input is labeled', async ({ page }) => {
      await page.goto(route.path);
      const unlabeled = await page.evaluate(() => {
        const inputs = Array.from(
          document.body.querySelectorAll<HTMLElement>(
            'input:not([type="hidden"]), select, textarea',
          ),
        );
        return inputs
          .filter((el) => {
            // accept any of: aria-label, aria-labelledby, wrapped <label>,
            // or `for=`-linked label.
            if (el.getAttribute('aria-label')) return false;
            if (el.getAttribute('aria-labelledby')) return false;
            if (el.id && document.querySelector(`label[for="${el.id}"]`))
              return false;
            if (el.closest('label')) return false;
            return true;
          })
          .map(
            (el) =>
              `${el.tagName}${el.id ? '#' + el.id : ''}${
                el.getAttribute('type') ? `[type=${el.getAttribute('type')}]` : ''
              }`,
          );
      });
      expect(unlabeled).toEqual([]);
    });

    test('every icon-only button/link has an accessible name', async ({
      page,
    }) => {
      await page.goto(route.path);
      // An icon-only interactive element = no visible text + contains an
      // icon (svg/img). The accessible name can come from aria-label,
      // aria-labelledby, title, OR the inner img's alt (a link wrapping
      // an `<img alt="...">` adopts the alt as its accessible name —
      // this is the standard pattern for avatar/profile links).
      const unlabeled = await page.evaluate(() => {
        const els = Array.from(
          document.body.querySelectorAll<HTMLElement>('button, a[href]'),
        );
        return els
          .filter((el) => {
            const text = (el.textContent ?? '').trim();
            if (text.length > 0) return false;
            const hasIcon = !!el.querySelector('svg, img');
            if (!hasIcon) return false;
            if (el.getAttribute('aria-label')) return false;
            if (el.getAttribute('aria-labelledby')) return false;
            if (el.getAttribute('title')) return false;
            // Inner <img alt="..."> provides the accessible name.
            const innerImg = el.querySelector('img');
            if (innerImg && innerImg.getAttribute('alt')?.trim()) return false;
            return true;
          })
          .map((el) => el.outerHTML.slice(0, 160));
      });
      expect(unlabeled).toEqual([]);
    });

    test('every img has alt (or is decoratively aria-hidden)', async ({
      page,
    }) => {
      await page.goto(route.path);
      const missing = await page.evaluate(() => {
        const imgs = Array.from(
          document.body.querySelectorAll<HTMLImageElement>('img'),
        );
        return imgs
          .filter(
            (img) =>
              img.getAttribute('alt') === null &&
              img.getAttribute('aria-hidden') !== 'true',
          )
          .map((img) => img.src);
      });
      expect(missing).toEqual([]);
    });
  });
}
