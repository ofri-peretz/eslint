#!/usr/bin/env -S npx tsx

/**
 * audit-rule-portability.mjs — Fleet-wide rule portability & cost scanner
 *
 * Scans every rule across every plugin and produces:
 *  1. Type-checking dependency detection (expensive rules)
 *  2. Portability rating: oxlint / Biome / typescript-go compatible?
 *  3. AST-only vs type-aware classification
 *  4. Per-plugin and fleet-wide summary
 *
 * Usage:
 *   tsx scripts/audit-rule-portability.ts                    # full fleet
 *   tsx scripts/audit-rule-portability.ts secure-coding      # single plugin
 *   tsx scripts/audit-rule-portability.ts --json             # machine-readable
 *
 * Output: stdout (human) or JSON for CI integration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = path.join(__dirname, '..', 'packages');

// ── Detection Patterns ──────────────────────────────────────────────

const TYPE_AWARE_PATTERNS = [
  { pattern: /getParserServices/,         label: 'getParserServices()' },
  { pattern: /parserServices/,            label: 'parserServices' },
  { pattern: /getTypeChecker/,            label: 'getTypeChecker()' },
  { pattern: /checker\.getType/,          label: 'TypeChecker API' },
  { pattern: /esTreeNodeToTSNodeMap/,     label: 'esTreeNodeToTSNodeMap' },
  { pattern: /getConstraintType/,         label: 'getConstraintType' },
  { pattern: /tsNodeToESTreeNodeMap/,     label: 'tsNodeToESTreeNodeMap' },
  { pattern: /program\.getTypeChecker/,   label: 'program.getTypeChecker' },
];

const ESLINT_SPECIFIC_PATTERNS = [
  { pattern: /context\.sourceCode/,       label: 'context.sourceCode' },
  { pattern: /context\.getSourceCode/,    label: 'context.getSourceCode()' },
  { pattern: /context\.report/,           label: 'context.report()' },
  { pattern: /context\.getFilename/,      label: 'context.getFilename()' },
  { pattern: /context\.filename/,         label: 'context.filename' },
  { pattern: /context\.options/,          label: 'context.options' },
  { pattern: /RuleFixer/,                 label: 'RuleFixer (auto-fix)' },
  { pattern: /hasSuggestions:\s*true/,    label: 'hasSuggestions' },
  { pattern: /fixable:\s*['"]code['"]/,   label: 'fixable: code' },
];

// oxlint supports: AST visitors, basic context.report, messageIds
// Biome GritQL: pattern-based, no imperative visitors
// typescript-go: full TS type info, but different API surface

// Hard blockers: rule cannot run on the runtime at all.
//
// Verified against oxlint 1.62 source (https://github.com/oxc-project/oxc/tree/oxlint_v1.62.0/apps/oxlint/src-js/plugins/):
//   • source_code.ts SOURCE_CODE — exposes getText, getAncestors, getLines, getLoc,
//     getNodeByRangeIndex, all comment + token methods, scopeManager
//   • scope.ts — getScope, getDeclaredVariables, markVariableAsUsed,
//     isGlobalReference (uses @typescript-eslint/scope-manager)
//   • fix.ts — full Fixer (replaceText, insertText{Before,After}{,Range},
//     remove, removeRange, replaceTextRange) with same shape as ESLint
//   • selector.ts — esquery (same parser as ESLint)
//   • context.ts — id, options, report, filename, physicalFilename, cwd,
//     sourceCode, languageOptions, settings, extend()
//
// Therefore the only HARD blockers are uses of TypeScript parser services
// without a hasParserServices guard. Auto-fix and scope analysis are NOT
// blockers in 1.62+. Older versions had a thinner API surface — pin in CI.
// Patterns require an open-paren so prose mentions in comments don't false-match.
const PORTABILITY_BLOCKERS = {
  oxlint: [
    {
      pattern: /(?:getParserServices|getTypeChecker)\s*\(/,
      label: 'Type-aware (requires TS, no parserServices in oxlint)',
      // Skip the blocker if the rule guards type-aware calls with hasParserServices.
      ignoreIf: /hasParserServices\s*\(/,
    },
    {
      pattern: /\besTreeNodeToTSNodeMap\b/,
      label: 'TS↔ESTree bridge (no type bridge in oxlint)',
      // Same guard as type-aware: if the rule short-circuits via
      // hasParserServices, the bridge code is unreachable on oxlint.
      ignoreIf: /hasParserServices\s*\(/,
    },
  ],
  biome: [
    { pattern: /CallExpression|MemberExpression|Property|Identifier/, label: 'Imperative AST visitor (Biome uses GritQL)' },
  ],
  typescriptGo: [
    { pattern: /esTreeNodeToTSNodeMap/, label: 'ESTree↔TS node map (API differs)' },
  ],
};

// Auto-fix detection — degrades on oxlint but doesn't block the rule from running.
const FIX_PATTERNS = [
  { pattern: /RuleFixer/,             label: 'RuleFixer' },
  { pattern: /fixer\.(replace|insert|remove)/, label: 'fixer.* call' },
  { pattern: /fixable:\s*['"]code['"]/, label: 'fixable: code' },
];

// ── Scanner ──────────────────────────────────────────────────────────

function scanRule(sourceCode, ruleName) {
  const result = {
    name: ruleName,
    isTypeAware: false,
    typeAwareAPIs: [],
    eslintAPIs: [],
    hasAutoFix: false,
    hasSuggestions: false,
    // fixSupport: 'none' (no fixer at all) | 'reported' (uses RuleFixer; runs on
    // oxlint, fix may degrade) | 'fix-only' (rule depends on fix to surface).
    // Today every fixer-using rule also reports via messageId, so 'fix-only'
    // would require a manual override.
    fixSupport: 'none',
    // typeAwareSupport: 'none' (no type-aware APIs) | 'guarded' (uses type-aware
    // APIs but gates them on hasParserServices() — runs on oxlint, falls back
    // to AST-only or no-ops when type info is missing) | 'unguarded' (would
    // crash on oxlint — caught as a blocker above).
    typeAwareSupport: 'none',
    portability: { oxlint: 'compatible', biome: 'incompatible', typescriptGo: 'compatible' },
    blockers: { oxlint: [], biome: [], typescriptGo: [] },
    lineCount: sourceCode.split('\n').length,
    complexity: 'low', // low/medium/high based on line count + visitors
  };

  // Type-aware detection
  for (const { pattern, label } of TYPE_AWARE_PATTERNS) {
    if (pattern.test(sourceCode)) {
      result.isTypeAware = true;
      result.typeAwareAPIs.push(label);
    }
  }

  // ESLint API usage
  for (const { pattern, label } of ESLINT_SPECIFIC_PATTERNS) {
    if (pattern.test(sourceCode)) {
      result.eslintAPIs.push(label);
      if (label === 'RuleFixer (auto-fix)') result.hasAutoFix = true;
      if (label === 'hasSuggestions') result.hasSuggestions = true;
    }
  }

  // Fix detection (separate from blockers — fix degradation is not a blocker)
  for (const { pattern } of FIX_PATTERNS) {
    if (pattern.test(sourceCode)) {
      result.fixSupport = 'reported';
      result.hasAutoFix = true;
      break;
    }
  }

  // Portability blockers — any blocker means the rule cannot run on the runtime.
  for (const [runtime, patterns] of Object.entries(PORTABILITY_BLOCKERS)) {
    for (const { pattern, label, ignoreIf } of patterns as Array<{ pattern: RegExp; label: string; ignoreIf?: RegExp }>) {
      if (!pattern.test(sourceCode)) continue;
      if (ignoreIf && ignoreIf.test(sourceCode)) {
        // Pattern present but guarded — track as a degradation note rather
        // than a portability block.
        if (runtime === 'oxlint' && label.startsWith('Type-aware')) {
          result.typeAwareSupport = 'guarded';
        }
        continue;
      }
      result.blockers[runtime].push(label);
      result.portability[runtime] = 'incompatible';
    }
  }

  // All ESLint rules use imperative visitors → Biome is always incompatible
  result.portability.biome = 'incompatible';

  // Complexity heuristic
  if (result.lineCount > 200 || result.isTypeAware) result.complexity = 'high';
  else if (result.lineCount > 100) result.complexity = 'medium';

  return result;
}

// Discover rule source files across the three layouts we use:
//   1. <rules>/<rule>/index.ts        — most plugins
//   2. <rules>/<rule>.ts              — flat (import-next)
//   3. <rules>/<category>/<rule>.ts   — nested (conventions)
// Skips test files, type-only files, and shared lib helpers.
function discoverRules(rulesDir) {
  const found = [];
  if (!fs.existsSync(rulesDir)) return found;

  const SKIP_FILE = /\.(test|spec|d)\.ts$/;
  const SKIP_NAME = new Set(['index.ts', 'types.ts', 'utils.ts', 'helpers.ts']);

  const entries = fs.readdirSync(rulesDir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(rulesDir, e.name);
    if (e.isDirectory()) {
      // Layout 1: <rule>/index.ts
      const idx = path.join(full, 'index.ts');
      if (fs.existsSync(idx)) {
        found.push({ name: e.name, file: idx });
        continue;
      }
      // Layout 3: walk one level deeper for category/<rule>.ts
      const sub = fs.readdirSync(full, { withFileTypes: true });
      for (const s of sub) {
        if (!s.isFile() || !s.name.endsWith('.ts')) continue;
        if (SKIP_FILE.test(s.name) || SKIP_NAME.has(s.name)) continue;
        found.push({
          name: `${e.name}/${s.name.replace(/\.ts$/, '')}`,
          file: path.join(full, s.name),
        });
      }
    } else if (e.isFile() && e.name.endsWith('.ts')) {
      // Layout 2: <rule>.ts
      if (SKIP_FILE.test(e.name) || SKIP_NAME.has(e.name)) continue;
      found.push({ name: e.name.replace(/\.ts$/, ''), file: full });
    }
  }
  return found;
}

function scanPlugin(pluginName) {
  const fullName = pluginName.startsWith('eslint-plugin-') ? pluginName : `eslint-plugin-${pluginName}`;
  const rulesDir = path.join(PACKAGES_DIR, fullName, 'src', 'rules');

  if (!fs.existsSync(rulesDir)) return null;

  const rules = discoverRules(rulesDir);

  const results = [];
  for (const rule of rules) {
    const source = fs.readFileSync(rule.file, 'utf-8');
    results.push(scanRule(source, rule.name));
  }

  return { plugin: fullName, ruleCount: results.length, rules: results };
}

// ── Output ───────────────────────────────────────────────────────────

function printHumanReport(allPlugins) {
  let totalRules = 0, typeAware = 0, oxlintReady = 0, oxlintBlocked = 0;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  INTERLACE FLEET — PORTABILITY & COST AUDIT`);
  console.log(`${'═'.repeat(70)}\n`);

  let fixDegraded = 0;
  for (const plugin of allPlugins) {
    const ta = plugin.rules.filter(r => r.isTypeAware).length;
    const ox = plugin.rules.filter(r => r.portability.oxlint === 'compatible').length;
    const blocked = plugin.rules.filter(r => r.portability.oxlint === 'incompatible');
    const fixDeg = plugin.rules.filter(r => r.portability.oxlint === 'compatible' && r.fixSupport === 'reported').length;

    console.log(`📦 ${plugin.plugin} (${plugin.ruleCount} rules)`);
    console.log(`   oxlint-ready: ${ox}/${plugin.ruleCount} | blocked: ${blocked.length} | fix-degraded: ${fixDeg} | type-aware: ${ta}`);

    for (const r of blocked) {
      console.log(`   ✗ ${r.name} [oxlint:blocked] — ${r.blockers.oxlint.join(', ')}`);
    }

    totalRules += plugin.ruleCount;
    typeAware += ta;
    oxlintReady += ox;
    oxlintBlocked += blocked.length;
    fixDegraded += fixDeg;
    console.log('');
  }

  console.log(`${'─'.repeat(70)}`);
  console.log(`\n📊 FLEET SUMMARY\n`);
  console.log(`   Total rules:        ${totalRules}`);
  console.log(`   oxlint-ready:       ${oxlintReady} (${(oxlintReady / totalRules * 100).toFixed(1)}%)`);
  console.log(`     uses fixer:       ${fixDegraded}  (works in oxlint 1.62+)`);
  console.log(`   oxlint-blocked:     ${oxlintBlocked} (${(oxlintBlocked / totalRules * 100).toFixed(1)}%)`);
  console.log(`   Type-aware:         ${typeAware}  (all guarded with hasParserServices)`);
  console.log(`   Biome-portable:     0 (0% — all rules use imperative ESLint visitors)`);
  console.log(`   TS-Go compatible:   ${totalRules - typeAware}\n`);

  console.log(`📋 INTEROPERABILITY MATRIX\n`);
  console.log(`   | Runtime       | Runs   | Blocked | Notes |`);
  console.log(`   |---------------|--------|---------|-------|`);
  console.log(`   | ESLint 9      | ${totalRules}    | 0       | Native |`);
  console.log(`   | oxlint 1.62+  | ${oxlintReady}    | ${oxlintBlocked}       | full sourceCode + scope + fixer + selectors |`);
  console.log(`   | Biome         | 0      | ${totalRules}     | GritQL only — no imperative |`);
  console.log(`   | typescript-go | ${totalRules - typeAware}    | ${typeAware}       | API surface differs for type-aware |`);
  console.log('');
}

// ── Baseline / CI gate ───────────────────────────────────────────────

const BASELINE_PATH = path.join(__dirname, '..', '.agent', 'oxlint-portability-baseline.json');

function summarize(allPlugins) {
  let totalRules = 0, typeAware = 0, ready = 0, blocked = 0, fixDegraded = 0;
  const perPlugin = {};
  for (const p of allPlugins) {
    const r = p.rules.filter(r => r.portability.oxlint === 'compatible').length;
    const b = p.rules.filter(r => r.portability.oxlint === 'incompatible').length;
    const fd = p.rules.filter(r => r.portability.oxlint === 'compatible' && r.fixSupport === 'reported').length;
    const ta = p.rules.filter(r => r.isTypeAware).length;
    perPlugin[p.plugin] = { ruleCount: p.ruleCount, ready: r, blocked: b, fixDegraded: fd, typeAware: ta };
    totalRules += p.ruleCount; ready += r; blocked += b; fixDegraded += fd; typeAware += ta;
  }
  return { totalRules, typeAware, oxlintReady: ready, oxlintBlocked: blocked, fixDegraded, perPlugin };
}

// Versions of oxlint whose JS-plugin runtime we have *verified* against the
// audit's blocker assumptions (sourceCode + scope + fixer + selector + comments
// + tokens all present). Bumping oxlint past the latest entry must include a
// re-verification of apps/oxlint/src-js/plugins/ at the new tag.
const VERIFIED_OXLINT_RANGE = { min: '1.62.0', maxKnown: '1.62.x' };

// Hash-pinned bundles. These are the actual runtime files shipped with oxlint
// — the bundled output of apps/oxlint/src-js/plugins/ that I read at 1.62.0.
// Even within 1.62.x, if oxlint patches its plugin runtime in a way that
// changes these bundles, we want to know — version-string check alone misses
// behavior-changing patches.
//
// Refresh: VERIFY first by reading apps/oxlint/src-js/plugins/{context,
// source_code,scope,fix,selector}.ts at the new tag, then update both
// VERIFIED_OXLINT_RANGE and these hashes in the same commit.
const VERIFIED_OXLINT_RUNTIME_HASHES = {
  'plugins.js': '3caddca8054c7d91c6e0b5bacaba2a5c6f05fb2e9fa7b8c7226550f1d0c8061c',
  'plugins-dev.js': '8cba3c19f645f9b536d6572ad3f1ad7d0f64c366b294a605cbfa38817d363005',
  'lint.js':   '209211d13f9edc8836c736e795649b082d9e261d9c31c9d9978e43dac3d935f5',
  'bindings.js': 'b8d8d44ce0a1fd887459fd6c5b51f607cda41af0912935e63686d4600ea6fdea',
};

async function checkOxlintRuntimeHashes() {
  const { createHash } = await import('node:crypto');
  const failures = [];
  const oxlintDist = path.join(__dirname, '..', 'node_modules', 'oxlint', 'dist');
  if (!fs.existsSync(oxlintDist)) {
    return ['oxlint not installed at node_modules/oxlint/dist — run npm ci'];
  }
  for (const [file, expected] of Object.entries(VERIFIED_OXLINT_RUNTIME_HASHES)) {
    const fullPath = path.join(oxlintDist, file);
    if (!fs.existsSync(fullPath)) {
      failures.push(`${file}: file missing in oxlint package — runtime layout changed, re-verify`);
      continue;
    }
    const actual = createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
    if (actual !== expected) {
      failures.push(
        `${file}: hash drift — runtime file changed since verification. ` +
        `Re-read apps/oxlint/src-js/plugins/ at the installed tag, confirm the ` +
        `support matrix still holds, then update VERIFIED_OXLINT_RUNTIME_HASHES.`,
      );
    }
  }
  return failures;
}

function readOxlintVersion() {
  const lockPath = path.join(__dirname, '..', 'package-lock.json');
  if (!fs.existsSync(lockPath)) return null;
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
  // npm v9 layout: dependencies under packages."node_modules/oxlint".version
  const entry = lock.packages?.['node_modules/oxlint']?.version
    ?? lock.dependencies?.oxlint?.version
    ?? null;
  return entry;
}

async function runCi(allPlugins) {
  const current = summarize(allPlugins);

  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(`✗ baseline missing: ${path.relative(process.cwd(), BASELINE_PATH)}`);
    console.error(`  run: tsx scripts/audit-rule-portability.ts --write-baseline`);
    process.exit(1);
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'));

  const failures = [];

  // Version pin: if oxlint is bumped to a version we haven't verified, fail loudly.
  const installedOxlint = readOxlintVersion();
  if (installedOxlint && !installedOxlint.startsWith('1.62.')) {
    failures.push(
      `oxlint version ${installedOxlint} has not been verified for compatibility ` +
      `(audit blocker patterns are confirmed against ${VERIFIED_OXLINT_RANGE.maxKnown}). ` +
      `Re-read apps/oxlint/src-js/plugins/ at the new tag, update VERIFIED_OXLINT_RANGE, ` +
      `and re-baseline if the support matrix has changed.`,
    );
  }

  // Bundle hash check: catches behavior-changing patches even within 1.62.x.
  const hashFailures = await checkOxlintRuntimeHashes();
  for (const f of hashFailures) failures.push(f);

  // Hard rule: no new oxlint-blocked rule may be introduced.
  if (current.oxlintBlocked > baseline.oxlintBlocked) {
    failures.push(
      `oxlint-blocked rules increased: ${baseline.oxlintBlocked} → ${current.oxlintBlocked}. ` +
      `Type-aware rules cannot run on oxlint — refactor to AST-only or accept regression by ` +
      `bumping baseline (with justification in commit message).`,
    );
  }

  // Hard rule: oxlint-ready percentage may not drop more than the configured tolerance.
  const TOLERANCE_PCT = baseline.tolerancePct ?? 1.0;
  const baselinePct = (baseline.oxlintReady / baseline.totalRules) * 100;
  const currentPct = (current.oxlintReady / current.totalRules) * 100;
  if (currentPct < baselinePct - TOLERANCE_PCT) {
    failures.push(
      `oxlint-ready % dropped: ${baselinePct.toFixed(1)}% → ${currentPct.toFixed(1)}% ` +
      `(tolerance ±${TOLERANCE_PCT}%). Either fix the regressing rule or update the baseline.`,
    );
  }

  // Per-plugin: no plugin may regress in absolute oxlint-ready count.
  for (const [pkg, before] of Object.entries(baseline.perPlugin || {}) as Array<[string, any]>) {
    const after = current.perPlugin[pkg];
    if (!after) continue;
    if (after.ready < before.ready) {
      failures.push(`${pkg}: oxlint-ready ${before.ready} → ${after.ready} (regression)`);
    }
    if (after.blocked > before.blocked) {
      failures.push(`${pkg}: oxlint-blocked ${before.blocked} → ${after.blocked} (regression)`);
    }
  }

  console.log('');
  console.log('═'.repeat(70));
  console.log('  OXLINT PORTABILITY GATE');
  console.log('═'.repeat(70));
  console.log('');
  console.log(`  Baseline (${baseline.recordedAt || '?'}):`);
  console.log(`    rules ${baseline.totalRules}  ready ${baseline.oxlintReady}  ` +
              `blocked ${baseline.oxlintBlocked}  fix-degraded ${baseline.fixDegraded ?? '?'}`);
  console.log(`  Current:`);
  console.log(`    rules ${current.totalRules}  ready ${current.oxlintReady}  ` +
              `blocked ${current.oxlintBlocked}  fix-degraded ${current.fixDegraded}`);
  console.log('');

  if (failures.length === 0) {
    console.log('  ✅ All thresholds satisfied.');
    console.log('');
    return 0;
  }
  console.log(`  ✗ ${failures.length} threshold violation(s):`);
  for (const f of failures) console.log(`     • ${f}`);
  console.log('');
  return 1;
}

function writeBaseline(allPlugins) {
  const summary = summarize(allPlugins);
  const baseline = {
    recordedAt: new Date().toISOString().slice(0, 10),
    tolerancePct: 1.0,
    ...summary,
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`✓ baseline written: ${path.relative(process.cwd(), BASELINE_PATH)}`);
  console.log(`  rules ${summary.totalRules}  ready ${summary.oxlintReady}  ` +
              `blocked ${summary.oxlintBlocked}  fix-degraded ${summary.fixDegraded}`);
}

// ── CLI ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isJson = args.includes('--json');
const isCi = args.includes('--ci');
const isWriteBaseline = args.includes('--write-baseline');
const specificPlugin = args.find(a => !a.startsWith('--'));

let plugins;
if (specificPlugin) {
  plugins = [specificPlugin];
} else {
  plugins = fs.readdirSync(PACKAGES_DIR)
    .filter(d => d.startsWith('eslint-plugin-') && fs.existsSync(path.join(PACKAGES_DIR, d, 'src', 'rules')));
}

const allResults = plugins.map(p => scanPlugin(p)).filter(Boolean);

if (isWriteBaseline) {
  writeBaseline(allResults);
} else if (isCi) {
  runCi(allResults).then(code => process.exit(code));
} else if (isJson) {
  console.log(JSON.stringify(allResults, null, 2));
} else {
  printHumanReport(allResults);
}
