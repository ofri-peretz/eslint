#!/usr/bin/env -S npx tsx

/**
 * ILB Doc-Harvest Stress Test — exercises every rule against the code
 * snippets in its own documentation.
 *
 * For each rule with a doc:
 *   • Extract every fenced code block under `## ❌ Incorrect` (or "Bad" /
 *     "Anti-pattern") → expected to fire.
 *   • Extract every fenced code block under `## ✅ Correct` (or "Good" /
 *     "Pattern") → expected to be silent.
 *   • Lint each snippet with ONLY that rule enabled.
 *   • Compare actual fired/silent against expected.
 *
 * Disagreements = the rule's own documentation contradicts its
 * implementation. Each disagreement is a bug in either the rule
 * (FN/FP) or the doc (mislabelled example) — both deserve to be fixed.
 *
 * This harness scales beyond ilb-stress-test.ts (which is hand-curated)
 * — it covers every rule that has a doc with a ❌ section, today ~240
 * of the ~400 rules in the fleet.
 *
 * Output:
 *   benchmark-results/stress-test-docs.json — per-rule verdicts
 *   benchmark-results/stress-test-docs-summary.md — top disagreements
 *
 * Usage:
 *   tsx scripts/ilb-stress-test-docs.ts                       # all rules
 *   tsx scripts/ilb-stress-test-docs.ts --plugin=secure-coding
 *   tsx scripts/ilb-stress-test-docs.ts --rule=detect-object-injection
 *   tsx scripts/ilb-stress-test-docs.ts --quiet                # only print summary
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const REPORT_PATH = path.join(ROOT, 'benchmark-results', 'stress-test-docs.json');
const SUMMARY_PATH = path.join(ROOT, 'benchmark-results', 'stress-test-docs-summary.md');

const args = process.argv.slice(2);
const opt = (n: string) => {
  const eq = args.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const idx = args.indexOf(`--${n}`);
  return idx >= 0 ? args[idx + 1] : undefined;
};
const PLUGIN_FILTER = opt('plugin');
const RULE_FILTER = opt('rule');
const QUIET = args.includes('--quiet');

interface CaseResult {
  plugin: string;
  rule: string;
  shortName: string;
  section: 'incorrect' | 'correct';
  blockIndex: number;
  lang: string | null;
  parserUsed?: string;
  expected: 'fire' | 'silent';
  actual: 'fire' | 'silent' | 'parse-error' | 'load-error';
  match: boolean;
  ruleHits?: number;
  firstMessage?: string;
  errorDetails?: string;
}

interface PerRuleSummary {
  plugin: string;
  rule: string;
  shortName: string;
  totalCases: number;
  matched: number;
  fnCount: number; // expected fire, was silent
  fpCount: number; // expected silent, was fire
  parseErrors: number;
  loadErrors: number;
  loadErrorReason?: 'plugin-failed' | 'rule-not-registered'; // distinguishes registration drift from load failures
}

// ── Plugin loader (cached) ──────────────────────────────────────────

interface LoadedPlugin {
  rules: Record<string, unknown>;
  loadedFrom: string;
}

const pluginCache = new Map<string, LoadedPlugin | null>();

async function loadPlugin(pluginName: string): Promise<LoadedPlugin | null> {
  if (pluginCache.has(pluginName)) return pluginCache.get(pluginName) ?? null;
  // Prefer `dist/` over `src/` because compiled JS sidesteps TS-only constructs.
  // Then fall back to `src/` via tsx for plugins that don't ship a build.
  const candidates = [
    path.join(PACKAGES_DIR, pluginName, 'dist', 'index.js'),
    path.join(PACKAGES_DIR, pluginName, 'dist', 'index.cjs'),
    path.join(PACKAGES_DIR, pluginName, 'dist', 'index.mjs'),
    path.join(PACKAGES_DIR, pluginName, 'src', 'index.ts'),
    path.join(PACKAGES_DIR, pluginName, 'src', 'index.tsx'),
    path.join(PACKAGES_DIR, pluginName, 'src', 'index.js'),
  ];
  for (const c of candidates) {
    if (!fs.existsSync(c)) continue;
    try {
      const mod = await import(c);
      const plugin = (mod.default ?? mod) as { rules?: Record<string, unknown> };
      if (plugin && plugin.rules && Object.keys(plugin.rules).length > 0) {
        const loaded: LoadedPlugin = { rules: plugin.rules, loadedFrom: path.relative(ROOT, c) };
        pluginCache.set(pluginName, loaded);
        return loaded;
      }
    } catch {
      // fall through to next candidate
    }
  }
  pluginCache.set(pluginName, null);
  return null;
}

// ── Rule + doc discovery ────────────────────────────────────────────

function listPlugins(): string[] {
  return fs
    .readdirSync(PACKAGES_DIR)
    .filter((d) => d.startsWith('eslint-plugin-'))
    .filter((d) => fs.statSync(path.join(PACKAGES_DIR, d)).isDirectory())
    .filter((d) => !PLUGIN_FILTER || d.endsWith(PLUGIN_FILTER) || d === PLUGIN_FILTER);
}

function pluginShortName(pluginName: string): string {
  // e.g. "eslint-plugin-secure-coding" → "secure-coding"
  return pluginName.replace(/^eslint-plugin-/, '');
}

function listRulesWithDocs(pluginName: string): Array<{ rule: string; docPath: string }> {
  const docsDir = path.join(PACKAGES_DIR, pluginName, 'docs', 'rules');
  if (!fs.existsSync(docsDir)) return [];
  return fs
    .readdirSync(docsDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ rule: f.replace(/\.md$/, ''), docPath: path.join(docsDir, f) }))
    .filter((r) => !RULE_FILTER || r.rule === RULE_FILTER);
}

// ── Doc parsing ─────────────────────────────────────────────────────

interface ExtractedBlock {
  section: 'incorrect' | 'correct';
  lang: string | null;
  code: string;
}

// Languages we never try to lint — they're embedded in rule docs for
// context (Mermaid diagrams under "Rule Details", JSON config snippets,
// shell invocations, etc.) but they're not JavaScript.
const NON_CODE_LANGS = new Set([
  'mermaid', 'text', 'plain', 'plaintext',
  'json', 'jsonc', 'json5', 'yaml', 'yml', 'toml',
  'bash', 'sh', 'shell', 'console', 'zsh', 'fish',
  'html', 'xml', 'svg', 'css', 'scss', 'sass', 'less',
  'markdown', 'md', 'mdx',
  'sql', 'diff', 'patch',
  'graphql', 'gql',
]);

// Recognise comment-only "placeholder" snippets that some plugins use as
// a doc skeleton ("// Violation of foo / See rule source for specific
// examples"). They're not real examples; we skip them so they don't show
// up as fake FN/FP findings.
function isPlaceholderSnippet(code: string): boolean {
  const stripped = code
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^\/\/|^\/\*|^\*/.test(l) && l !== '*/')
    .join('\n');
  // After stripping comments and blank lines, if there's no real code, skip.
  return stripped.length === 0;
}

