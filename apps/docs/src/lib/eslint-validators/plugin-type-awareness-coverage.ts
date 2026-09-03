/**
 * Plugin type-awareness coverage validator.
 *
 * Every documented rule (an `.md` file under
 * `packages/eslint-plugin-<slug>/docs/rules/`) must have a classification in
 * `.agent/type-awareness-scan.tsv`. Missing entries leave the badge column
 * blank in the README and the rule MDX page — both surface 🟢 by default,
 * which silently mis-labels a type-aware rule as type-unaware.
 *
 * Conversely, TSV rows that name a rule that no longer exists in `docs/rules/`
 * must be cleaned up so the TSV doesn't accumulate dead entries.
 *
 * The TSV is the canonical source per `.agent/type-awareness-audit.md`:
 *   "README rule tables derive their `Type-aware?` column from this document;
 *    they don't mint their own classifications."
 *
 * To fix a finding:
 *   - Open `.agent/type-awareness-scan.tsv`.
 *   - Add a row for any rule reported as `tsv-missing`.
 *   - Remove rows reported as `tsv-orphan`.
 *   - Run `tsx scripts/sync-readme-rules.ts` to refresh README columns.
 *   - Run `tsx apps/docs/scripts/sync-rules-docs.ts` to refresh badges in MDX.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { PluginEntry } from './plugin-rule-source-drift';

export interface Finding {
  plugin: string;
  rule?: string;
  surface: 'tsv-missing' | 'tsv-orphan' | 'tsv-malformed' | 'readme-mismatch';
  severity: 'error' | 'warning';
  message: string;
}

export type TypeStatus = 'unaware' | 'optional' | 'aware';

export interface TypeAwarenessCoverageOptions {
  monorepoRoot: string;
  plugins: readonly PluginEntry[];
  /** Optional override for the TSV path (testing). */
  tsvPath?: string;
}

export function loadTypeAwarenessMap(tsvPath: string): {
  byKey: Map<string, TypeStatus>;
  rowsByPlugin: Map<string, Set<string>>;
} {
  const byKey = new Map<string, TypeStatus>();
  const rowsByPlugin = new Map<string, Set<string>>();
  if (!existsSync(tsvPath)) return { byKey, rowsByPlugin };
  const lines = readFileSync(tsvPath, 'utf-8').split('\n');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const [plugin, rule, status] = line.split('\t');
    if (!plugin || !rule || !status) continue;
    const normalized = status.trim();
    if (normalized !== 'unaware' && normalized !== 'optional' && normalized !== 'aware') continue;
    byKey.set(`${plugin}/${rule}`, normalized);
    const set = rowsByPlugin.get(plugin) ?? new Set();
    set.add(rule);
    rowsByPlugin.set(plugin, set);
  }
  return { byKey, rowsByPlugin };
}

const TYPE_GLYPHS: Record<TypeStatus, string> = {
  unaware: '🟢',
  optional: '🟡',
  aware: '🟠',
};

function readmeRulesWithType(readme: string): Map<string, TypeStatus | null> {
  const start = readme.indexOf('<!-- AUTO-GENERATED:RULES_TABLE:START');
  const end = readme.indexOf('<!-- AUTO-GENERATED:RULES_TABLE:END');
  const out = new Map<string, TypeStatus | null>();
  if (start === -1 || end === -1 || start > end) return out;
  const block = readme.slice(start, end);
  // Each rule row starts with `| [<name>](...)` and contains a 🧠 column.
  for (const rawLine of block.split('\n')) {
    const m = rawLine.match(/^\|\s*\[([a-z][a-z0-9-]*)\]/);
    if (!m) continue;
    const name = m[1];
    if (rawLine.includes('🟢')) out.set(name, 'unaware');
    else if (rawLine.includes('🟡')) out.set(name, 'optional');
    else if (rawLine.includes('🟠')) out.set(name, 'aware');
    else out.set(name, null);
  }
  return out;
}

export function validatePluginTypeAwarenessCoverage(
  opts: TypeAwarenessCoverageOptions,
): Finding[] {
  const findings: Finding[] = [];
  const tsvPath = opts.tsvPath ?? join(opts.monorepoRoot, '.agent', 'type-awareness-scan.tsv');
  if (!existsSync(tsvPath)) {
    findings.push({
      plugin: '*',
      surface: 'tsv-malformed',
      severity: 'error',
      message: `TSV not found at ${tsvPath} — type-awareness classification has no source.`,
    });
    return findings;
  }
  const { byKey, rowsByPlugin } = loadTypeAwarenessMap(tsvPath);

  for (const plugin of opts.plugins) {
    const docsRulesDir = join(opts.monorepoRoot, 'packages', plugin.package, 'docs', 'rules');
    const documented = existsSync(docsRulesDir)
      ? new Set(
          readdirSync(docsRulesDir)
            .filter((f) => f.endsWith('.md'))
            .map((f) => f.replace(/\.md$/, '')),
        )
      : new Set<string>();

    // tsv-missing: documented rules that lack a TSV row.
    for (const rule of documented) {
      if (!byKey.has(`${plugin.slug}/${rule}`)) {
        findings.push({
          plugin: plugin.slug,
          rule,
          surface: 'tsv-missing',
          severity: 'error',
          message: `\`${plugin.slug}/${rule}\` is missing from .agent/type-awareness-scan.tsv — add a row classifying it as unaware/optional/aware.`,
        });
      }
    }

    // tsv-orphan: TSV rows for rules that no longer have a docs/rules .md.
    const tsvRules = rowsByPlugin.get(plugin.slug) ?? new Set();
    for (const rule of tsvRules) {
      if (!documented.has(rule)) {
        findings.push({
          plugin: plugin.slug,
          rule,
          surface: 'tsv-orphan',
          severity: 'error',
          message: `.agent/type-awareness-scan.tsv lists \`${plugin.slug}/${rule}\` but no docs/rules/${rule}.md exists.`,
        });
      }
    }

    // readme-mismatch: README rule rows must show the TSV glyph.
    const readmePath = join(opts.monorepoRoot, 'packages', plugin.package, 'README.md');
    if (existsSync(readmePath)) {
      const readmeTypes = readmeRulesWithType(readFileSync(readmePath, 'utf-8'));
      for (const [rule, fromReadme] of readmeTypes) {
        const fromTsv = byKey.get(`${plugin.slug}/${rule}`);
        if (!fromTsv) continue; // covered by tsv-missing above
        if (fromReadme !== fromTsv) {
          findings.push({
            plugin: plugin.slug,
            rule,
            surface: 'readme-mismatch',
            severity: 'error',
            message: `README shows ${
              fromReadme === null ? 'no badge' : TYPE_GLYPHS[fromReadme]
            } for \`${plugin.slug}/${rule}\` but TSV says ${TYPE_GLYPHS[fromTsv]} (${fromTsv}). Re-run \`tsx scripts/sync-readme-rules.ts\`.`,
          });
        }
      }
    }
  }

  return findings;
}
