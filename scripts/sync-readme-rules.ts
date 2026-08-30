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
import { buildUtmHref } from './utm';

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
  description: string;
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
  const blockRegex =
    /\{\s*slug:\s*['"]([^'"]+)['"][\s\S]*?package:\s*['"]([^'"]+)['"][\s\S]*?pillar:\s*['"]([^'"]+)['"][\s\S]*?description:\s*['"]([^'"]+)['"]/g;
  for (const m of arrayMatch[1].matchAll(blockRegex)) {
    entries.push({
      slug: m[1],
      package: m[2],
      pillar: m[3] as Pillar,
      description: m[4],
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
  return [...names].toSorted();
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

  // …or `rules: recommendedRules`, a reference to a const declared above.
  // Without this the lazy `[\s\S]*?` walks past the reference and captures
  // whichever *later* config happens to inline its rules, so the README marks
  // the wrong rules as recommended — nestjs-security showed 1 of 9, and the
  // eight it dropped include four that ship at `error`.
  const referenced = content.match(
    /recommended\s*:\s*\{[\s\S]*?rules\s*:\s*([A-Za-z_$][\w$]*)\s*[,\n}]/,
  );
  const declared =
    referenced === null
      ? null
      : content.match(
          new RegExp(`const\\s+${referenced[1]}\\b[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`),
        );

  const block = declared?.[1] ?? recMatch?.[1];
  if (block === undefined) return recommended;
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
  // Backslashes must be escaped BEFORE pipes — otherwise a literal `\` in the
  // description gets re-interpreted as a markdown escape character (CodeQL:
  // `js/incomplete-sanitization`).
  if (meta.description.length > 110) {
    meta.description = meta.description.slice(0, 107).trimEnd() + '…';
  }
  meta.description = meta.description
    .replace(/\\/g, '\\\\')
    .replace(PIPE_ESCAPE_RE, '\\|');

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
  campaign: string,
): string {
  const header = '| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |';
  const sep = '| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |';
  const lines = [header, sep];

  const sorted = [...rules].toSorted((a, b) => a.name.localeCompare(b.name));
  for (const r of sorted) {
    const url = buildUtmHref(
      `${DOCS_BASE_URL}/docs/${pillar}/plugin-${pluginSlug}/rules/${r.name}`,
      { source: 'github', medium: 'referral', campaign },
    );
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
  /\|\s*Rule\s*\|[^\n]*\n\|[\s:|-]+\|\n(?:\|[^\n]*\|\n?)+/;

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
  /** The FULL registry, not the `--plugin` filtered subset — the ecosystem table on one
   *  README lists every other plugin, so filtering targets must not shrink it. */
  registry: PluginEntry[];
}


const ECOSYSTEM_START =
  '<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:START - Do not edit manually -->';
const ECOSYSTEM_END = '<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:END -->';
const ECOSYSTEM_HEADING = '## 🔗 Related ESLint Plugins';

/** Where the Related section stops. The Star CTA block precedes `## 📄 License` in 26 of
 *  the 30 READMEs and is absent in the other four, so both are boundaries. */
const ECOSYSTEM_STOP = /^(## |<!-- INTERLACE:STAR_CTA:START)/;

/**
 * The cross-sell table, generated into every plugin README from the docs registry
 * (`apps/docs/src/lib/plugins.ts`) — the same source that drives the docs site nav.
 *
 * It used to be a hardcoded string literal in `tools/scripts/fix-readmes.ts`, a script
 * wired into no npm script and last run before eleven plugins existed. So every README
 * shipped the same eleven-row table, two of whose rows still *displayed*
 * `eslint-plugin-jwt` and `eslint-plugin-pg` — names unpublished since #414 — while
 * linking to the renamed packages. Reading the registry means a new plugin appears in
 * twenty-nine READMEs the day it is registered, and a rename cannot survive anywhere.
 *
 * Split by pillar because twenty-nine undifferentiated rows is a wall, and the split is
 * the one the docs site already makes.
 */
export function renderEcosystemTable(entries: PluginEntry[], selfPackage: string): string {
  const others = entries
    .filter((e) => e.package !== selfPackage)
    .toSorted((a, b) => a.package.localeCompare(b.package));

  const row = (e: PluginEntry): string => {
    const npm = `https://www.npmjs.com/package/${e.package}`;
    const badge = `https://img.shields.io/npm/dt/${e.package}.svg?style=flat-square`;
    return `| [\`${e.package}\`](${npm}) | [![downloads](${badge})](${npm}) | ${e.description}. |`;
  };

  const group = (title: string, pillar: Pillar): string[] => {
    const rows = others.filter((e) => e.pillar === pillar);
    if (rows.length === 0) return [];
    return [
      '',
      `**${title}**`,
      '',
      '| Plugin | Downloads | Description |',
      '| :--- | :---: | :--- |',
      ...rows.map(row),
    ];
  };

  return [
    ECOSYSTEM_START,
    '',
    ECOSYSTEM_HEADING,
    '',
    'Part of the **Interlace ESLint ecosystem** — AI-native rules with LLM-optimized error messages:',
    ...group('Security', 'security'),
    ...group('Code quality', 'quality'),
    '',
    ECOSYSTEM_END,
  ].join('\n');
}

/**
 * Insert or refresh the ecosystem table.
 *
 * On the first run per README there are no markers, only the hand-written section: the
 * heading, its lead-in line and the stale eleven-row table. That whole span — heading to
 * the next `## ` or Star CTA — is what gets replaced, which is also what makes the second
 * run a no-op, since the generated span contains no `## ` of its own beyond the heading
 * it starts with.
 *
 * A README with neither markers nor the heading is returned untouched rather than having
 * the section guessed into place.
 */
export function spliceEcosystem(readme: string, table: string): { content: string; modified: boolean } {
  const start = readme.indexOf(ECOSYSTEM_START);
  const end = readme.indexOf(ECOSYSTEM_END);

  if (start !== -1 && end !== -1) {
    if (end < start) throw new Error('ECOSYSTEM_TABLE:END appears before ECOSYSTEM_TABLE:START');
    const content = readme.slice(0, start) + table + readme.slice(end + ECOSYSTEM_END.length);
    return { content, modified: content !== readme };
  }
  if (start !== -1 || end !== -1) {
    throw new Error('ECOSYSTEM_TABLE has one marker without the other');
  }

  const lines = readme.split('\n');
  const headingAt = lines.indexOf(ECOSYSTEM_HEADING);
  if (headingAt === -1) return { content: readme, modified: false };

  let stopAt = lines.length;
  for (let i = headingAt + 1; i < lines.length; i++) {
    if (ECOSYSTEM_STOP.test(lines[i])) {
      stopAt = i;
      break;
    }
  }

  const content = [...lines.slice(0, headingAt), table, '', ...lines.slice(stopAt)].join('\n');
  return { content, modified: content !== readme };
}

const DOCTRINE_START = '<!-- AUTO-GENERATED:DOCTRINE:START - Do not edit manually -->';
const DOCTRINE_END = '<!-- AUTO-GENERATED:DOCTRINE:END -->';

/**
 * The ecosystem position — why, how, what — generated into every plugin README.
 *
 * It is ecosystem-wide, so it is generated rather than hand-copied: thirty
 * hand-maintained copies of one position drift, and a position that says different
 * things in different packages is not a position.
 *
 * THREE LINES. Not three sections. The reference is the NestJS npm README, which
 * spends a tagline and a short Description and then gets out of the way — a reader
 * arriving from npm wants the install command, and everything above it is rent.
 * Three shapes have been tried in this slot and only this one is cheap enough:
 *
 *   1. `## Philosophy` — "Interlace fosters strength through integration ... a
 *      resilient fabric of code". Short, but said nothing a reader could act on or
 *      disagree with. It held the sell slot without selling.
 *   2. three `##` sections, ~45 lines. Said something, but pushed Getting Started
 *      and the rule table below the fold on all thirty READMEs.
 *   3. three `##` sections at ~16 lines. Still three entries in the table of
 *      contents for what is one thought.
 *
 * So: a bulleted why/how/what and one line of links, under no heading of its own.
 * Each bullet is one sentence; the argument behind each lives in DOCS_PHILOSOPHY.md
 * and the benchmark docs. If a bullet needs a second sentence, it belongs there.
 *
 * Deliberately carries NO ecosystem totals — per BENCHMARK-PUBLISHING-PLAN.md §1, rule
 * counts and benchmark figures in a plugin README read as inflated the moment someone
 * counts the rule table below it. Numbers live in one place and everything else links.
 */
function renderDoctrine(): string {
  return [
    DOCTRINE_START,
    '',
    '- **Why** — a linter nobody reads protects nothing. We would rather miss a finding',
    '  than spend your attention on one that was never real.',
    '- **How** — evidence, not names. A rule fires on what the code *does*, resolved',
    "  through the AST and ESLint's own scope analysis.",
    '- **What** — every finding carries its fix, in prose for a human and as structured',
    '  JSON for an agent. Security rules add a CWE mapping and, where assigned, a CVSS score.',
    '',
    'That trade costs recall, and we measure it:',
    '[methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)',
    '· [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md)',
    '· [a false positive is a bug](https://github.com/ofri-peretz/eslint/issues).',
    '',
    DOCTRINE_END,
  ].join('\n');
}

/**
 * Insert or refresh the doctrine block, in place of `## Philosophy`.
 *
 * `## Philosophy` is REMOVED, not preserved. It held the sell slot in all thirty
 * READMEs with three sentences — "Interlace fosters strength through integration ... a
 * resilient fabric of code" — that a reader could neither act on nor disagree with,
 * directly above the doctrine that says the same thing with substance. Keeping both
 * meant paying twice for one position. `## Why` is now the brand statement.
 *
 * Migration is one-way and idempotent: the marker path replaces marker-to-marker, and
 * additionally swallows a `## Philosophy` section still sitting directly above the
 * START marker, which is the shape every README is in before this runs once.
 *
 * Returns the README unchanged when there is neither a marker pair nor a Philosophy
 * section, rather than guessing where the block belongs — a README with its own
 * structure is not something to rewrite blind.
 */
export function spliceDoctrine(readme: string): { content: string; modified: boolean } {
  const block = renderDoctrine();

  // A `## Philosophy` section ending where the next `## ` heading begins. The head
  // slice handed to the marker path ends AT the START marker, so nothing follows
  // Philosophy there — hence the `$` alternative, without which the lookahead never
  // matches and the section survives the migration it was written to remove.
  const PHILOSOPHY = /^## Philosophy\n[\s\S]*?(?=^## |(?![\s\S]))/m;

  const start = readme.indexOf(DOCTRINE_START);
  const end = readme.indexOf(DOCTRINE_END);

  // Any pairing other than both-present-in-order is a corrupt file, and each broken
  // shape corrupts it differently if waved through: an END before START makes the
  // second slice run backwards over the block, and an orphan END leaves a stray marker
  // behind a freshly inserted one. Refuse all of them rather than guess.
  if (start !== -1 || end !== -1) {
    if (start === -1) throw new Error('DOCTRINE:END without a matching START');
    if (end === -1) throw new Error('DOCTRINE:START without a matching END');
    if (end < start) throw new Error('DOCTRINE:END appears before DOCTRINE:START');
    const head = readme.slice(0, start).replace(PHILOSOPHY, '');
    const content = head + block + readme.slice(end + DOCTRINE_END.length);
    return { content, modified: content !== readme };
  }

  if (!PHILOSOPHY.test(readme)) return { content: readme, modified: false };

  const content = readme.replace(PHILOSOPHY, `${block}\n\n`);
  return { content, modified: content !== readme };
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

  // Read README via try/catch instead of existsSync precheck — closes the
  // existsSync → readFileSync → writeFileSync TOCTOU window (CodeQL:
  // `js/file-system-race`). If the directory itself is missing, the read
  // throws ENOENT and we report that path explicitly.
  let readme: string;
  try {
    readme = fs.readFileSync(readmePath, 'utf-8');
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return { slug: entry.slug, ruleCount: 0, modified: false, skipped: 'README.md or plugin path missing' };
    }
    throw e;
  }

  // The README rule listing is a user-facing index of *documented* rules.
  // Alias/preset/compat exports that ship in `src/index.ts` without their
  // own `docs/rules/<name>.md` file are deliberately excluded so the README
  // never advertises an undocumented rule. The drift validator separately
  // confirms every documented rule is also exported.
  const docsRulesDir = path.join(pluginPath, 'docs', 'rules');
  let documentedNames: string[] = [];
  try {
    // Recurse: rule docs may be organized into sub-category folders
    // (e.g. react-features/docs/rules/component-api/<rule>.md). The rule NAME is
    // the file basename — index.ts exports the same bare name. Mirrors the
    // plugin-rule-source-drift validator so README + drift agree.
    documentedNames = fs
      .readdirSync(docsRulesDir, { recursive: true })
      .map((f) => String(f))
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.basename(f).replace(/\.md$/, ''))
      .toSorted();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  if (documentedNames.length === 0) {
    return { slug: entry.slug, ruleCount: 0, modified: false, skipped: 'no rules in docs/rules' };
  }
  const recommended = extractRecommendedMap(pluginPath);
  const rules = documentedNames.map((n) =>
    extractRuleMetadata(pluginPath, entry.slug, n, recommended, opts.typeMap),
  );

  const table = renderRulesTable(rules, entry.slug, entry.pillar, entry.package);

  let result: { content: string; modified: boolean };
  try {
    result = spliceTable(readme, table);
    const withDoctrine = spliceDoctrine(result.content);
    const withEcosystem = spliceEcosystem(
      withDoctrine.content,
      renderEcosystemTable(opts.registry, entry.package),
    );
    result = {
      content: withEcosystem.content,
      modified: result.modified || withDoctrine.modified || withEcosystem.modified,
    };
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
    const result = processPlugin(entry, { dryRun, typeMap, registry });
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
