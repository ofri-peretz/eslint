#!/usr/bin/env -S npx tsx
/**
 * docs:cwe-coverage — emit a sortable CWE coverage report for the MITRE
 * compatibility submission (criterion RR-1: CWE Spec) and the public docs
 * page (criterion MR-4).
 *
 * Walks every ESLint plugin under packages/eslint-plugin-NAME/src/rules/,
 * extracts each rule's CWE annotation from its `meta` block, and emits:
 *
 *   benchmark-results/cwe-coverage.json        machine-readable, sortable
 *   benchmark-results/cwe-coverage.md          human-readable rollup
 *   benchmark-results/cwe-coverage-gaps.md     CWE Top-25 entries with no rule
 *
 * The script is the *single source of truth* for "which CWEs do we cover."
 * The docs page (`apps/docs/content/docs/cwe-compatibility.mdx`) embeds
 * this report so the public page stays in sync without manual edits.
 *
 * Usage:
 *   npm run docs:cwe-coverage
 *   node scripts/docs-cwe-coverage.mjs --json
 *   node scripts/docs-cwe-coverage.mjs --check       # CI gate: fail if any unmapped rule has no `cwe: null` justification
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const PACKAGES_ROOT = path.join(REPO_ROOT, 'packages');
const OUT_DIR = path.join(REPO_ROOT, 'benchmark-results');

const CHECK = process.argv.includes('--check');
const JSON_ONLY = process.argv.includes('--json');

// MITRE CWE Top 25 (2024 list). Reused by the coverage-gap report.
const CWE_TOP_25 = [
  'CWE-79',  'CWE-787', 'CWE-89',  'CWE-352', 'CWE-22',
  'CWE-125', 'CWE-78',  'CWE-416', 'CWE-862', 'CWE-434',
  'CWE-94',  'CWE-20',  'CWE-77',  'CWE-287', 'CWE-269',
  'CWE-502', 'CWE-200', 'CWE-863', 'CWE-918', 'CWE-119',
  'CWE-476', 'CWE-798', 'CWE-190', 'CWE-400', 'CWE-306',
];

const CWE_TOP_10_OWASP = ['CWE-79', 'CWE-89', 'CWE-78', 'CWE-22', 'CWE-94', 'CWE-918', 'CWE-77', 'CWE-352', 'CWE-862', 'CWE-863'];

function discoverPlugins() {
  if (!fs.existsSync(PACKAGES_ROOT)) return [];
  return fs.readdirSync(PACKAGES_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('eslint-plugin-'))
    .map((e) => ({
      pluginName: e.name.replace(/^eslint-plugin-/, ''),
      dir: path.join(PACKAGES_ROOT, e.name),
    }));
}

/**
 * Pull `cwe` annotations out of a rule's source file. Tolerant of three
 * conventional shapes used across the plugin ecosystem:
 *   meta.cwe = 'CWE-89'
 *   meta.docs.cwe = ['CWE-89', 'CWE-943']
 *   // @cwe CWE-89    (block-comment marker for legacy rules)
 */
