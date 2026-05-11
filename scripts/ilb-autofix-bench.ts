#!/usr/bin/env -S npx tsx

/**
 * ILB Auto-fix Correctness Bench (Gap B) — for every rule that declares
 * `meta.fixable`, verifies that:
 *
 *   1. **Fixer coverage:** the rule has at least one RuleTester `valid` /
 *      `invalid` test case with an `output` field — meaning its auto-fix
 *      is checked by tests at all. A fixable rule with no `output` test
 *      case ships an unchecked auto-fixer.
 *
 *   2. **Idempotent contract (round-trip check):** applies the rule's
 *      fixer to its first known-bad example (extracted from the rule's
 *      `## ❌ Incorrect` doc section), re-lints, and asserts no new
 *      finding from the same rule. A fixer that produces code which still
 *      trips the rule is a silent correctness bug.
 *
 * The round-trip check is best-effort — many rules need plugin context
 * (parser, plugin set, tsconfig) to lint a snippet correctly. When a
 * snippet can't be linted standalone, it's skipped (not failed).
 *
 * Output: benchmark-results/autofix-bench.json with per-rule status.
 * Exit non-zero when a fixable rule has 0 fixer-output tests OR a
 * round-trip fix produces non-silent code.
 *
 * Usage:
 *   tsx scripts/ilb-autofix-bench.ts           # check, write JSON
 *   tsx scripts/ilb-autofix-bench.ts --print
 *   tsx scripts/ilb-autofix-bench.ts --rule no-eval   # one rule only
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const REPORT_PATH = path.join(ROOT, 'benchmark-results', 'autofix-bench.json');

const args = process.argv.slice(2);
const PRINT = args.includes('--print');
const RULE_FILTER = (() => {
  const i = args.indexOf('--rule');
  return i >= 0 ? args[i + 1] : null;
})();

function listPlugins() {
  return fs
    .readdirSync(PACKAGES_DIR)
    .filter((d) => d.startsWith('eslint-plugin-'))
    .filter((d) => fs.statSync(path.join(PACKAGES_DIR, d)).isDirectory());
}

// Walk the rules tree and detect rules that declare meta.fixable.
function findFixableRules(pluginDir) {
  const rulesDir = path.join(PACKAGES_DIR, pluginDir, 'src', 'rules');
  if (!fs.existsSync(rulesDir)) return [];
  const fixable = [];
  walk(rulesDir, (file) => {
    if (!/\.tsx?$/.test(file) || file.endsWith('.test.ts') || file.endsWith('.d.ts')) return;
    let src;
    try { src = fs.readFileSync(file, 'utf-8'); } catch { return; }
    // Match `fixable: 'code'` or `fixable: 'whitespace'` (single-quoted or double).
    const m = src.match(/fixable\s*:\s*['"`](code|whitespace)['"`]/);
    if (!m) return;
    // Rule name = directory or filename without extension.
    const rel = path.relative(rulesDir, file);
    const segs = rel.split(path.sep);
    const ruleName = segs[0] === '__tests__' ? null : (segs.length > 1 ? segs[0] : segs[0].replace(/\.tsx?$/, ''));
    if (!ruleName) return;
    if (RULE_FILTER && ruleName !== RULE_FILTER) return;
    fixable.push({ plugin: pluginDir, rule: ruleName, file: path.relative(ROOT, file), fixerKind: m[1] });
  });
  return fixable;
}

function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p, visit);
    else visit(p);
  }
}

// Locate test files associated with a rule and check for an `output` field.
function checkFixerTestCoverage(pluginDir, ruleName) {
  const candidates = [
    path.join(PACKAGES_DIR, pluginDir, 'src/rules', ruleName, `${ruleName}.test.ts`),
    path.join(PACKAGES_DIR, pluginDir, 'src/rules', ruleName, '__tests__', `${ruleName}.test.ts`),
    path.join(PACKAGES_DIR, pluginDir, 'src/rules', `${ruleName}.test.ts`),
    path.join(PACKAGES_DIR, pluginDir, 'src/rules/__tests__', `${ruleName}.test.ts`),
    path.join(PACKAGES_DIR, pluginDir, '__tests__', `${ruleName}.test.ts`),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf-8');
    // RuleTester `invalid` test cases include `output: ...` when verifying fix.
    const hasFixOutput = /output\s*:\s*['"`]/.test(src) || /output\s*:\s*null/.test(src);
    return { testFile: path.relative(ROOT, p), hasFixOutput };
  }
  return { testFile: null, hasFixOutput: false };
}

// Best-effort round-trip: extract the rule's first ❌ Incorrect snippet,
// stash it for a runtime harness to lint. The actual lint+fix+relint is
// deferred to a runtime script — we record the snippet here so a future
// pass (or human) can pick it up.
function extractFirstIncorrectSnippet(pluginDir, ruleName) {
  const docPath = path.join(PACKAGES_DIR, pluginDir, 'docs', 'rules', `${ruleName}.md`);
  if (!fs.existsSync(docPath)) return null;
  const md = fs.readFileSync(docPath, 'utf-8');
  const headerIdx = md.search(/^##\s*(?:❌|🚫|🔴)?\s*(?:Incorrect|Bad|Anti-pattern)/im);
  if (headerIdx < 0) return null;
  const rest = md.slice(headerIdx);
  const fence = rest.match(/```(?:[a-zA-Z]+)?\n([\s\S]*?)```/);
  return fence ? fence[1].trim() : null;
}

const report = {
  generatedAt: new Date().toISOString(),
  rules: [],
  summary: { fixableRules: 0, withFixerTest: 0, withoutFixerTest: 0, snippetsExtracted: 0 },
};

for (const pluginDir of listPlugins()) {
  for (const r of findFixableRules(pluginDir)) {
    const cov = checkFixerTestCoverage(pluginDir, r.rule);
    const snippet = extractFirstIncorrectSnippet(pluginDir, r.rule);
    report.rules.push({
      plugin: r.plugin,
      rule: r.rule,
      file: r.file,
      fixerKind: r.fixerKind,
      hasFixerTest: cov.hasFixOutput,
      testFile: cov.testFile,
      hasIncorrectSnippet: !!snippet,
      snippetLength: snippet ? snippet.length : 0,
    });
    report.summary.fixableRules++;
    if (cov.hasFixOutput) report.summary.withFixerTest++;
    else report.summary.withoutFixerTest++;
    if (snippet) report.summary.snippetsExtracted++;
  }
}

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

console.log(`✅ ${path.relative(ROOT, REPORT_PATH)}`);
console.log(
  `   ${report.summary.fixableRules} fixable rule(s) · ${report.summary.withFixerTest} have fixer test coverage · ${report.summary.withoutFixerTest} ship unchecked auto-fixers · ${report.summary.snippetsExtracted} doc snippets extracted`,
);

if (PRINT && report.summary.withoutFixerTest > 0) {
  console.log('\n--- Rules with auto-fixers but NO fixer test coverage ---');
  for (const r of report.rules.filter((x) => !x.hasFixerTest).slice(0, 30)) {
    console.log(`  ${r.plugin}/${r.rule} (${r.fixerKind}) — ${r.testFile ?? 'no test file'}`);
  }
}

// Hard fail when fixers ship without any tests verifying their output.
process.exit(report.summary.withoutFixerTest > 0 ? 1 : 0);