function extractBlocks(md: string): ExtractedBlock[] {
  // Heading regex tolerates leading emoji / decoration ("## ❌ Incorrect").
  const headingRe = /^##+[^\n]*$/gm;
  const headers: Array<{ index: number; section: 'incorrect' | 'correct' | null }> = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(md)) !== null) {
    // Strip the #, leading whitespace, and any decoration emoji to get the
    // "core" heading text. We then match section keywords as the *first
    // word* of that text — anchoring prevents headings like "Recommended
    // Override Patterns" or "Best Practices" from sweeping in code blocks
    // that aren't the rule's canonical example.
    const core = m[0]
      .replace(/^#+\s*/, '')
      .replace(/^[❌✅🚫🔴🟢🟠]+\s*/u, '')
      .trim()
      .toLowerCase();
    let section: 'incorrect' | 'correct' | null = null;
    // Anchored: the whole heading IS the section marker (allows trailing
    // qualifier like "Incorrect / Bad / Anti-Pattern" but rejects
    // longer titles).
    if (/^(incorrect|bad|anti[-\s]?pattern|wrong|don['’]?t)\b/.test(core)) section = 'incorrect';
    else if (/^(correct|good|do|right)\b/.test(core)) section = 'correct';
    // Whole-heading emoji marker (e.g. "❌ Incorrect" → already stripped,
    // OR a heading like "### ✅" alone).
    else if (/^❌|incorrect/.test(m[0].toLowerCase())) section = 'incorrect';
    else if (m[0].startsWith('✅')) section = 'correct';
    headers.push({ index: m.index + m[0].length, section });
  }
  // Section [i] runs from headers[i].index to headers[i+1].index (or EOF).
  const blocks: ExtractedBlock[] = [];
  for (let i = 0; i < headers.length; i++) {
    if (!headers[i].section) continue;
    const start = headers[i].index;
    const end = i + 1 < headers.length ? headers[i + 1].index : md.length;
    const slice = md.slice(start, end);
    // Find fenced code blocks: ```lang\n...\n```
    const fenceRe = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g;
    let f: RegExpExecArray | null;
    while ((f = fenceRe.exec(slice)) !== null) {
      const code = f[2];
      if (isPlaceholderSnippet(code)) continue;
      const lang = (f[1] || '').toLowerCase();
      // Skip non-code language tags — these are diagrams, configs, prose
      // shown for context that the linter has no business parsing.
      if (NON_CODE_LANGS.has(lang)) continue;
      blocks.push({
        section: headers[i].section as 'incorrect' | 'correct',
        lang: f[1] || null,
        code,
      });
    }
  }
  return blocks;
}

// ── Linter helpers ──────────────────────────────────────────────────

const linter = new Linter();

// Try parser variants until one accepts the snippet. Order is widest-first
// to maximize the odds a snippet parses without changing semantics:
//   ts+jsx (covers everything)  →  ts  →  js+jsx  →  js
// Empirically this recovers ~95% of mixed-tag doc snippets where the doc
// language hint is wrong (e.g. JS-tagged block containing JSX/HTML).
type ParserAttempt = { name: string; parser?: Linter.Parser; jsx: boolean };

function buildParserChain(lang: string | null): ParserAttempt[] {
  const ts = tsParser as unknown as Linter.Parser;
  // Hint-led ordering (we still fall back to the others if the hint is wrong).
  if (lang === 'tsx') return [
    { name: 'ts+jsx', parser: ts, jsx: true },
    { name: 'js+jsx', jsx: true },
    { name: 'ts', parser: ts, jsx: false },
    { name: 'js', jsx: false },
  ];
  if (lang === 'ts' || lang === 'typescript') return [
    { name: 'ts', parser: ts, jsx: false },
    { name: 'ts+jsx', parser: ts, jsx: true },
    { name: 'js', jsx: false },
  ];
  if (lang === 'jsx') return [
    { name: 'js+jsx', jsx: true },
    { name: 'ts+jsx', parser: ts, jsx: true },
    { name: 'js', jsx: false },
  ];
  // Default (js / unknown / no language tag): widen progressively.
  return [
    { name: 'js', jsx: false },
    { name: 'js+jsx', jsx: true },
    { name: 'ts', parser: ts, jsx: false },
    { name: 'ts+jsx', parser: ts, jsx: true },
  ];
}

// Pre-processing wrappers for snippets that are "almost valid" in their
// language but use a doc convention that breaks strict parsing. We try
// the bare snippet first; only fall back to wrappers when the bare form
// fails. Each wrapper preserves the snippet's AST shape so rule visitors
// still match the original nodes.
type Wrapper = { name: string; wrap: (code: string) => string };

const JSX_WRAPPERS: Wrapper[] = [
  { name: 'jsx-fragment', wrap: (c) => `<>${c}</>` }, // multiple adjacent JSX elements
  { name: 'jsx-function-body', wrap: (c) => `function _doc(){\n  return (<>\n${c}\n</>);\n}` },
];

// Preprocessing: replace `{ ... }` doc-placeholder blocks with `{}` so
// parsers don't choke on the literal three-dot ellipsis. Real spread
// syntax (`{...obj}`, `[...arr]`, `(...args)`) is unaffected — only the
// "block-with-only-ellipsis" form gets normalised.
function normaliseEllipsisPlaceholders(code: string): string {
  // Match `{` whitespace `...` whitespace `}` — must be surrounded by
  // characters that wouldn't form a real spread (block context).
  return code.replace(/\{[\s\n]*\.\.\.[\s\n]*\}/g, '{}');
}

// Strip trailing `//` comments that follow a JSX-closing tag on the
// same line. Doc convention: `<a target="_new">x</a>  // Typo: _new`.
// Inside JSX text these comments are syntactically invalid and the doc
// author meant them as side-channel commentary — drop them to parse.
function stripJsxTrailingComments(code: string): string {
  return code.replace(/(\/?>)\s+\/\/[^\n]*(?=\n|$)/g, '$1');
}

// Common JSX-text ambiguities in doc examples. The chars are valid JSX
// text in real code (because the surrounding context disambiguates), but
// in standalone snippets the parser can't tell `5 > 3` is a binary
// expression vs JSX text. Replace bare `>` and `<` between alphanumerics
// inside JSX text with their HTML entities, ONLY if they're surrounded
// by whitespace (binary operator pattern).
function escapeJsxTextOperators(code: string): string {
  // ` > `  (whitespace + > + whitespace) → &gt;
  // ` < `  (whitespace + < + whitespace) → &lt;
  // We're careful not to touch `<Foo>` or `</Foo>` (alpha follows the bracket).
  return code
    .replace(/([0-9A-Za-z)])\s+>\s+([0-9A-Za-z(])/g, '$1 &gt; $2')
    .replace(/([0-9A-Za-z)])\s+<\s+([0-9A-Za-z(])/g, '$1 &lt; $2');
}

function tryParse(
  shortName: string,
  pluginShort: string,
  ruleObject: unknown,
  code: string,
  attempt: ParserAttempt,
): { fatal: boolean; messages: Linter.LintMessage[] } {
  const languageOptions: Record<string, unknown> = {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: attempt.jsx } },
  };
  if (attempt.parser) languageOptions.parser = attempt.parser;
  try {
    const messages = linter.verify(
      code,
      {
        languageOptions: languageOptions as never,
        plugins: { [pluginShort]: { rules: { [shortName]: ruleObject } } } as never,
        rules: { [`${pluginShort}/${shortName}`]: 'error' } as never,
      } as never,
    );
    return { fatal: messages.some((m) => m.fatal), messages };
  } catch {
    return { fatal: true, messages: [] };
  }
}

function lintSnippet(
  shortName: string,
  pluginShort: string,
  ruleObject: unknown,
  code: string,
  lang: string | null,
): { messages: Linter.LintMessage[]; parseError: boolean; usedParser: string } {
  const chain = buildParserChain(lang);

  // Pass 1: bare code under each parser.
  for (const attempt of chain) {
    const r = tryParse(shortName, pluginShort, ruleObject, code, attempt);
    if (!r.fatal) {
      return {
        messages: r.messages.filter((m) => m.ruleId === `${pluginShort}/${shortName}`),
        parseError: false,
        usedParser: attempt.name,
      };
    }
  }

  // Pass 2: only for JSX/TSX-capable attempts, retry with the snippet
  // wrapped to handle adjacent-elements / top-level-JSX-statement cases.
  const jsxCapable = chain.filter((a) => a.jsx);
  for (const wrapper of JSX_WRAPPERS) {
    const wrapped = wrapper.wrap(code);
    for (const attempt of jsxCapable) {
      const r = tryParse(shortName, pluginShort, ruleObject, wrapped, attempt);
      if (!r.fatal) {
        return {
          messages: r.messages.filter((m) => m.ruleId === `${pluginShort}/${shortName}`),
          parseError: false,
          usedParser: `${attempt.name}+${wrapper.name}`,
        };
      }
    }
  }

  // Pass 3: normalise `{ ... }` doc-placeholder blocks and retry the
  // whole chain. Real spread syntax is unaffected.
  const normalised = normaliseEllipsisPlaceholders(code);
  if (normalised !== code) {
    for (const attempt of chain) {
      const r = tryParse(shortName, pluginShort, ruleObject, normalised, attempt);
      if (!r.fatal) {
        return {
          messages: r.messages.filter((m) => m.ruleId === `${pluginShort}/${shortName}`),
          parseError: false,
          usedParser: `${attempt.name}+ellipsis-norm`,
        };
      }
    }
  }

  // Pass 4: JSX text-content normalisation — strip trailing line
  // comments after JSX-closing brackets, escape bare `>` / `<` operator
  // patterns inside JSX text, then retry through JSX wrappers and the
  // full chain. Handles: `<a/>  // typo`, `<div>5 > 3</div>`, etc.
  const jsxFixed = escapeJsxTextOperators(stripJsxTrailingComments(code));
  if (jsxFixed !== code) {
    for (const attempt of chain) {
      const r = tryParse(shortName, pluginShort, ruleObject, jsxFixed, attempt);
      if (!r.fatal) {
        return {
          messages: r.messages.filter((m) => m.ruleId === `${pluginShort}/${shortName}`),
          parseError: false,
          usedParser: `${attempt.name}+jsx-text-norm`,
        };
      }
    }
    // Combined JSX text norm + fragment wrappers
    for (const wrapper of JSX_WRAPPERS) {
      const wrapped = wrapper.wrap(jsxFixed);
      for (const attempt of chain.filter((a) => a.jsx)) {
        const r = tryParse(shortName, pluginShort, ruleObject, wrapped, attempt);
        if (!r.fatal) {
          return {
            messages: r.messages.filter((m) => m.ruleId === `${pluginShort}/${shortName}`),
            parseError: false,
            usedParser: `${attempt.name}+${wrapper.name}+jsx-text-norm`,
          };
        }
      }
    }
  }

  return { messages: [], parseError: true, usedParser: 'failed' };
}

// ── Main sweep ──────────────────────────────────────────────────────

async function main() {
  const allResults: CaseResult[] = [];
  const perRule: PerRuleSummary[] = [];
  const startedAt = Date.now();

  for (const pluginName of listPlugins()) {
    const shortPlugin = pluginShortName(pluginName);
    const rules = listRulesWithDocs(pluginName);
    if (rules.length === 0) continue;

    const plugin = await loadPlugin(pluginName);
    if (!plugin || !plugin.rules) {
      if (!QUIET) console.log(`⚠️  ${pluginName}: cannot load plugin module — skipping ${rules.length} rule doc(s)`);
      for (const { rule } of rules) {
        perRule.push({
          plugin: pluginName,
          rule: `${shortPlugin}/${rule}`,
          shortName: rule,
          totalCases: 0,
          matched: 0,
          fnCount: 0,
          fpCount: 0,
          parseErrors: 0,
          loadErrors: 1,
          loadErrorReason: 'plugin-failed',
        });
      }
      continue;
    }

    for (const { rule, docPath } of rules) {
      const ruleObject = plugin.rules[rule];
      const summary: PerRuleSummary = {
        plugin: pluginName,
        rule: `${shortPlugin}/${rule}`,
        shortName: rule,
        totalCases: 0,
        matched: 0,
        fnCount: 0,
        fpCount: 0,
        parseErrors: 0,
        loadErrors: 0,
      };
      if (!ruleObject) {
        // Plugin loaded fine but the rule isn't in its `rules` map — orphan
        // doc OR unwired implementation. Both are different bugs from a
        // plugin module that won't load at all.
        summary.loadErrors = 1;
        summary.loadErrorReason = 'rule-not-registered';
        perRule.push(summary);
        continue;
      }

      let md: string;
      try {
        md = fs.readFileSync(docPath, 'utf-8');
      } catch {
        perRule.push(summary);
        continue;
      }
      const blocks = extractBlocks(md);
      if (blocks.length === 0) {
        perRule.push(summary);
        continue;
      }

      blocks.forEach((b, i) => {
        const expected: 'fire' | 'silent' = b.section === 'incorrect' ? 'fire' : 'silent';
        const { messages, parseError, usedParser } = lintSnippet(rule, shortPlugin, ruleObject, b.code, b.lang);
        if (parseError) {
          summary.totalCases++;
          summary.parseErrors++;
          allResults.push({
            plugin: pluginName,
            rule: `${shortPlugin}/${rule}`,
            shortName: rule,
            section: b.section,
            blockIndex: i,
            lang: b.lang,
            parserUsed: usedParser,
            expected,
            actual: 'parse-error',
            match: false,
          });
          return;
        }
        const fired = messages.length > 0;
        const actual: 'fire' | 'silent' = fired ? 'fire' : 'silent';
        const match = actual === expected;
        summary.totalCases++;
        if (match) summary.matched++;
        else if (expected === 'fire' && actual === 'silent') summary.fnCount++;
        else summary.fpCount++;
        allResults.push({
          plugin: pluginName,
          rule: `${shortPlugin}/${rule}`,
          shortName: rule,
          section: b.section,
          blockIndex: i,
          lang: b.lang,
          parserUsed: usedParser,
          expected,
          actual,
          match,
          ruleHits: messages.length,
          firstMessage: messages[0]?.message?.slice(0, 120),
        });
      });
      perRule.push(summary);
    }
  }

  // Aggregate counts
  const totals = {
    plugins: new Set(perRule.map((p) => p.plugin)).size,
    rulesScanned: perRule.length,
    rulesWithCases: perRule.filter((p) => p.totalCases > 0).length,
    cases: allResults.length,
    matched: allResults.filter((r) => r.match).length,
    fns: allResults.filter((r) => r.expected === 'fire' && r.actual === 'silent').length,
    fps: allResults.filter((r) => r.expected === 'silent' && r.actual === 'fire').length,
    parseErrors: allResults.filter((r) => r.actual === 'parse-error').length,
    loadErrors: perRule.filter((p) => p.loadErrors > 0).length,
    durationMs: Date.now() - startedAt,
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), totals, perRule, results: allResults }, null, 2),
  );

  // Top disagreements (rules with the most contractual mismatches)
  const ranked = perRule
    .filter((r) => r.fnCount + r.fpCount > 0)
    .toSorted((a, b) => (b.fnCount + b.fpCount) - (a.fnCount + a.fpCount));

  // Top FN-only and FP-only lists
  const topFn = ranked.filter((r) => r.fnCount > 0).slice(0, 25);
  const topFp = ranked.filter((r) => r.fpCount > 0).slice(0, 25);

  let summaryMd = `# ILB Doc-Harvest Stress Test\n\n`;
  summaryMd += `> Generated ${new Date().toISOString().slice(0, 10)} from each rule's own \`## ❌ Incorrect\` and \`## ✅ Correct\` doc blocks. Disagreements = the rule's documentation contradicts its implementation.\n\n`;
  summaryMd += `## Top-line\n\n`;
  summaryMd += `- **${totals.plugins}** plugins scanned · **${totals.rulesScanned}** rules with docs · **${totals.rulesWithCases}** rules contributed cases\n`;
  summaryMd += `- **${totals.cases}** total cases · **${totals.matched}** matched expectation\n`;
  summaryMd += `- **${totals.fns}** FN findings (rule silent on doc-labelled vulnerable example)\n`;
  summaryMd += `- **${totals.fps}** FP findings (rule fired on doc-labelled safe example)\n`;
  summaryMd += `- ${totals.parseErrors} snippets failed to parse · ${totals.loadErrors} plugins failed to load\n`;
  summaryMd += `- Duration: ${(totals.durationMs / 1000).toFixed(1)} s\n\n`;
  summaryMd += `## Rules with the most FN findings (rule misses its own bad examples)\n\n`;
  summaryMd += `| Rule | Cases | FN | FP | Matched |\n|---|---:|---:|---:|---:|\n`;
  for (const r of topFn) {
    summaryMd += `| \`${r.rule}\` | ${r.totalCases} | ${r.fnCount} | ${r.fpCount} | ${r.matched} |\n`;
  }
  summaryMd += `\n## Rules with the most FP findings (rule fires on its own good examples)\n\n`;
  summaryMd += `| Rule | Cases | FP | FN | Matched |\n|---|---:|---:|---:|---:|\n`;
  for (const r of topFp) {
    summaryMd += `| \`${r.rule}\` | ${r.totalCases} | ${r.fpCount} | ${r.fnCount} | ${r.matched} |\n`;
  }
  summaryMd += `\n## How to drill into a single rule\n\n`;
  summaryMd += `\`\`\`bash\nnpm run ilb:stress-test-docs -- --rule=<rule-name>\n\`\`\`\n\nThen inspect \`benchmark-results/stress-test-docs.json\` for the per-block verdict — each entry includes \`section\`, \`blockIndex\`, \`expected\`, \`actual\`, and \`firstMessage\`.\n`;

  fs.writeFileSync(SUMMARY_PATH, summaryMd);

  console.log(`\nILB Doc-Harvest Stress Test — ${(totals.durationMs / 1000).toFixed(1)} s\n`);
  console.log(`  ${totals.plugins} plugins · ${totals.rulesScanned} rules with docs · ${totals.rulesWithCases} contributed cases`);
  console.log(`  ${totals.cases} cases · ${totals.matched} matched · ${totals.fns} FN · ${totals.fps} FP · ${totals.parseErrors} parse-error · ${totals.loadErrors} load-error\n`);
  if (!QUIET) {
    console.log(`Top 10 rules by disagreement count:`);
    for (const r of ranked.slice(0, 10)) {
      console.log(`  ${(r.fnCount + r.fpCount).toString().padStart(3)} · ${r.rule.padEnd(50)} (${r.fnCount} FN, ${r.fpCount} FP, ${r.totalCases} cases)`);
    }
  }
  console.log(`\n✅ ${path.relative(ROOT, REPORT_PATH)}`);
  console.log(`✅ ${path.relative(ROOT, SUMMARY_PATH)}`);
  process.exit(totals.fns + totals.fps > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
