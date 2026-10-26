/**
 * Lock: the docs lead with oxlint / Vite+, and the oxlint content is derived,
 * never hand-typed.
 *
 * - Every plugin page and every rule page shows both engines as tabs, oxlint
 *   first (the default) and ESLint second, deep-linkable by fragment.
 * - `/docs/oxlint` lists every alias and the built-in overlap from data.
 * - `oxlint-plugin-security` is private until its parity gate holds; no docs
 *   page may name it.
 */
import { existsSync, globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { PLUGINS } from '@/lib/plugins';
import {
  loadOxlintOverlap,
  oxlintAliases,
  recommendedRules,
} from '@/lib/oxlint';

const APP = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(APP, rel), 'utf8');

describe('engine tabs', () => {
  const tabs = read('src/components/docs/engine-tabs.tsx');

  it('puts oxlint / Vite+ first, so it is the default tab', () => {
    expect(tabs).toMatch(/defaultValue="oxlint"/);
    expect(tabs).toMatch(
      /<TabsTrigger value="oxlint">[\s\S]*<TabsTrigger value="eslint">/,
    );
    // Values carry no spaces: they become Radix ids (aria-controls).
    expect(tabs).not.toMatch(/items=\{/);
  });

  it('remembers the choice and deep-links ESLint by fragment', () => {
    expect(tabs).toMatch(/groupId=\{ENGINE_GROUP\}\s+persist/);
    expect(tabs).toMatch(
      /<TabsContent\s+value="eslint"\s+id=\{ESLINT_ANCHOR\}/,
    );
    // The default never appears in the URL: choosing oxlint strips the hash.
    expect(tabs).toMatch(/replaceState\(null, '', pathname \+ search\)/);
  });

  it('installs the alias on oxlint and the plugin on ESLint, through the instrumented snippet', () => {
    expect(tabs).toMatch(/<InstallSnippet packages=\{alias\} dev \/>/);
    expect(tabs).toMatch(/<InstallSnippet packages=\{pkg\} dev \/>/);
    expect(tabs).toContain("from 'vite-plus'");
    expect(tabs).toContain("title: '.oxlintrc.json'");
  });

  it('every rule page gets the tabs from its slug', () => {
    const page = read('src/app/docs/[[...slug]]/page.tsx');
    expect(page).toMatch(
      /<EngineSetup plugin=\{rulePlugin\} rule=\{ruleName\} \/>/,
    );
  });

  it('every registered plugin has recommended rules to put in its oxlint config', () => {
    const empty = PLUGINS.filter(
      (p) => Object.keys(recommendedRules(p.slug)).length === 0,
    );
    expect(empty.map((p) => p.slug)).toEqual([]);
  });
});

describe('/docs/oxlint', () => {
  const page = read('content/docs/oxlint/index.mdx');

  it('renders the alias list and the overlap from data', () => {
    expect(page).toContain('<OxlintAliasList />');
    expect(page).toContain('<OxlintBuiltinOverlap />');
    expect(page).toContain('<ImportNextGaps />');
  });

  it('lists one alias per registered plugin', () => {
    expect(
      oxlintAliases()
        .map((a) => a.alias)
        .toSorted(),
    ).toEqual(PLUGINS.map((p) => `oxlint-plugin-${p.slug}`).toSorted());
  });

  it('the overlap map has the agreed shape and only names real rules', () => {
    const data = loadOxlintOverlap();
    expect(data.oxlintVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(data.builtinRuleCount).toBeGreaterThan(0);
    expect(data.overlap.length).toBeGreaterThan(0);
    const slugs = new Set(PLUGINS.map((p) => p.slug));
    for (const e of data.overlap) {
      expect(e.id).toBe(`${e.plugin}/${e.rule}`);
      expect(slugs.has(e.plugin), e.plugin).toBe(true);
      expect(e.builtin).toMatch(new RegExp(`^[a-z0-9_]+/${e.rule}$`));
      expect(['equivalent', 'differs', 'false-positive']).toContain(e.verdict);
    }
  });

  it('shows only equivalent entries as native, differs apart, false positives never', () => {
    const landing = read('src/components/docs/oxlint-landing.tsx');
    expect(landing).toMatch(/e\.verdict === 'equivalent'/);
    expect(landing).toMatch(/e\.verdict === 'differs'/);
    expect(landing).not.toMatch(/'false-positive'/);
    // The triage compares names and purpose, not behaviour.
    const copy = landing + read('content/docs/oxlint/index.mdx');
    expect(copy).not.toMatch(
      /identical behaviou?r|behaves identically|same behaviou?r/i,
    );
    expect(copy).toContain('native rule of the same name');
  });

  it('is in the sidebar right after Getting Started', () => {
    const meta = JSON.parse(read('content/docs/meta.json')) as {
      pages: string[];
    };
    expect(meta.pages.indexOf('oxlint')).toBe(
      meta.pages.indexOf('getting-started') + 1,
    );
  });
});

describe('oxlint-plugin-security stays private', () => {
  it('no docs content or source names it', () => {
    const files = [
      ...globSync('content/**/*.{md,mdx,json}', { cwd: APP }),
      ...globSync('src/**/*.{ts,tsx,json}', {
        cwd: APP,
        exclude: ['src/__tests__/**'],
      }),
    ];
    expect(files.length).toBeGreaterThan(400);
    const offenders = files.filter((f) =>
      /oxlint-plugin-security\b/.test(read(f)),
    );
    expect(offenders).toEqual([]);
  });

  it('is not a registered plugin, so no alias row can render it', () => {
    expect(existsSync(join(APP, 'content/docs/security/plugin-security'))).toBe(
      false,
    );
    expect(PLUGINS.some((p) => p.slug === 'security')).toBe(false);
  });
});
