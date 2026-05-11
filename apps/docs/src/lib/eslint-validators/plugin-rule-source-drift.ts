/**
 * Plugin rule-source drift validator.
 *
 * The canonical set for documentation drift is the per-rule .md files at
 * `packages/eslint-plugin-<slug>/docs/rules/<rule>.md`. Every user-visible
 * surface that lists rules must agree with it exactly:
 *
 *   1. The auto-generated rules table inside `packages/eslint-plugin-<slug>/README.md`
 *   2. `apps/docs/content/docs/<pillar>/plugin-<slug>/rules/<rule>.mdx` files
 *   3. `apps/docs/content/docs/<pillar>/plugin-<slug>/rules/meta.json` `pages` array
 *
 * This is the CI guardrail for the failure mode that broke
 * `/docs/quality/plugin-reliability/rules` in 2026-05: the README rules table
 * listed category folder names (`error-handling`, `reliability`) instead of
 * the actual rules, and the docs site dutifully rendered dead links.
 *
 * As a separate (lower-severity) check, every documented rule must also be
 * exported from `src/index.ts` — otherwise the docs would describe a rule
 * that ESLint cannot load. Conversely, rules exported from `src/index.ts`
 * that are NOT documented are *not* flagged: many plugins ship internal
 * aliases, preset entries, and `eslint-plugin-import`-style compat shims as
 * extra `rules` keys without dedicated doc pages.
 *
 * Each surface's findings are surfaced separately so a CI failure log
 * pinpoints exactly which view needs regeneration:
 *   - run `tsx scripts/sync-readme-rules.ts` (regenerates README tables)
 *   - run `tsx apps/docs/scripts/sync-rules-docs.ts` (regenerates MDX shells)
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface Finding {
  plugin: string;
  surface: 'docs-md' | 'readme' | 'mdx' | 'meta';
  severity: 'error' | 'warning';
  message: string;
}

export interface PluginEntry {
  slug: string;
  package: string;
  pillar: 'security' | 'quality';
}

export interface PluginRuleSourceDriftOptions {
  monorepoRoot: string;
  plugins: readonly PluginEntry[];
  /** Per-plugin rules allowed to be missing from each surface (rare exceptions). */
  exceptions?: Partial<
    Record<string, { docsMd?: string[]; readme?: string[]; mdx?: string[]; meta?: string[] }>
  >;
}

/**
 * Parse the keys of the exported `rules` object from a plugin's `src/index.ts`.
 * Drops categorized aliases like `error-handling/foo` (those use `/`) because
 * the canonical docs surfaces use the short form. Handles both quoted keys
 * (`'no-cycle': ...`) and unquoted JS-identifier keys (`named: ...`); without
 * the latter, import-next's `named`/`default`/`namespace`/`extensions`/
 * `unambiguous`/`export`/`order`/`first` rules are silently missed.
 */