function extractCwes(source) {
  const cwes = new Set();
  const justifications = new Set();
  const single = source.matchAll(/\bcwe\s*[:=]\s*['"`](CWE-\d+)['"`]/g);
  for (const m of single) cwes.add(m[1]);
  const arrays = source.matchAll(/\bcwe\s*[:=]\s*\[([^\]]+)\]/g);
  for (const m of arrays) {
    const ids = m[1].matchAll(/['"`](CWE-\d+)['"`]/g);
    for (const id of ids) cwes.add(id[1]);
  }
  const comments = source.matchAll(/@cwe\s+(CWE-\d+)/g);
  for (const m of comments) cwes.add(m[1]);
  // Explicit "no CWE applicable" justification — recognized by an `cweJustification` field
  const justify = source.match(/\bcweJustification\s*[:=]\s*['"`]([^'"`]+)['"`]/);
  if (justify) justifications.add(justify[1]);
  // Or `cwe: null` with a trailing comment explaining why
  const explicitNull = source.match(/\bcwe\s*[:=]\s*null\s*,?\s*(?:\/\/|\/\*)\s*(.+?)(?:\*\/|$)/m);
  if (explicitNull) justifications.add(explicitNull[1].trim());
  return { cwes: [...cwes], justifications: [...justifications] };
}

function listRulesForPlugin(plugin) {
  const rulesDir = path.join(plugin.dir, 'src', 'rules');
  if (!fs.existsSync(rulesDir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(rulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const ruleName = entry.name;
    const candidates = ['index.ts', 'index.js', `${ruleName}.ts`, `${ruleName}.js`];
    for (const f of candidates) {
      const p = path.join(rulesDir, ruleName, f);
      if (!fs.existsSync(p)) continue;
      const src = fs.readFileSync(p, 'utf8');
      const { cwes, justifications } = extractCwes(src);
      out.push({
        plugin: plugin.pluginName,
        rule: `${plugin.pluginName}/${ruleName}`,
        cwes,
        justifications,
        sourcePath: path.relative(REPO_ROOT, p),
      });
      break;
    }
  }
  return out;
}

function buildCoverageReport(rules) {
  const byCwe = new Map();
  const unmapped = [];
  for (const r of rules) {
    if (r.cwes.length === 0) {
      unmapped.push(r);
      continue;
    }
    for (const cwe of r.cwes) {
      if (!byCwe.has(cwe)) byCwe.set(cwe, []);
      byCwe.get(cwe).push(r.rule);
    }
  }
  const coveredCwes = [...byCwe.keys()].sort((a, b) => parseInt(a.slice(4)) - parseInt(b.slice(4)));
  const top25Covered = CWE_TOP_25.filter((c) => byCwe.has(c));
  const top25Gaps = CWE_TOP_25.filter((c) => !byCwe.has(c));
  return { byCwe, coveredCwes, unmapped, top25Covered, top25Gaps };
}

function renderCoverageMd(report) {
  const lines = [];
  lines.push('# Interlace CWE Coverage');
  lines.push('');
  lines.push(`> Generated by \`npm run docs:cwe-coverage\`. Last run: ${new Date().toISOString()}.`);
  lines.push('> Single source of truth for which CWEs the Interlace ESLint ecosystem covers. Embedded by [docs/cwe-compatibility](../apps/docs/content/docs/cwe-compatibility.mdx).');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Distinct CWEs covered:** ${report.coveredCwes.length}`);
  lines.push(`- **CWE Top-25 covered:** ${report.top25Covered.length} of 25 (${(report.top25Covered.length / 25 * 100).toFixed(0)}%)`);
  lines.push(`- **CWE Top-25 gaps:** ${report.top25Gaps.length} (see [coverage gaps](./cwe-coverage-gaps.md))`);
  lines.push(`- **Rules unmapped to any CWE:** ${report.unmapped.length}`);
  lines.push('');
  lines.push('## Coverage table');
  lines.push('');
  lines.push('| CWE | Top-25? | OWASP Top-10? | Rules | Plugins |');
  lines.push('|---|:---:|:---:|---|---|');
  for (const cwe of report.coveredCwes) {
    const rules = report.byCwe.get(cwe);
    const isTop25 = CWE_TOP_25.includes(cwe) ? '✓' : '';
    const isOwasp = CWE_TOP_10_OWASP.includes(cwe) ? '✓' : '';
    const plugins = [...new Set(rules.map((r) => r.split('/')[0]))].sort().join(', ');
    lines.push(`| [${cwe}](https://cwe.mitre.org/data/definitions/${cwe.slice(4)}.html) | ${isTop25} | ${isOwasp} | ${rules.length} | ${plugins} |`);
  }
  lines.push('');
  if (report.unmapped.length > 0) {
    lines.push('## Unmapped rules (CWE annotation pending)');
    lines.push('');
    lines.push('Per principle "every security rule maps to a CWE or carries a `cweJustification` explaining why", these need triage:');
    lines.push('');
    for (const r of report.unmapped) {
      const note = r.justifications.length > 0 ? ` — _justification: ${r.justifications[0]}_` : '';
      lines.push(`- \`${r.rule}\`${note} ([source](../${r.sourcePath}))`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderGapsMd(report) {
  const lines = [];
  lines.push('# CWE Top-25 Coverage Gaps');
  lines.push('');
  lines.push(`> Generated by \`npm run docs:cwe-coverage\`. Last run: ${new Date().toISOString()}.`);
  lines.push('> CWE Top-25 entries with no Interlace rule. Operationalizes MITRE compatibility criterion RR-3 (Coverage Gap List).');
  lines.push('');
  if (report.top25Gaps.length === 0) {
    lines.push('🎉 **No gaps.** All 25 CWE Top-25 entries have at least one Interlace rule.');
    return lines.join('\n');
  }
  lines.push(`**${report.top25Gaps.length} of 25 CWE Top-25 entries are not yet covered:**`);
  lines.push('');
  lines.push('| CWE | Title (lookup) | OWASP Top-10? | JS-detectable? |');
  lines.push('|---|---|:---:|:---:|');
  for (const cwe of report.top25Gaps) {
    const isOwasp = CWE_TOP_10_OWASP.includes(cwe) ? '✓' : '';
    // JS-detectable heuristic: AST-detectable from JS/TS source. C/C++-only CWEs (memory) are out of scope.
    const cppOnly = ['CWE-787', 'CWE-125', 'CWE-416', 'CWE-119', 'CWE-476', 'CWE-190'];
    const detectable = cppOnly.includes(cwe) ? '— (C/C++ memory)' : '✓';
    lines.push(`| [${cwe}](https://cwe.mitre.org/data/definitions/${cwe.slice(4)}.html) | _click ID for definition_ | ${isOwasp} | ${detectable} |`);
  }
  lines.push('');
  lines.push('## Justification for non-coverage');
  lines.push('');
  lines.push('Operationalizes MITRE criterion RR-4 (Coverage Justification):');
  lines.push('');
  lines.push('- **C/C++ memory-safety CWEs** (CWE-787, -125, -416, -119, -476, -190) are out of scope — they require runtime / pointer-arithmetic analysis that JS/TS source doesn\'t expose. Belongs in CodeQL / Coverity.');
  lines.push('- **Information-disclosure CWEs** (CWE-200) typically need data-flow / taint tracking which Interlace doesn\'t do natively — partial coverage exists in `secure-coding/no-leaked-error-message` etc.');
  lines.push('- **Authorization-logic CWEs** (CWE-862, -863, -269) are mostly *application semantics* not detectable from generic AST patterns — covered in `nestjs-security/*` and `express-security/*` for framework-specific patterns only.');
  lines.push('- **Resource-exhaustion CWEs** (CWE-400) overlap with `eslint-plugin-regexp` (ReDoS) — partial coverage; full coverage requires pattern complexity analysis we plan to add.');
  return lines.join('\n');
}

function main() {
  const plugins = discoverPlugins();
  const rules = plugins.flatMap(listRulesForPlugin);
  const report = buildCoverageReport(rules);

  const json = {
    generatedAt: new Date().toISOString(),
    summary: {
      distinctCwes: report.coveredCwes.length,
      totalRules: rules.length,
      unmappedRules: report.unmapped.length,
      top25Covered: report.top25Covered.length,
      top25Gaps: report.top25Gaps.length,
    },
    byCwe: Object.fromEntries(
      report.coveredCwes.map((c) => [c, {
        rules: report.byCwe.get(c),
        top25: CWE_TOP_25.includes(c),
        owaspTop10: CWE_TOP_10_OWASP.includes(c),
      }]),
    ),
    unmappedRules: report.unmapped,
    top25Gaps: report.top25Gaps,
  };

  if (JSON_ONLY) {
    console.log(JSON.stringify(json, null, 2));
    return;
  }

  if (CHECK) {
    const unjustified = report.unmapped.filter((r) => r.justifications.length === 0);
    if (unjustified.length > 0) {
      console.error(`❌ docs:cwe-coverage --check: ${unjustified.length} rules have no CWE annotation AND no cweJustification.`);
      for (const r of unjustified.slice(0, 10)) console.error(`   • ${r.rule}`);
      if (unjustified.length > 10) console.error(`   • ... ${unjustified.length - 10} more`);
      process.exit(1);
    }
    console.log(`✅ docs:cwe-coverage --check: every unmapped rule has a cweJustification (or is fully mapped).`);
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'cwe-coverage.json'), JSON.stringify(json, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'cwe-coverage.md'), renderCoverageMd(report) + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'cwe-coverage-gaps.md'), renderGapsMd(report) + '\n', 'utf8');

  console.log(`docs:cwe-coverage: ${rules.length} rules · ${report.coveredCwes.length} CWEs · Top-25 ${report.top25Covered.length}/25 · ${report.unmapped.length} unmapped`);
  console.log(`  wrote ${path.relative(REPO_ROOT, path.join(OUT_DIR, 'cwe-coverage.json'))}`);
  console.log(`  wrote ${path.relative(REPO_ROOT, path.join(OUT_DIR, 'cwe-coverage.md'))}`);
  console.log(`  wrote ${path.relative(REPO_ROOT, path.join(OUT_DIR, 'cwe-coverage-gaps.md'))}`);
}

main();
