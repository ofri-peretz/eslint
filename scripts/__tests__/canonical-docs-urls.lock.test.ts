/**
 * Canonical docs URL lock.
 *
 * `meta.docs.url` is what ESLint hands to editors, CLI output and SARIF, so a wrong
 * value is a dead "see docs" link in every consumer's IDE — invisible from our own
 * site, which never renders it.
 *
 * It was wrong for 319 of 478 rules. Two causes, both locked here:
 *
 *  1. `createRule`'s default URL points at `packages/eslint-plugin/`, a package that
 *     does not exist. Every rule that does not override it inherits a 404.
 *  2. `withCanonicalDocsUrls` fixes that per plugin, but `docsUrlFor` hardcoded the
 *     `/docs/security/` path segment, so it could not express the 9 quality plugins
 *     and rollout stalled at 3 of 26.
 *
 * The invariant: every plugin that HAS documentation pages must be registered with
 * its real category and must stamp its rules on export.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO = resolve(__dirname, '../..');
const DOCS = join(REPO, 'apps/docs/content/docs');
const DEVKIT = join(REPO, 'packages/eslint-devkit/src/rule-creation/rule-creator.ts');

/** Plugins that ship documentation pages, discovered from the docs tree itself. */
function documentedPlugins(): { slug: string; category: string; pkg: string }[] {
  const out: { slug: string; category: string; pkg: string }[] = [];
  for (const category of ['security', 'quality']) {
    const dir = join(DOCS, category);
    if (!existsSync(dir)) continue;
    for (const slug of readdirSync(dir)) {
      if (!slug.startsWith('plugin-')) continue;
      out.push({ slug, category, pkg: `eslint-${slug}` });
    }
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

describe('canonical docs URLs', () => {
  const plugins = documentedPlugins();
  const devkit = readFileSync(DEVKIT, 'utf-8');

  it('finds documented plugins to audit (guards a vacuous pass)', () => {
    expect(plugins.length).toBeGreaterThanOrEqual(20);
  });

  it('docsUrlFor is category-aware, not hardcoded to one section', () => {
    // The original bug: `/docs/security/${pluginSlug}/` for every plugin.
    expect(devkit).not.toMatch(/`https:\/\/eslint\.interlace\.tools\/docs\/security\/\$\{pluginSlug\}/);
    expect(devkit).toMatch(/\/docs\/\$\{category\}\/\$\{pluginSlug\}\/rules\/\$\{ruleName\}/);
  });

  it.each(plugins)('$slug is registered under its real category', ({ slug, category }) => {
    const entry = new RegExp(`'${slug}':\\s*'${category}'`);
    expect(devkit).toMatch(entry);
  });

  it.each(plugins)('$slug stamps canonical URLs on export', ({ slug, pkg }) => {
    const index = join(REPO, 'packages', pkg, 'src/index.ts');
    expect(existsSync(index), `${pkg}/src/index.ts should exist`).toBe(true);
    const src = readFileSync(index, 'utf-8');
    // Anchored to the call, so the explanatory comment above it cannot satisfy this.
    expect(src).toMatch(new RegExp(`withCanonicalDocsUrls\\('${slug}',\\s*rules\\)`));
  });

  it('the dead placeholder path never spreads beyond the devkit default', () => {
    const dead = 'packages/eslint-plugin/docs/rules';
    const offenders = plugins
      .map(({ pkg }) => join(REPO, 'packages', pkg, 'src/index.ts'))
      .filter((f) => existsSync(f) && readFileSync(f, 'utf-8').includes(dead));
    expect(offenders).toEqual([]);
  });
});
