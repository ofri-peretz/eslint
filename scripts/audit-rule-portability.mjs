#!/usr/bin/env node

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
 *   node scripts/audit-rule-portability.mjs                    # full fleet
 *   node scripts/audit-rule-portability.mjs secure-coding      # single plugin
 *   node scripts/audit-rule-portability.mjs --json             # machine-readable
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

const PORTABILITY_BLOCKERS = {
  oxlint: [
    { pattern: /context\.sourceCode\.getScope/,  label: 'Scope analysis (not in oxlint)' },
    { pattern: /context\.sourceCode\.getDeclaredVariables/, label: 'Variable tracking' },
    { pattern: /getParserServices|getTypeChecker/, label: 'Type-aware (requires TS)' },
    { pattern: /RuleFixer|fixer\./,              label: 'Auto-fix (partial in oxlint)' },
  ],
  biome: [
    { pattern: /CallExpression|MemberExpression|Property|Identifier/, label: 'Imperative AST visitor (Biome uses GritQL)' },
  ],
  typescriptGo: [
    // typescript-go should support everything TS does, different API though
    { pattern: /esTreeNodeToTSNodeMap/, label: 'ESTree↔TS node map (API differs)' },
  ],
};

// ── Scanner ──────────────────────────────────────────────────────────

function scanRule(sourceCode, ruleName) {
  const result = {
    name: ruleName,
    isTypeAware: false,
    typeAwareAPIs: [],
    eslintAPIs: [],
    hasAutoFix: false,
    hasSuggestions: false,
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

  // Portability blockers
  for (const [runtime, patterns] of Object.entries(PORTABILITY_BLOCKERS)) {
    for (const { pattern, label } of patterns) {
      if (pattern.test(sourceCode)) {
        result.blockers[runtime].push(label);
        result.portability[runtime] = result.blockers[runtime].length > 1 ? 'incompatible' : 'partial';
      }
    }
  }

  // All ESLint rules use imperative visitors → Biome is always incompatible
  result.portability.biome = 'incompatible';

  // Complexity heuristic
  if (result.lineCount > 200 || result.isTypeAware) result.complexity = 'high';
  else if (result.lineCount > 100) result.complexity = 'medium';

  return result;
}

function scanPlugin(pluginName) {
  const fullName = pluginName.startsWith('eslint-plugin-') ? pluginName : `eslint-plugin-${pluginName}`;
  const rulesDir = path.join(PACKAGES_DIR, fullName, 'src', 'rules');

  if (!fs.existsSync(rulesDir)) return null;

  const rules = fs.readdirSync(rulesDir).filter(f => {
    return fs.existsSync(path.join(rulesDir, f, 'index.ts'));
  });

  const results = [];
  for (const rule of rules) {
    const source = fs.readFileSync(path.join(rulesDir, rule, 'index.ts'), 'utf-8');
    results.push(scanRule(source, rule));
  }

  return { plugin: fullName, ruleCount: results.length, rules: results };
}

// ── Output ───────────────────────────────────────────────────────────

function printHumanReport(allPlugins) {
  let totalRules = 0, typeAware = 0, oxlintReady = 0, biomeReady = 0;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  INTERLACE FLEET — PORTABILITY & COST AUDIT`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const plugin of allPlugins) {
    const ta = plugin.rules.filter(r => r.isTypeAware).length;
    const ox = plugin.rules.filter(r => r.portability.oxlint === 'compatible').length;

    console.log(`📦 ${plugin.plugin} (${plugin.ruleCount} rules)`);
    console.log(`   Type-aware: ${ta}/${plugin.ruleCount} | oxlint-ready: ${ox}/${plugin.ruleCount} | Biome: 0/${plugin.ruleCount} (imperative)`);

    if (ta > 0) {
      const taRules = plugin.rules.filter(r => r.isTypeAware);
      for (const r of taRules) {
        console.log(`   ⚡ ${r.name} [TYPE-AWARE] — ${r.typeAwareAPIs.join(', ')}`);
      }
    }

    const partial = plugin.rules.filter(r => r.portability.oxlint === 'partial');
    if (partial.length > 0) {
      for (const r of partial) {
        console.log(`   🟡 ${r.name} [oxlint:partial] — ${r.blockers.oxlint.join(', ')}`);
      }
    }

    totalRules += plugin.ruleCount;
    typeAware += ta;
    oxlintReady += ox;
    console.log('');
  }

  console.log(`${'─'.repeat(70)}`);
  console.log(`\n📊 FLEET SUMMARY\n`);
  console.log(`   Total rules:     ${totalRules}`);
  console.log(`   AST-only (fast): ${totalRules - typeAware} (${((totalRules - typeAware) / totalRules * 100).toFixed(1)}%)`);
  console.log(`   Type-aware ($$): ${typeAware} (${(typeAware / totalRules * 100).toFixed(1)}%)`);
  console.log(`   oxlint-ready:    ${oxlintReady} (${(oxlintReady / totalRules * 100).toFixed(1)}%)`);
  console.log(`   Biome-portable:  0 (0% — all rules use imperative ESLint visitors)`);
  console.log(`   TS-Go compatible:${totalRules - typeAware} (same as AST-only)\n`);

  console.log(`📋 INTEROPERABILITY MATRIX\n`);
  console.log(`   | Runtime       | Compatible | Partial | Blocked | Notes |`);
  console.log(`   |---------------|------------|---------|---------|-------|`);
  console.log(`   | ESLint 9      | ${totalRules}        | 0       | 0       | Native |`);
  console.log(`   | oxlint        | ${oxlintReady}        | ${totalRules - oxlintReady - typeAware}       | ${typeAware}       | Plugin API in development |`);
  console.log(`   | Biome         | 0          | 0       | ${totalRules}     | GritQL only — no imperative |`);
  console.log(`   | typescript-go | ${totalRules - typeAware}        | ${typeAware}       | 0       | API surface differs for type-aware |`);
  console.log('');
}

// ── CLI ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isJson = args.includes('--json');
const specificPlugin = args.find(a => !a.startsWith('--'));

let plugins;
if (specificPlugin) {
  plugins = [specificPlugin];
} else {
  plugins = fs.readdirSync(PACKAGES_DIR)
    .filter(d => d.startsWith('eslint-plugin-') && fs.existsSync(path.join(PACKAGES_DIR, d, 'src', 'rules')));
}

const allResults = plugins.map(p => scanPlugin(p)).filter(Boolean);

if (isJson) {
  console.log(JSON.stringify(allResults, null, 2));
} else {
  printHumanReport(allResults);
}
