#!/usr/bin/env node

/**
 * Sync README Rules Tables — canonical generator.
 *
 * For every plugin in `apps/docs/src/lib/plugins.ts`, regenerates the rules
 * table inside the plugin's README.md between paired markers:
 *
 *   <!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->
 *   ...generated table...
 *   <!-- AUTO-GENERATED:RULES_TABLE:END -->
 *
 * If markers are missing, locates the data-row table after the `## Rules`
 * legend (header row starts with `| Rule |`) and inserts the markers around
 * it — idempotent on the second run.
 *
 * Inputs (read-only):
 *   - apps/docs/src/lib/plugins.ts      — canonical 20-plugin registry
 *   - packages/eslint-plugin-<slug>/src/index.ts  — exported rule names + recommended config
 *   - packages/eslint-plugin-<slug>/docs/rules/<rule>.md  — frontmatter description, CWE, OWASP
 *   - .agent/type-awareness-scan.tsv    — per-rule type-aware status
 *
 * Output:
 *   - packages/eslint-plugin-<slug>/README.md  — updated rules table
 *
 * Usage:  npx tsx scripts/sync-readme-rules.ts [--dry-run] [--plugin <slug>]
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = path.join(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');
const TSV_PATH = path.join(ROOT_DIR, '.agent', 'type-awareness-scan.tsv');
const PLUGINS_REGISTRY = path.join(
  ROOT_DIR,
  'apps',
  'docs',
  'src',
  'lib',
  'plugins.ts',
);
const DOCS_BASE_URL = 'https://eslint.interlace.tools';

const RULES_TABLE_START =
  '<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->';
const RULES_TABLE_END = '<!-- AUTO-GENERATED:RULES_TABLE:END -->';

export type TypeStatus = 'unaware' | 'optional' | 'aware';
export type Pillar = 'security' | 'quality';

export interface PluginEntry {
  slug: string;
  package: string;
  pillar: Pillar;
}

export interface RuleMeta {
  name: string;
  description: string;
  cwe: string;
  owasp: string;
  cvss: string;
  recommended: boolean;
  warns: boolean;
  fixable: boolean;
  suggestions: boolean;
  deprecated: boolean;
  typeStatus: TypeStatus;
}

// ---------------------------------------------------------------------------
// Registry loading — parses apps/docs/src/lib/plugins.ts statically. Avoids
// importing TS at runtime so the script can run with bare `tsx` without
// resolving the workspace package graph.
// ---------------------------------------------------------------------------

export function loadPluginRegistry(registryPath = PLUGINS_REGISTRY): PluginEntry[] {
  const src = fs.readFileSync(registryPath, 'utf-8');
  const arrayMatch = src.match(/export const PLUGINS:[^=]*=\s*\[([\s\S]*?)\];/);
  if (!arrayMatch) {
    throw new Error(`Could not locate PLUGINS array in ${registryPath}`);
  }
  const entries: PluginEntry[] = [];
  const blockRegex = /\{\s*slug:\s*['"]([^'"]+)['"][\s\S]*?package:\s*['"]([^'"]+)['"][\s\S]*?pillar:\s*['"]([^'"]+)['"]/g;
  for (const m of arrayMatch[1].matchAll(blockRegex)) {
    entries.push({
      slug: m[1],
      package: m[2],
      pillar: m[3] as Pillar,
    });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// TSV loader for type-awareness status. The TSV is the single source of truth
// per .agent/type-awareness-audit.md.
// ---------------------------------------------------------------------------

export function loadTypeAwarenessMap(tsvPath = TSV_PATH): Map<string, TypeStatus> {
  const map = new Map<string, TypeStatus>();
  if (!fs.existsSync(tsvPath)) {
    console.warn(`  ⚠️  TSV not found at ${tsvPath} — every rule will render as 🟢 (unaware)`);
    return map;
  }
  const lines = fs.readFileSync(tsvPath, 'utf-8').split('\n');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const [plugin, rule, status] = line.split('\t');
    if (!plugin || !rule || !status) continue;
    const normalized = status.trim() as TypeStatus;
    if (normalized !== 'unaware' && normalized !== 'optional' && normalized !== 'aware') continue;
    map.set(`${plugin}/${rule}`, normalized);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Rule discovery — canonical rule names live in src/index.ts as the keys of
// the exported `rules` object. We keep only single-segment keys (no `/`) to
// drop categorized aliases like `error-handling/no-silent-errors`.
// ---------------------------------------------------------------------------

export function extractRuleNamesFromIndex(pluginPath: string): string[] {
  const indexPath = path.join(pluginPath, 'src', 'index.ts');
  if (!fs.existsSync(indexPath)) return [];
  const content = fs.readFileSync(indexPath, 'utf-8');

  // Scope to the `rules` object literal so we don't pick up config map keys.
  // Match: `export const rules = { ... }` or `rules = { ... } satisfies ...`.
  // Allows an optional type annotation between `rules` and `=` (used by crypto,
  // lambda-security, and others as `export const rules: Record<...> = { ... }`).
  const rulesBlockMatch = content.match(
    /(?:export\s+const\s+)?rules\s*(?::[^=\n{]+)?\s*=\s*\{([\s\S]*?)\n\}\s*(?:satisfies|as\s|;)/,
  );
  const scope = rulesBlockMatch ? rulesBlockMatch[1] : content;

  // Walk lines so quoted (`'no-cycle':`) and unquoted bare-identifier
  // (`named:`, `default:`) keys are both captured. The unquoted form is used
  // by import-next for the `eslint-plugin-import` compatibility aliases —
  // missing it silently dropped those rules from the regenerated README.
  const names = new Set<string>();
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
  return [...names].sort();
}

/**
 * Parse the `configs.recommended.rules` block to learn which rules are on by
 * default and whether they fire as `warn` or `error`.
 */
