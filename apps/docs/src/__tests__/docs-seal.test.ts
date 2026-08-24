/**
 * THE DOCS SEAL — "adding a plugin is just data."
 *
 * The contract this gate enforces: the docs app scales by construction. A new
 * plugin (or rule) slots in with no bespoke wiring, every number derives from
 * one source of truth, and every journey has a next step. Concretely:
 *
 *   1. Every published plugin is documented — or sits on a FROZEN allowlist
 *      that can only shrink. Publishing plugin #31 without docs fails CI.
 *   2. Every exported rule id of a documented plugin has a page, and every
 *      published rule page maps back to a real exported rule. No gaps, no
 *      orphans.
 *   3. The two public rule counts reconcile by definition, not coincidence:
 *      rules-manifest counts exported IDS, plugin-stats counts distinct
 *      IMPLEMENTATIONS, and the difference is exactly the alias registry
 *      below. A new alias must be registered here or the seal breaks.
 *
 * When this suite is green, the docs are sealed for growth. When it is red,
 * the failure names the missing artifact.
 */
import { readFileSync, existsSync, readdirSync, globSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const APP = resolve(__dirname, '../..');
const REPO = resolve(APP, '../..');
const CONTENT = join(APP, 'content/docs');

/**
 * Published plugins with no documentation pages yet. FROZEN: this list may
 * only shrink. Each entry is a real npm package whose 3–4 rules are invisible
 * on the site — writing those docs removes the entry.
 */
const UNDOCUMENTED_ALLOWLIST = new Set([
  'eslint-plugin-anthropic-security',
  'eslint-plugin-gemini-security',
  'eslint-plugin-mcp-sdk-security',
  'eslint-plugin-openai-security',
]);

/**
 * Rule ids that are aliases: the same implementation exported under a second
 * id for compatibility. An alias has no page of its own — its docs live at the
 * target — and it is why exported-id counts exceed implementation counts.
 */
const RULE_ALIASES: Record<string, Record<string, string>> = {
  'eslint-plugin-import-next': { order: 'enforce-import-order' },
};

interface ManifestRule {
  plugin: string;
  rule: string;
  deprecated: boolean;
}
const manifest = JSON.parse(
  readFileSync(join(APP, 'src/data/rules-manifest.json'), 'utf8'),
) as { totals: { rules: number }; rules: ManifestRule[] };

const pluginStats = JSON.parse(
  readFileSync(join(APP, 'src/data/plugin-stats.json'), 'utf8'),
) as { totalRules: number; plugins: { name: string; rules: number }[] };

const docsDirFor = (pkg: string): string | null => {
  const slug = pkg.replace(/^eslint-/, ''); // plugin-<name>
  for (const category of ['security', 'quality']) {
    const dir = join(CONTENT, category, slug);
    if (existsSync(dir)) return dir;
  }
  return null;
};

const publishedPlugins = readdirSync(join(REPO, 'packages'))
  .filter((p) => p.startsWith('eslint-plugin-'))
  .filter((p) => {
    const pj = join(REPO, 'packages', p, 'package.json');
    if (!existsSync(pj)) return false;
    const meta = JSON.parse(readFileSync(pj, 'utf8')) as {
      private?: boolean;
      deprecated?: string | boolean;
    };
    return !meta.private && !meta.deprecated;
  })
  .sort();

describe('docs seal: plugin coverage', () => {
  it('finds published plugins (guards a vacuous pass)', () => {
    expect(publishedPlugins.length).toBeGreaterThanOrEqual(25);
  });

  it('every published plugin is documented or explicitly allowlisted', () => {
    const undocumented = publishedPlugins.filter(
      (p) => !docsDirFor(p) && !UNDOCUMENTED_ALLOWLIST.has(p),
    );
    expect(undocumented).toEqual([]);
  });

  it('the allowlist only shrinks — every entry is still a real, undocumented package', () => {
    for (const pkg of UNDOCUMENTED_ALLOWLIST) {
      expect(existsSync(join(REPO, 'packages', pkg)), `${pkg} left the repo`).toBe(true);
      expect(docsDirFor(pkg), `${pkg} gained docs — remove it from the allowlist`).toBeNull();
    }
  });
});

describe('docs seal: rule coverage (no gaps, no orphans)', () => {
  const documented = publishedPlugins.filter((p) => docsDirFor(p));

  it.each(documented)('%s: every exported rule id has a page', (pkg) => {
    const dir = docsDirFor(pkg) as string;
    const aliases = RULE_ALIASES[pkg] ?? {};
    const pages = new Set(
      existsSync(join(dir, 'rules'))
        ? readdirSync(join(dir, 'rules'))
            .filter((f) => f.endsWith('.mdx') && f !== 'index.mdx')
            .map((f) => f.replace(/\.mdx$/, ''))
        : [],
    );
    const ids = manifest.rules.filter((r) => r.plugin === pkg).map((r) => r.rule);
    expect(ids.length, `${pkg} missing from rules-manifest`).toBeGreaterThan(0);
    const missing = ids.filter((id) => !pages.has(id) && !(id in aliases));
    expect(missing, `rules without a page`).toEqual([]);
    // Every alias must point at a page that exists — otherwise it is a gap
    // wearing an alias costume.
    for (const [alias, target] of Object.entries(aliases)) {
      expect(pages.has(target), `alias ${alias} → ${target} has no target page`).toBe(true);
    }
  });

  it('every published rule page maps back to an exported rule (no orphans)', () => {
    const ids = new Set(manifest.rules.map((r) => `${r.plugin}/${r.rule}`));
    const orphans: string[] = [];
    for (const rel of globSync('*/plugin-*/rules/*.mdx', { cwd: CONTENT })) {
      const [, slug, , file] = rel.split('/');
      if (file === 'index.mdx') continue;
      const key = `eslint-${slug}/${file.replace(/\.mdx$/, '')}`;
      if (!ids.has(key)) orphans.push(rel);
    }
    expect(orphans).toEqual([]);
  });
});

describe('docs seal: the two public counts reconcile by definition', () => {
  it('manifest ids = plugin-stats implementations + registered aliases', () => {
    const aliasCount = Object.values(RULE_ALIASES).reduce(
      (n, m) => n + Object.keys(m).length,
      0,
    );
    expect(manifest.totals.rules).toBe(pluginStats.totalRules + aliasCount);
  });

  it('per-plugin: id count − alias count = implementation count', () => {
    const statsByName = new Map(pluginStats.plugins.map((p) => [p.name, p.rules]));
    for (const [pkg, stats] of statsByName) {
      const ids = manifest.rules.filter((r) => r.plugin === pkg).length;
      const aliases = Object.keys(RULE_ALIASES[pkg] ?? {}).length;
      expect(ids - aliases, pkg).toBe(stats);
    }
  });
});
