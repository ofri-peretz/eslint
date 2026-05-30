/**
 * Vercel Analytics Lock Test
 *
 * Vercel Web Analytics was silently dropped once before (commit 03c3f6885,
 * a nav refactor) when the `<Analytics />` mount and the `@vercel/analytics`
 * dependency were both removed in unrelated cleanup. Nothing failed CI, so
 * the docs site ran without the Vercel traffic / Web Vitals dashboard until
 * someone noticed by eye.
 *
 * This lock refuses to ship if either half of the integration disappears:
 *   - The `@vercel/analytics` runtime dependency is gone from package.json.
 *   - The root layout no longer imports + mounts <Analytics />.
 *
 * Vercel Analytics is intentionally independent of PostHog (locked
 * separately in posthog-provider-lock.test.tsx) — we report to both. See
 * the comment block in src/app/layout.tsx.
 *
 * Structural string checks — no bundle render. Cheap, hard to bypass.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const layoutPath = join(ROOT, 'src/app/layout.tsx');
const pkgPath = join(ROOT, 'package.json');

let layoutSrc = '';
let pkg: { dependencies?: Record<string, string> } = {};

beforeAll(() => {
  layoutSrc = readFileSync(layoutPath, 'utf-8');
  pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
});

describe('Vercel Analytics: dependency', () => {
  it('@vercel/analytics is a runtime dependency', () => {
    expect(pkg.dependencies?.['@vercel/analytics']).toBeTruthy();
  });
});

describe('Vercel Analytics: layout integration', () => {
  it('root layout imports Analytics from @vercel/analytics/next', () => {
    expect(layoutSrc).toMatch(
      /import\s*\{\s*Analytics\s*\}\s*from\s*['"]@vercel\/analytics\/next['"]/,
    );
  });
  it('root layout mounts <Analytics />', () => {
    expect(layoutSrc).toMatch(/<Analytics\s*\/>/);
  });
});
