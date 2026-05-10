#!/usr/bin/env tsx
/**
 * One-shot script: scan a list of routes with axe-core at maximum strictness
 * and print a deduplicated violation summary suitable for triage.
 *
 * Run while `npm run dev` is up:
 *   npx tsx apps/docs/scripts/a11y-summary.ts
 */

import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

const STRICT_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag2aaa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
  'ACT',
];

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'articles', path: '/articles' },
  { name: 'docs-getting-started', path: '/docs/getting-started' },
  {
    name: 'rule-page',
    path: '/docs/security/plugin-node-security/rules/no-sha1-hash',
  },
];

interface ViolationSummary {
  id: string;
  impact: string;
  help: string;
  helpUrl: string;
  tags: string[];
  routes: string[];
  occurrences: number;
  sampleTargets: string[];
}

type ColorScheme = 'light' | 'dark';
const SCHEMES: ColorScheme[] = ['light', 'dark'];

function routeKey(route: { name: string }, scheme: ColorScheme): string {
  return `${route.name} [${scheme}]`;
}

async function main() {
  const browser = await chromium.launch();
  const all: ViolationSummary[] = [];
  const byRoute: Record<string, number> = {};

  for (const scheme of SCHEMES) {
    // Each scheme uses a fresh context so the prefers-color-scheme override
    // doesn't leak across iterations. We rely on the browser's
    // prefers-color-scheme media query (set by Playwright's `colorScheme`
    // option) — next-themes' default 'system' setting picks that up.
    // A post-load `classList.add('dark')` backstop covers any timing gap.
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();

    for (const route of ROUTES) {
      const key = routeKey(route, scheme);
      console.log(`Scanning ${route.path} [${scheme}] ...`);
      try {
        await page.goto(`${BASE_URL}${route.path}`, {
          timeout: 60000,
          waitUntil: 'networkidle',
        });
        // Settle motion + lazy content.
        await page.waitForTimeout(500);

        // Backstop: toggle the .dark class on <html> + remove Next.js's
        // dev-only overlay (the <nextjs-portal> custom element renders an
        // un-scoped HTML document via shadow DOM that pollutes the scan).
        await page.evaluate((s) => {
          if (s === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
          document
            .querySelectorAll('nextjs-portal')
            .forEach((el) => el.remove());
        }, scheme);
        await page.waitForTimeout(150);

        const results = await new AxeBuilder({ page })
          .withTags(STRICT_TAGS)
          // Ignore dev-only Next.js / Turbopack overlay elements. They render
          // their own (un-scoped) HTML inside a custom element and pollute the
          // scan with violations that don't ship to production.
          .exclude('nextjs-portal')
          .exclude('[data-nextjs-version-checker]')
          .exclude('.turbopack-text')
          .analyze();

        byRoute[key] = results.violations.length;
        for (const v of results.violations) {
          const existing = all.find((e) => e.id === v.id);
          if (existing) {
            if (!existing.routes.includes(key)) existing.routes.push(key);
            existing.occurrences += v.nodes.length;
            for (const node of v.nodes) {
              const target = node.target.join(' ');
              if (
                existing.sampleTargets.length < 5 &&
                !existing.sampleTargets.includes(target)
              )
                existing.sampleTargets.push(target);
            }
          } else {
            all.push({
              id: v.id,
              impact: v.impact ?? 'unknown',
              help: v.help,
              helpUrl: v.helpUrl,
              tags: v.tags,
              routes: [key],
              occurrences: v.nodes.length,
              sampleTargets: v.nodes
                .slice(0, 5)
                .map((n) => n.target.join(' ')),
            });
          }
        }
      } catch (err) {
        console.error(`  Failed: ${(err as Error).message}`);
        byRoute[key] = -1;
      }
    }

    await context.close();
  }

  await browser.close();

  // Sort by impact severity, then by occurrences.
  const impactRank: Record<string, number> = {
    critical: 0,
    serious: 1,
    moderate: 2,
    minor: 3,
    unknown: 4,
  };
  all.sort(
    (a, b) =>
      (impactRank[a.impact] ?? 5) - (impactRank[b.impact] ?? 5) ||
      b.occurrences - a.occurrences,
  );

  const lines: string[] = [];
  lines.push('# A11y violations — strict scan');
  lines.push('');
  lines.push('## Routes');
  for (const [name, count] of Object.entries(byRoute)) {
    lines.push(
      count < 0
        ? `- ${name}: ❌ failed to scan`
        : `- ${name}: ${count} violations`,
    );
  }
  lines.push('');
  lines.push(
    `## Unique violations — ${all.length} total (${all.reduce((s, v) => s + v.occurrences, 0)} occurrences)`,
  );
  lines.push('');
  for (const v of all) {
    lines.push(
      `### [${v.impact}] \`${v.id}\` — ${v.routes.length} route(s), ${v.occurrences} occurrence(s)`,
    );
    lines.push(`- **${v.help}**`);
    lines.push(`- Routes: ${v.routes.join(', ')}`);
    lines.push(`- Tags: ${v.tags.join(', ')}`);
    lines.push(`- Help: ${v.helpUrl}`);
    lines.push(`- Sample targets:`);
    for (const t of v.sampleTargets) lines.push(`  - \`${t}\``);
    lines.push('');
  }

  const text = lines.join('\n');
  writeFileSync('a11y-report.md', text);
  console.log('\n' + text);
  console.log('\nWrote a11y-report.md');
  process.exit(all.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