export function extractCanonicalRuleNames(indexSrc: string): string[] {
  // The `: Record<...>` between `rules` and `=` is common (crypto, lambda-security…);
  // omitting it caused the bare-identifier branch to leak into adjacent objects
  // like `configs.recommended` and pull in non-rule keys (`meta`, `version`,
  // `recommended`, etc.). The non-greedy `(?::[^=\n{]+)?` swallows any type
  // annotation without crossing into the next declaration.
  const block = indexSrc.match(
    /(?:export\s+const\s+)?rules\s*(?::[^=\n{]+)?\s*=\s*\{([\s\S]*?)\n\}\s*(?:satisfies|as\s|;)/,
  );
  const scope = block ? block[1] : indexSrc;
  const names = new Set<string>();
  // Iterate line-by-line so comments and inline types in surrounding code
  // can't accidentally match. A rule entry is an indented line whose first
  // non-whitespace token is either a quoted string or a bare JS identifier
  // immediately followed by `:`.
  for (const rawLine of scope.split('\n')) {
    const line = rawLine.replace(/\/\/.*$/, '').trimStart();
    if (!line) continue;
    const quoted = line.match(/^['"]([a-z][a-z0-9-]*)['"]\s*:/);
    if (quoted) {
      names.add(quoted[1]);
      continue;
    }
    const bare = line.match(/^([a-z][a-zA-Z0-9_]*)\s*:/);
    if (bare) names.add(bare[1]);
  }
  return [...names].toSorted();
}

/**
 * Parse rule names listed inside the auto-generated table block of a README.
 * Returns the empty set if the markers are absent (caller decides whether
 * that constitutes drift).
 */
export function extractReadmeRuleNames(readme: string): { found: string[]; hasMarkers: boolean } {
  const startMarker = '<!-- AUTO-GENERATED:RULES_TABLE:START';
  const endMarker = '<!-- AUTO-GENERATED:RULES_TABLE:END';
  const startIdx = readme.indexOf(startMarker);
  const endIdx = readme.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
    return { found: [], hasMarkers: false };
  }
  const block = readme.slice(startIdx, endIdx);
  const names: string[] = [];
  for (const m of block.matchAll(/\|\s*\[([a-z][a-z0-9-]*)\]/g)) {
    names.push(m[1]);
  }
  return { found: [...new Set(names)].toSorted(), hasMarkers: true };
}

function diff(canonical: string[], actual: string[]) {
  const c = new Set(canonical);
  const a = new Set(actual);
  return {
    missing: canonical.filter((r) => !a.has(r)),
    extra: actual.filter((r) => !c.has(r)),
  };
}

export function validatePluginRuleSourceDrift(
  opts: PluginRuleSourceDriftOptions,
): Finding[] {
  const findings: Finding[] = [];
  const exceptions = opts.exceptions ?? {};

  for (const plugin of opts.plugins) {
    const pkgRoot = join(opts.monorepoRoot, 'packages', plugin.package);
    const indexPath = join(pkgRoot, 'src', 'index.ts');
    if (!existsSync(indexPath)) {
      findings.push({
        plugin: plugin.slug,
        surface: 'docs-md',
        severity: 'error',
        message: `Missing src/index.ts at ${indexPath} — cannot validate rule exports.`,
      });
      continue;
    }
    const exportedRules = new Set(extractCanonicalRuleNames(readFileSync(indexPath, 'utf-8')));

    // ---- Canonical: docs/rules/<rule>.md ------------------------------------
    const docsRulesDir = join(pkgRoot, 'docs', 'rules');
    const documentedRules = existsSync(docsRulesDir)
      ? readdirSync(docsRulesDir)
          .filter((f) => f.endsWith('.md'))
          .map((f) => f.replace(/\.md$/, ''))
          .toSorted()
      : [];
    if (documentedRules.length === 0) {
      findings.push({
        plugin: plugin.slug,
        surface: 'docs-md',
        severity: 'error',
        message: 'docs/rules/ has no .md files — plugin has no documented rules.',
      });
      continue;
    }
    const canonical = documentedRules;
    const allowed = exceptions[plugin.slug] ?? {};

    // Each documented rule must be exported by ESLint, otherwise the docs
    // describe a rule that nobody can actually configure.
    for (const r of canonical) {
      if (allowed.docsMd?.includes(r)) continue;
      if (!exportedRules.has(r)) {
        findings.push({
          plugin: plugin.slug,
          surface: 'docs-md',
          severity: 'error',
          message: `docs/rules/${r}.md describes a rule that is not exported from src/index.ts.`,
        });
      }
    }

    // ---- Surface 2: README rules table --------------------------------------
    const readmePath = join(pkgRoot, 'README.md');
    if (!existsSync(readmePath)) {
      findings.push({
        plugin: plugin.slug,
        surface: 'readme',
        severity: 'error',
        message: 'README.md is missing.',
      });
    } else {
      const { found, hasMarkers } = extractReadmeRuleNames(readFileSync(readmePath, 'utf-8'));
      if (!hasMarkers) {
        findings.push({
          plugin: plugin.slug,
          surface: 'readme',
          severity: 'error',
          message:
            'README.md is missing the AUTO-GENERATED:RULES_TABLE markers. Run `tsx scripts/sync-readme-rules.ts --plugin ' +
            plugin.slug +
            '` to regenerate.',
        });
      } else {
        const readmeDiff = diff(canonical, found);
        for (const m of readmeDiff.missing) {
          if (allowed.readme?.includes(m)) continue;
          findings.push({
            plugin: plugin.slug,
            surface: 'readme',
            severity: 'error',
            message: `README rules table is missing rule \`${m}\`. Run \`tsx scripts/sync-readme-rules.ts --plugin ${plugin.slug}\`.`,
          });
        }
        for (const e of readmeDiff.extra) {
          if (allowed.readme?.includes(e)) continue;
          findings.push({
            plugin: plugin.slug,
            surface: 'readme',
            severity: 'error',
            message: `README rules table lists \`${e}\` which is not exported from src/index.ts.`,
          });
        }
      }
    }

    // ---- Surface 3: MDX shells ---------------------------------------------
    const mdxDir = join(
      opts.monorepoRoot,
      'apps',
      'docs',
      'content',
      'docs',
      plugin.pillar,
      `plugin-${plugin.slug}`,
      'rules',
    );
    const mdxNames = existsSync(mdxDir)
      ? readdirSync(mdxDir)
          .filter((f) => f.endsWith('.mdx') && f !== 'index.mdx')
          .map((f) => f.replace(/\.mdx$/, ''))
          .toSorted()
      : [];
    const mdxDiff = diff(canonical, mdxNames);
    for (const m of mdxDiff.missing) {
      if (allowed.mdx?.includes(m)) continue;
      findings.push({
        plugin: plugin.slug,
        surface: 'mdx',
        severity: 'error',
        message: `MDX shell ${plugin.pillar}/plugin-${plugin.slug}/rules/${m}.mdx missing. Run \`npm --prefix apps/docs run sync-rules\` (or \`tsx apps/docs/scripts/sync-rules-docs.ts\`).`,
      });
    }
    for (const e of mdxDiff.extra) {
      if (allowed.mdx?.includes(e)) continue;
      findings.push({
        plugin: plugin.slug,
        surface: 'mdx',
        severity: 'error',
        message: `MDX shell ${plugin.pillar}/plugin-${plugin.slug}/rules/${e}.mdx describes a rule not exported from src/index.ts.`,
      });
    }

    // ---- Surface 4: meta.json pages ----------------------------------------
    const metaPath = join(mdxDir, 'meta.json');
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
        const pages = Array.isArray(meta.pages) ? (meta.pages as string[]) : [];
        const metaNames = pages.filter((p) => p !== 'index').toSorted();
        const metaDiff = diff(canonical, metaNames);
        for (const m of metaDiff.missing) {
          if (allowed.meta?.includes(m)) continue;
          findings.push({
            plugin: plugin.slug,
            surface: 'meta',
            severity: 'error',
            message: `meta.json pages array is missing rule \`${m}\`.`,
          });
        }
        for (const e of metaDiff.extra) {
          if (allowed.meta?.includes(e)) continue;
          findings.push({
            plugin: plugin.slug,
            surface: 'meta',
            severity: 'error',
            message: `meta.json pages array references \`${e}\` which is not exported from src/index.ts.`,
          });
        }
      } catch {
        findings.push({
          plugin: plugin.slug,
          surface: 'meta',
          severity: 'error',
          message: 'meta.json is not valid JSON.',
        });
      }
    }
  }

  return findings;
}
