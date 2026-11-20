/**
 * Regression lock: search and answer-engine metadata (SEO/AEO audit,
 * 2026-11-19, 621 live pages crawled).
 *
 * What the crawl found, and what each block below holds shut:
 *   - rule pages titled with the bare slug, so `no-unsafe-query` had nine
 *     identical titles, and 17 rule pages shared one placeholder description;
 *   - zero JSON-LD on any page, and no `<lastmod>` in the sitemap;
 *   - an indexable duplicate of the whole site on `eslint-one.vercel.app`;
 *   - the home page with no canonical;
 *   - broken internal links from three generators (README relative links,
 *     the /stats category map, the rules tables' hand list);
 *   - `/docs` (a 308) linked from every page.
 *
 * The rule-page checks run the real title/description builders over every
 * rule MDX file on disk, so a new rule with a placeholder description, or a
 * second plugin shipping a same-named rule, is caught here, not by a crawler.
 */
import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Link, Root } from 'mdast';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import contentDates from '@/data/content-dates.json';
import { remarkRelativeLinks } from '@/lib/mdx-compiler';
import { PLUGINS, pluginDocsPath } from '@/lib/plugins';
import {
  PLUGIN_SEARCH_TITLES,
  classifyDocsSlugs,
  docsDateModified,
  isPlaceholderDescription,
  pluginTitle,
  ruleDescription,
  ruleSummary,
  ruleTechArticle,
  ruleTitle,
  serializeJsonLd,
  shortWhat,
} from '@/lib/seo';
import { SITE_ORIGIN } from '@/lib/site-config';
import { GitHubCard } from '@/components/docs/github-card';
import { RuleNextStep } from '@/components/docs/rule-next-step';
import { ruleNextStep } from '@/lib/rule-next-step';

const APP = join(__dirname, '../..');
const CONTENT = join(APP, 'content/docs');
const read = (rel: string) => readFileSync(join(APP, rel), 'utf8');

/** Code only: comments can neither satisfy nor trip a source assertion. */
const code = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, (_m, p1: string) => p1);

function frontmatterDescription(source: string): string | undefined {
  const fm = /^---\n([\s\S]*?)\n---/.exec(source)?.[1] ?? '';
  const raw = /^description:\s*(.*)$/m.exec(fm)?.[1]?.trim();
  if (!raw) return undefined;
  return raw.replace(/^(['"])([\s\S]*)\1$/, '$2');
}

const rulePages = globSync('*/plugin-*/rules/*.mdx', { cwd: CONTENT })
  .filter((f) => !f.endsWith('/index.mdx'))
  .map((file) => {
    const slugs = file.replace(/\.mdx$/, '').split('/');
    const kind = classifyDocsSlugs(slugs);
    if (kind.kind !== 'rule') throw new Error(`not a rule page: ${file}`);
    const summary = ruleSummary(
      kind.plugin,
      kind.rule,
      frontmatterDescription(readFileSync(join(CONTENT, file), 'utf8')),
    );
    return {
      file,
      slugs,
      ...kind,
      summary,
      title: ruleTitle(kind.plugin, kind.rule, summary),
      description: ruleDescription(kind.plugin, kind.rule, summary),
    };
  });

describe('rule pages: unique, query-shaped titles and real descriptions', () => {
  it('found the rule pages', () => {
    expect(rulePages.length).toBeGreaterThan(450);
  });

  it('every title is `<rule>: <what it catches> | eslint-plugin-<plugin>`', () => {
    const bad = rulePages.filter(
      (p) =>
        !p.title.startsWith(`${p.rule}: `) ||
        !p.title.endsWith(` | eslint-plugin-${p.plugin}`) ||
        p.title.length <= `${p.rule}:  | eslint-plugin-${p.plugin}`.length + 8,
    );
    expect(bad.map((p) => `${p.file} → ${p.title}`)).toEqual([]);
  });

  it('no two rule pages share a title', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const p of rulePages) {
      const prior = seen.get(p.title);
      if (prior) dupes.push(`${p.title}: ${prior} + ${p.file}`);
      seen.set(p.title, p.file);
    }
    expect(dupes).toEqual([]);
  });

  it('no two rule pages share a description', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const p of rulePages) {
      const prior = seen.get(p.description);
      if (prior) dupes.push(`${p.description}: ${prior} + ${p.file}`);
      seen.set(p.description, p.file);
    }
    expect(dupes).toEqual([]);
  });

  it('no description is a placeholder ("CWE-319", "LLM-optimized error messages…")', () => {
    const bad = rulePages.filter((p) =>
      isPlaceholderDescription(p.summary, p.rule),
    );
    expect(bad.map((p) => `${p.file}: ${p.summary}`)).toEqual([]);
  });

  it('every rule page builds a TechArticle; dated ones carry dateModified', () => {
    for (const p of rulePages) {
      const date = docsDateModified(p.file, p.slugs);
      const ld = ruleTechArticle({
        plugin: p.plugin,
        rule: p.rule,
        path: `/docs/${p.slugs.join('/')}`,
        pluginPath: pluginDocsPath(p.plugin) ?? '',
        headline: p.title,
        description: p.description,
        dateModified: date,
      });
      expect(ld['@type']).toBe('TechArticle');
      expect(ld.url.startsWith(`${SITE_ORIGIN}/docs/`)).toBe(true);
      if (date) expect(ld.dateModified).toBe(date);
    }
  });

  it('the date manifest covers the committed rule pages (the generator ran)', () => {
    const dated = rulePages.filter((p) => docsDateModified(p.file, p.slugs));
    // Not 100%: a commit that adds a rule cannot also contain its own date.
    expect(dated.length / rulePages.length).toBeGreaterThan(0.9);
  });
});

