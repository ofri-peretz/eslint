/**
 * Accessibility scan — strict gate at the WCAG 2.2 AA floor.
 *
 * Tags applied:
 *   - wcag2a, wcag2aa            → WCAG 2.0 levels A and AA
 *   - wcag21a, wcag21aa          → WCAG 2.1 levels A and AA
 *   - wcag22aa                   → WCAG 2.2 AA (target sizes, focus appearance)
 *   - best-practice              → axe-core's own best-practice rules (beyond WCAG)
 *   - ACT                        → Accessibility Conformance Testing rules
 *
 * Goal: zero violations across every tag, on every route. Failures block CI.
 *
 * AAA is intentionally out of scope: the project floor is WCAG 2.2 AA. AAA
 * criteria (color-contrast-enhanced 7:1, etc.) are tracked separately as
 * aspirational and audited via `npm run a11y:gradients`, not gated in CI.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const STRICT_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
  'ACT',
];

interface Route {
  name: string;
  path: string;
  /** Wait for this selector before running the scan (ensures content loaded). */
  ready?: string;
}

const ROUTES: Route[] = [
  { name: 'home', path: '/', ready: 'main, [role=main], h1' },
  { name: 'articles', path: '/articles', ready: 'h1' },
  { name: 'docs-getting-started', path: '/docs/getting-started', ready: 'h1' },
  {
    name: 'rule-page',
    path: '/docs/security/plugin-node-security/rules/no-sha1-hash',
    ready: 'h1',
  },
];

type Scheme = 'light' | 'dark';
const SCHEMES: Scheme[] = ['light', 'dark'];

for (const scheme of SCHEMES) {
  test.describe(`Accessibility — strictest config (${scheme} mode)`, () => {
    test.use({ colorScheme: scheme });

    for (const route of ROUTES) {
      test(`${route.name} → no violations`, async ({ page }) => {
        await page.goto(route.path);
        if (route.ready) {
          await page.waitForSelector(route.ready, { timeout: 30000 });
        }

        // Toggle html.dark + remove Next.js dev overlay (<nextjs-portal>
        // renders an un-scoped doc via shadow DOM that pollutes the scan).
        await page.evaluate((s) => {
          if (s === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
          document
            .querySelectorAll('nextjs-portal')
            .forEach((el) => el.remove());
        }, scheme);

        // Settle decorative motion + lazy content.
        await page.waitForTimeout(500);

        const results = await new AxeBuilder({ page })
          .withTags(STRICT_TAGS)
          // Scope axe to the main document body. Excludes Next.js dev
          // overlay (<nextjs-portal>) which renders an un-scoped HTML
          // document via shadow-DOM that doesn't ship to production.
          .include('body')
          .analyze();

        // Helpful debug output when failing.
        if (results.violations.length > 0) {
          console.log(
            `\n=== A11Y violations on ${route.name} [${scheme}] (${route.path}) ===`,
          );
          for (const v of results.violations) {
            console.log(
              `\n[${v.impact ?? 'unknown'}] ${v.id} — ${v.help}`,
            );
            console.log(`  tags: ${v.tags.join(', ')}`);
            console.log(`  helpUrl: ${v.helpUrl}`);
            for (const node of v.nodes.slice(0, 3)) {
              console.log(`  • ${node.target.join(' ')}`);
              console.log(`    ${node.failureSummary?.replace(/\n/g, ' ')}`);
            }
          }
        }

        expect(results.violations).toEqual([]);
      });
    }
  });
}

test.describe('Accessibility — reduced-motion preference', () => {
  test.use({ colorScheme: 'dark' });

  test('home with prefers-reduced-motion: respects user preference', async ({
    page,
    context,
  }) => {
    // Force reduced-motion preference at the browser level.
    await context.addInitScript(() => {
      const original = window.matchMedia;
      window.matchMedia = (query: string): MediaQueryList => {
        const list = original(query);
        if (query.includes('prefers-reduced-motion')) {
          return {
            ...list,
            matches: true,
            media: query,
            onchange: null,
            addEventListener: list.addEventListener.bind(list),
            removeEventListener: list.removeEventListener.bind(list),
            dispatchEvent: list.dispatchEvent.bind(list),
            addListener: list.addListener.bind(list),
            removeListener: list.removeListener.bind(list),
          } as MediaQueryList;
        }
        return list;
      };
    });

    await page.goto('/');
    await page.waitForSelector('h1', { timeout: 30000 });
    await page.waitForTimeout(500);

    const results = await new AxeBuilder({ page })
      .withTags(STRICT_TAGS)
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