export function extractRecommendedMap(pluginPath: string): Map<string, 'warn' | 'error'> {
  const indexPath = path.join(pluginPath, 'src', 'index.ts');
  const recommended = new Map<string, 'warn' | 'error'>();
  if (!fs.existsSync(indexPath)) return recommended;
  const content = fs.readFileSync(indexPath, 'utf-8');

  // Find `recommended: { ... rules: { <entries> } ... }`. The outer-config
  // object may have multiple fields, so we grab the nested rules object.
  const recMatch = content.match(/recommended\s*:\s*\{[\s\S]*?rules\s*:\s*\{([\s\S]*?)\n\s*\}/);
  if (!recMatch) return recommended;

  const block = recMatch[1];
  const entryPattern = /['"][^'"/]+\/([a-z0-9-]+)['"]\s*:\s*['"](warn|error)['"]/g;
  for (const m of block.matchAll(entryPattern)) {
    recommended.set(m[1], m[2] as 'warn' | 'error');
  }
  return recommended;
}

// ---------------------------------------------------------------------------
// Per-rule metadata from docs/rules/<rule>.md frontmatter + body.
// ---------------------------------------------------------------------------

const PIPE_ESCAPE_RE = /\|/g;

export function extractRuleMetadata(
  pluginPath: string,
  pluginSlug: string,
  ruleName: string,
  recommended: Map<string, 'warn' | 'error'>,
  typeMap: Map<string, TypeStatus>,
): RuleMeta {
  const docPath = path.join(pluginPath, 'docs', 'rules', `${ruleName}.md`);
  const recLevel = recommended.get(ruleName);
  const meta: RuleMeta = {
    name: ruleName,
    description: '',
    cwe: '',
    owasp: '',
    cvss: '',
    recommended: recLevel === 'error',
    warns: recLevel === 'warn',
    fixable: false,
    suggestions: false,
    deprecated: false,
    typeStatus: typeMap.get(`${pluginSlug}/${ruleName}`) ?? 'unaware',
  };

  if (!fs.existsSync(docPath)) return meta;
  const content = fs.readFileSync(docPath, 'utf-8');

  // Frontmatter.
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const descLine = fm.match(/^description:\s*["']?(.+?)["']?\s*$/m);
    if (descLine) meta.description = descLine[1].trim();
    const autofix = fm.match(/^autofix:\s*(\w+)/m);
    if (autofix) {
      const v = autofix[1].toLowerCase();
      if (v === 'true' || v === 'autofix' || v === 'fix') meta.fixable = true;
      if (v === 'suggestions' || v === 'suggest') meta.suggestions = true;
    }
    if (/^deprecated:\s*true/m.test(fm)) meta.deprecated = true;
    const cweFm = fm.match(/^cwe:\s*["']?(CWE-?\d+)["']?/im);
    if (cweFm) meta.cwe = cweFm[1].replace(/^CWE-?/, 'CWE-');
    const owaspFm = fm.match(/^owasp:\s*["']?(A\d{1,2}:?\d{4})["']?/im);
    if (owaspFm) meta.owasp = owaspFm[1];
  }

  // Fallbacks if frontmatter was silent.
  if (!meta.cwe) {
    const cweBody = content.match(/CWE-(\d+)/);
    if (cweBody) meta.cwe = `CWE-${cweBody[1]}`;
  }
  if (!meta.owasp) {
    // Restrict to the real Top-10 range A01–A10. A00 appears in some legacy
    // docs as a "General Security" placeholder and must not propagate into
    // README rule tables (it's not a real OWASP category).
    const owaspBody = content.match(/(A(?:0[1-9]|10):\d{4})/);
    if (owaspBody) meta.owasp = owaspBody[1];
  }

  // Clamp description and escape pipes so the markdown table doesn't split.
  if (meta.description.length > 110) {
    meta.description = meta.description.slice(0, 107).trimEnd() + '…';
  }
  meta.description = meta.description.replace(PIPE_ESCAPE_RE, '\\|');

  return meta;
}

// ---------------------------------------------------------------------------
// Table rendering — canonical 11-column schema.
//   | Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
// ---------------------------------------------------------------------------

const TYPE_GLYPH: Record<TypeStatus, string> = {
  unaware: '🟢',
  optional: '🟡',
  aware: '🟠',
};

export function renderRulesTable(
  rules: RuleMeta[],
  pluginSlug: string,
  pillar: Pillar,
): string {
  const header = '| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |';
  const sep = '| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |';
  const lines = [header, sep];

  const sorted = [...rules].sort((a, b) => a.name.localeCompare(b.name));
  for (const r of sorted) {
    const url = `${DOCS_BASE_URL}/docs/${pillar}/plugin-${pluginSlug}/rules/${r.name}`;
    lines.push(
      `| [${r.name}](${url}) | ${r.cwe} | ${r.owasp} | ${r.cvss} | ${r.description} | ${TYPE_GLYPH[r.typeStatus]} | ${r.recommended ? '💼' : ''} | ${r.warns ? '⚠️' : ''} | ${r.fixable ? '🔧' : ''} | ${r.suggestions ? '💡' : ''} | ${r.deprecated ? '🚫' : ''} |`,
    );
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// README splicing — replaces the rule-data table (Rule-header row + body)
// inside the AUTO-GENERATED markers. If markers are missing, locates the
// existing `| Rule |` header table after the `## Rules` section and inserts
// markers around it (auto-migration). Idempotent on a second run.
// ---------------------------------------------------------------------------

// Matches `| Rule | ... |\n| :--- | ... |\n| data... |\n...` — the canonical
// rule-table block. The dash is escaped (`\-`) to keep it a literal inside
// the character class; an unescaped `-` between `:` and `|` becomes a range
// (charcodes 58–124) which excludes the dash and causes the lazy preamble to
// run past the rule table into the next markdown table.
const RULE_TABLE_REGEX =
  /\|\s*Rule\s*\|[^\n]*\n\|[\s:|\-]+\|\n(?:\|[^\n]*\|\n?)+/;

export function spliceTable(readme: string, generatedTable: string): { content: string; modified: boolean } {
  const hasStart = readme.includes(RULES_TABLE_START);
  const hasEnd = readme.includes(RULES_TABLE_END);

  if (hasStart && hasEnd) {
    const startIdx = readme.indexOf(RULES_TABLE_START) + RULES_TABLE_START.length;
    const endIdx = readme.indexOf(RULES_TABLE_END);
    if (startIdx >= endIdx) {
      throw new Error('Auto-generated markers are out of order in README');
    }
    const before = readme.slice(0, startIdx);
    const after = readme.slice(endIdx);
    const next = `${before}\n${generatedTable}\n${after}`;
    return { content: next, modified: next !== readme };
  }

  // Auto-migration: find the existing rule-data table and wrap it in markers.
  // Scope the search to the body of `## Rules` so we don't match unrelated
  // tables earlier in the README (e.g., parity / compat matrices that also
  // happen to start with `| Rule |`).
  const rulesHeadingIdx = readme.search(/^## Rules\b/m);
  if (rulesHeadingIdx === -1) {
    throw new Error('Could not locate `## Rules` heading to anchor table search');
  }
  const rulesSection = readme.slice(rulesHeadingIdx);
  const match = RULE_TABLE_REGEX.exec(rulesSection);
  if (!match) {
    throw new Error('Could not locate existing rule-data table to wrap with markers');
  }
  const tableStart = rulesHeadingIdx + match.index;
  const tableEnd = tableStart + match[0].length;
  const before = readme.slice(0, tableStart);
  const after = readme.slice(tableEnd);
  const next = `${before}${RULES_TABLE_START}\n${generatedTable}\n${RULES_TABLE_END}${after}`;
  return { content: next, modified: true };
}

// ---------------------------------------------------------------------------
// Per-plugin driver.
// ---------------------------------------------------------------------------

export interface ProcessOptions {
  dryRun: boolean;
  typeMap: Map<string, TypeStatus>;
}

export interface ProcessResult {
  slug: string;
  ruleCount: number;
  modified: boolean;
  skipped?: string;
  error?: string;
}

export function processPlugin(entry: PluginEntry, opts: ProcessOptions): ProcessResult {
  const pluginPath = path.join(PACKAGES_DIR, entry.package);
  const readmePath = path.join(pluginPath, 'README.md');

  if (!fs.existsSync(pluginPath)) {
    return { slug: entry.slug, ruleCount: 0, modified: false, skipped: 'plugin path missing' };
  }
  if (!fs.existsSync(readmePath)) {
    return { slug: entry.slug, ruleCount: 0, modified: false, skipped: 'README.md missing' };
  }

  // The README rule listing is a user-facing index of *documented* rules.
  // Alias/preset/compat exports that ship in `src/index.ts` without their
  // own `docs/rules/<name>.md` file are deliberately excluded so the README
  // never advertises an undocumented rule. The drift validator separately
  // confirms every documented rule is also exported.
  const docsRulesDir = path.join(pluginPath, 'docs', 'rules');
  const documentedNames = fs.existsSync(docsRulesDir)
    ? fs
        .readdirSync(docsRulesDir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, ''))
        .sort()
    : [];
  if (documentedNames.length === 0) {
    return { slug: entry.slug, ruleCount: 0, modified: false, skipped: 'no rules in docs/rules' };
  }
  const recommended = extractRecommendedMap(pluginPath);
  const rules = documentedNames.map((n) =>
    extractRuleMetadata(pluginPath, entry.slug, n, recommended, opts.typeMap),
  );

  const table = renderRulesTable(rules, entry.slug, entry.pillar);
  const readme = fs.readFileSync(readmePath, 'utf-8');

  let result: { content: string; modified: boolean };
  try {
    result = spliceTable(readme, table);
  } catch (e) {
    return {
      slug: entry.slug,
      ruleCount: rules.length,
      modified: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  if (result.modified && !opts.dryRun) {
    fs.writeFileSync(readmePath, result.content);
  }
  return {
    slug: entry.slug,
    ruleCount: rules.length,
    modified: result.modified,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const pluginIdx = args.indexOf('--plugin');
  const singlePlugin = pluginIdx !== -1 ? args[pluginIdx + 1] : null;

  console.log('🔄 Sync README Rules Tables');
  if (dryRun) console.log('📋 DRY RUN — no files will be modified');

  const registry = loadPluginRegistry();
  const typeMap = loadTypeAwarenessMap();
  const targets = singlePlugin ? registry.filter((p) => p.slug === singlePlugin) : registry;

  if (targets.length === 0) {
    console.error(singlePlugin ? `No plugin matches slug "${singlePlugin}"` : 'Registry is empty');
    process.exit(1);
  }

  let modified = 0;
  let skipped = 0;
  let errored = 0;

  for (const entry of targets) {
    const result = processPlugin(entry, { dryRun, typeMap });
    if (result.error) {
      console.error(`✗ ${entry.slug}: ${result.error}`);
      errored++;
      continue;
    }
    if (result.skipped) {
      console.warn(`⏭️  ${entry.slug}: ${result.skipped}`);
      skipped++;
      continue;
    }
    const verb = result.modified ? (dryRun ? 'would update' : 'updated') : 'unchanged';
    console.log(`${result.modified ? '✓' : '·'} ${entry.slug}: ${result.ruleCount} rules — ${verb}`);
    if (result.modified) modified++;
  }

  console.log('='.repeat(60));
  console.log(`Processed ${targets.length} — modified ${modified}, skipped ${skipped}, errored ${errored}`);

  if (errored > 0) process.exit(1);
}

if (require.main === module) {
  main();
}