describe('plugin pages', () => {
  it('every registered plugin has a search title, and they are unique', () => {
    expect(PLUGINS.filter((p) => !PLUGIN_SEARCH_TITLES[p.slug])).toEqual([]);
    const titles = PLUGINS.map((p) => pluginTitle(p.slug));
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('every registered plugin has a docs path that exists, with a rules index', () => {
    const missing = PLUGINS.filter((p) => {
      const path = pluginDocsPath(p.slug)!.replace(/^\/docs\//, '');
      return (
        globSync(`${path}/index.mdx`, { cwd: CONTENT }).length === 0 ||
        globSync(`${path}/rules/index.mdx`, { cwd: CONTENT }).length === 0
      );
    });
    expect(missing.map((p) => p.slug)).toEqual([]);
  });
});

describe('the docs route and sitemap wire it in', () => {
  const page = code(read('src/app/docs/[[...slug]]/page.tsx'));
  const sitemap = code(read('src/app/sitemap.ts'));

  it('renders JSON-LD in the server HTML of every docs page', () => {
    expect(page).toMatch(/<JsonLd data=\{seo\.jsonLd\} \/>/);
  });

  it('takes title and description from docsSeo, not the bare frontmatter', () => {
    expect(page).toMatch(/title: seo\.title/);
    expect(page).toMatch(/description: seo\.description/);
  });

  it('dates sitemap entries from git, never from the clock', () => {
    expect(sitemap).toMatch(/lastModified: docsDateModified\(/);
    expect(sitemap).not.toMatch(/new Date\(/);
  });

  it('top-level pages and the home page carry JSON-LD; the home page a canonical', () => {
    for (const f of [
      'src/app/(home)/page.tsx',
      'src/app/(home)/play/page.tsx',
      'src/app/plugins/page.tsx',
      'src/app/stats/page.tsx',
      'src/app/articles/page.tsx',
      'src/app/scorecard/page.tsx',
      'src/app/changelog/page.tsx',
    ])
      // Raw source: these pages render code samples whose `/*` globs would
      // confuse the comment stripper.
      expect(read(f), f).toMatch(/<JsonLd data=\{/);
    expect(read('src/app/(home)/page.tsx')).toMatch(
      /alternates: \{ canonical: '\/' \}/,
    );
  });

  it('the date manifest names only plugin package docs', () => {
    const keys = Object.keys(
      (contentDates as { packages: Record<string, string> }).packages,
    );
    expect(keys.filter((k) => !k.startsWith('eslint-plugin-'))).toEqual([]);
  });
});

describe('one indexable host', () => {
  const config = code(read('next.config.mjs'));

  it('next.config names the same production origin as site-config', () => {
    expect(config).toContain(`const SITE_ORIGIN = '${SITE_ORIGIN}'`);
  });

  it('308s the Vercel production alias to the canonical host', () => {
    expect(config).toContain("'eslint-one.vercel.app'");
    expect(config).toMatch(/\.\.\.hostRedirects/);
    expect(config).toMatch(/permanent: true/);
  });

  it('sends noindex on every other non-local host', () => {
    expect(config).toMatch(
      /missing: \[\{ type: 'host', value: INDEXABLE_HOSTS \}\]/,
    );
    expect(config).toContain("{ key: 'X-Robots-Tag', value: 'noindex' }");
    expect(config).toMatch(
      /headers: async \(\) => \[\s*nonCanonicalHostHeaders/,
    );
  });
});

describe('internal links', () => {
  const linkAfter = (url: string, pluginName: string) => {
    const node: Link = { type: 'link', url, children: [] };
    const tree: Root = {
      type: 'root',
      children: [{ type: 'paragraph', children: [node] }],
    };
    remarkRelativeLinks({ pluginName })()(tree);
    return node.url;
  };

  it('README links that climb out of the package go to the file on GitHub', () => {
    expect(
      linkAfter('../../docs/ESLINT_VERSION_SUPPORT.md', 'node-security'),
    ).toBe(
      'https://github.com/ofri-peretz/eslint/blob/main/docs/ESLINT_VERSION_SUPPORT.md',
    );
  });

  it('/stats links each plugin to its registry pillar, not its stats category', () => {
    const page = code(read('src/app/stats/page.tsx'));
    expect(page).toMatch(/pluginDocsPath\(slug\)/);
  });

  it('rules tables link only real rule ids of the plugin, from the registry pillar', () => {
    const table = code(read('src/components/docs/rules-table.tsx'));
    // Comma lists and "(ours)" notes from comparison tables became 404 links.
    expect(table).toMatch(/pluginRuleIds\.has\(ruleName\)/);
    expect(table).toMatch(/PLUGINS_BY_SLUG\[plugin\]\?\.pillar/);
  });

  it('no page links to /docs, which is only a redirect', () => {
    const files = globSync('src/**/*.{ts,tsx}', {
      cwd: APP,
      exclude: ['src/__tests__/**'],
    });
    const offenders = files.filter((f) =>
      /(?:href=|url:\s*)["']\/docs["']/.test(code(read(f))),
    );
    expect(offenders).toEqual([]);
  });
});

describe('builders', () => {
  it('shortWhat keeps the first clause, drops filler, keeps acronyms', () => {
    expect(
      shortWhat(
        'Detects dangerous innerHTML/outerHTML assignments that can lead to Cross-Site Scripting (XSS)',
      ),
    ).toBe('detects dangerous innerHTML/outerHTML assignments');
    expect(shortWhat('JWT tokens without expiry. More text')).toBe(
      'JWT tokens without expiry',
    );
  });

  it('serializeJsonLd cannot close its own script element', () => {
    expect(
      serializeJsonLd({ a: '</script><script>alert(1)</script>' }),
    ).not.toContain('</script>');
  });

  it('classifies slugs', () => {
    expect(classifyDocsSlugs(['security', 'plugin-jwt-security'])).toEqual({
      kind: 'plugin',
      plugin: 'jwt-security',
    });
    expect(
      classifyDocsSlugs([
        'security',
        'plugin-jwt-security',
        'rules',
        'no-weak-secret',
      ]),
    ).toEqual({ kind: 'rule', plugin: 'jwt-security', rule: 'no-weak-secret' });
    expect(classifyDocsSlugs(['getting-started'])).toEqual({ kind: 'other' });
  });
});

/**
 * Conversion surfaces (PostHog analysis, 2026-11-20): rule pages are 57% of
 * entries, 2.5% of those reach a plugin page, and these docs sent one visitor in
 * 808 to GitHub. The GitHub card (every docs page) and the Next step block
 * (every rule page) are generated, not hand-written, so the lock is: the
 * routes mount them, and rendering them for every rule page on disk yields the
 * card, the plugin it belongs to, a real plugin page, an install line, the
 * recommended-preset config and the links the funnel is measured on.
 */
describe('GitHub card and Next step block on every rule page', () => {
  const page = code(read('src/app/docs/[[...slug]]/page.tsx'));
  const layout = code(read('src/app/docs/layout.tsx'));

  it('the docs layout puts the card in the sidebar, with a build-time star count', () => {
    expect(layout).toMatch(/banner: <GitHubCard stars=\{stars\} \/>/);
    expect(layout).toMatch(/await getGitHubStars\(\)/);
    const card = read('src/components/docs/github-card.tsx');
    expect(card).not.toMatch(/'use client'|useEffect|fetch\(/);
    expect(card).toMatch(/data-github-card/);
  });

  it('the docs route renders the inline card and the Next step block on rule pages', () => {
    expect(page).toMatch(/<GitHubCard stars=\{stars\} variant="inline" \/>/);
    expect(page).toMatch(
      /isRulePage && ruleName \? \(\s*<RuleNextStep plugin=\{rulePlugin\} rule=\{ruleName\} \/>/,
    );
  });

  it('the Next step block sits before the rule body, after the summary', () => {
    expect(page.indexOf('<DocsDescription>')).toBeLessThan(
      page.indexOf('<RuleNextStep'),
    );
    expect(page.indexOf('<RuleNextStep')).toBeLessThan(page.indexOf('<MDX '));
  });

  it('the card says "View on GitHub" and never asks for a star', () => {
    const card = read('src/components/docs/github-card.tsx');
    const text = card.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(text).toContain('View on GitHub');
    expect(text).not.toMatch(/Star (us|the repo|on GitHub)|please star/i);
  });

  it('every rule page renders the block with plugin, install, preset config and links', () => {
    const bad: string[] = [];
    for (const p of rulePages) {
      const data = ruleNextStep(p.plugin);
      if (!data) {
        bad.push(`${p.file}: no next-step data`);
        continue;
      }
      const html = renderToStaticMarkup(
        createElement(RuleNextStep, { plugin: p.plugin, rule: p.rule }),
      );
      const want = [
        `data-next-step="${p.rule}"`,
        `eslint-plugin-${p.plugin}`,
        `npm install -D eslint-plugin-${p.plugin}`,
        'configs.recommended',
        `href="${pluginDocsPath(p.plugin)}"`,
        `https://www.npmjs.com/package/eslint-plugin-${p.plugin}`,
        `https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-${p.plugin}`,
      ];
      for (const w of want)
        if (!html.includes(w)) bad.push(`${p.file}: missing ${w}`);
      // The plugin page the block links to exists on disk.
      const dir = pluginDocsPath(p.plugin)!.replace(/^\/docs\//, '');
      if (globSync(`${dir}/index.mdx`, { cwd: CONTENT }).length === 0)
        bad.push(`${p.file}: plugin page ${dir} missing`);
    }
    expect(bad).toEqual([]);
  });

  it('the card renders the repo, the count when known, and a link; and survives no count', () => {
    const withCount = renderToStaticMarkup(
      createElement(GitHubCard, { stars: 1234 }),
    );
    expect(withCount).toContain('data-github-card="sidebar"');
    expect(withCount).toContain('data-github-stars="1234"');
    expect(withCount).toContain('ofri-peretz/eslint');
    expect(withCount).toContain('1.2k');
    expect(withCount).toContain('href="https://github.com/ofri-peretz/eslint"');
    const without = renderToStaticMarkup(
      createElement(GitHubCard, { stars: null }),
    );
    expect(without).toContain('data-github-card="sidebar"');
    expect(without).not.toContain('data-github-stars');
    const inline = renderToStaticMarkup(
      createElement(GitHubCard, { stars: 20, variant: 'inline' }),
    );
    expect(inline).toContain('data-github-card="inline"');
  });
});
