#!/usr/bin/env -S npx tsx

/**
 * Rule Auditor — Deterministic FP/FN Technical Audit
 *
 * Analyzes ANY ESLint rule and produces a structured audit report with:
 *
 * 1. GUARD ANALYSIS: Every early-return/bail-out in the rule → if untested = FP risk
 * 2. DETECTION ANALYSIS: Every context.report() call → if untested = FN risk
 * 3. PATTERN COVERAGE: What AST node types the rule visits vs what tests exercise
 * 4. META COMPLIANCE: hasSuggestions, formatLLMMessage, CWE, schema
 * 5. TEST DEPTH SCORE: valid/invalid counts, edge case categories
 *
 * Usage:
 *   node scripts/audit-rule.mjs pg/no-unsafe-query              # single rule
 *   node scripts/audit-rule.mjs secure-coding --all             # entire plugin
 *   node scripts/audit-rule.mjs pg/no-unsafe-query --json       # JSON output
 *   node scripts/audit-rule.mjs --fleet                         # all security plugins
 *   node scripts/audit-rule.mjs --fleet --ci --threshold 80     # CI gate
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const allMode = args.includes('--all');
const fleetMode = args.includes('--fleet');
const ciMode = args.includes('--ci');
const threshold = args.includes('--threshold')
  ? parseInt(args[args.indexOf('--threshold') + 1])
  : 80;

const SECURITY_PLUGINS = [
  'browser-security', 'crypto', 'express-security', 'jwt',
  'lambda-security', 'mongodb-security', 'nestjs-security',
  'node-security', 'pg', 'secure-coding', 'vercel-ai-security',
];

// ── Static Analysis Engine ───────────────────────────────────────────

function auditRule(pluginName: string, ruleName: string): any {
  const ruleDir = path.join(ROOT, 'packages', `eslint-plugin-${pluginName}`, 'src', 'rules', ruleName);
  const ruleFile = path.join(ruleDir, 'index.ts');
  const testFileCandidates = [
    path.join(ruleDir, `${ruleName}.test.ts`),
    path.join(ruleDir, 'index.spec.ts'),
    path.join(ruleDir, 'index.test.ts'),
  ];

  if (!fs.existsSync(ruleFile)) {
    return { rule: `${pluginName}/${ruleName}`, error: 'Rule file not found' };
  }

  const source = fs.readFileSync(ruleFile, 'utf-8');
  const lines = source.split('\n');

  // Merge ALL test files — rules may have both .test.ts (scaffold) and .spec.ts (comprehensive)
  const existingTestFiles = testFileCandidates.filter(f => fs.existsSync(f));
  const testSource = existingTestFiles.map(f => fs.readFileSync(f, 'utf-8')).join('\n');

  const result = {
    rule: `${pluginName}/${ruleName}`,
    file: ruleFile,
    testFiles: existingTestFiles,
    lines: lines.length,
    score: 100,
    violations: [],
    warnings: [],
    info: [],
  };

  // ─── 1. META COMPLIANCE ───────────────────────────────────────────
  const meta = analyzeMeta(source, result);

  // ─── 2. GUARD ANALYSIS (FP risk) ─────────────────────────────────
  analyzeGuards(lines, testSource, result);

  // ─── 3. DETECTION ANALYSIS (FN risk) ─────────────────────────────
  analyzeDetections(lines, testSource, result);

  // ─── 4. AST VISITOR COVERAGE ──────────────────────────────────────
  analyzeVisitors(source, testSource, result);

  // ─── 5. TEST DEPTH ────────────────────────────────────────────────
  analyzeTestDepth(testSource, result);

  // ─── 6. EDGE CASE CATEGORIES ──────────────────────────────────────
  analyzeEdgeCases(testSource, result);

  // Calculate final score
  result.score = Math.max(0, result.score);

  return result;
}

function analyzeMeta(source, result) {
  // hasSuggestions
  if (!source.includes('hasSuggestions')) {
    result.violations.push({
      id: 'META_NO_SUGGESTIONS',
      severity: 'ERROR',
      message: 'Missing hasSuggestions: true — rule provides no IDE remediation guidance',
      fix: 'Add hasSuggestions: true to meta and a suggestion messageId',
    });
    result.score -= 10;
  }

  // formatLLMMessage
  if (!source.includes('formatLLMMessage')) {
    result.violations.push({
      id: 'META_NO_LLM_MESSAGE',
      severity: 'ERROR',
      message: 'Not using formatLLMMessage — messages are not LLM-optimized',
      fix: 'Wrap message strings with formatLLMMessage({ icon, issueName, cwe, ... })',
    });
    result.score -= 10;
  }

  // CWE
  if (!source.match(/CWE-\d+/i)) {
    result.warnings.push({
      id: 'META_NO_CWE',
      severity: 'WARN',
      message: 'No CWE identifier in rule — not mapped to industry standard',
      fix: 'Add cwe field to formatLLMMessage (e.g., cwe: "CWE-89")',
    });
    result.score -= 5;
  }

  // Schema
  if (source.includes('schema: []') || !source.includes('schema:')) {
    result.info.push({
      id: 'META_EMPTY_SCHEMA',
      severity: 'INFO',
      message: 'Rule has no configuration options',
    });
  }

  // docs.url
  if (!source.includes('url:') || !source.match(/url:\s*['"]/)) {
    result.warnings.push({
      id: 'META_NO_DOC_URL',
      severity: 'WARN',
      message: 'No documentation URL in rule meta',
      fix: 'Add url field to docs pointing to the rule documentation',
    });
    result.score -= 3;
  }

  return {};
}

function analyzeGuards(lines, testSource, result) {
  const guards = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Early returns that bail out of detection
    if (line.match(/^\s*(if\s*\(|return\s*;|return\s*\{|continue\s*;)/) && isInsideCreate(lines, i)) {
      // Check if it's a guard (return/continue after condition check)
      const context = lines.slice(Math.max(0, i - 2), i + 3).join('\n');

      if (context.includes('return') && !context.includes('context.report')) {
        guards.push({
          line: lineNum,
          code: line.substring(0, 80),
          type: 'GUARD',
        });
      }
    }
  }

  // Check if guards are tested with "safe" (valid) test cases
  const validCases = countTestCases(testSource, 'valid');

  if (guards.length > 0 && validCases < guards.length) {
    result.warnings.push({
      id: 'GUARD_UNDER_TESTED',
      severity: 'WARN',
      message: `${guards.length} guard conditions but only ${validCases} valid test cases — some safe patterns may not be recognized (FP risk)`,
      fix: `Add valid test cases that exercise each guard. ${guards.length - validCases} guards may be untested.`,
      details: guards.slice(0, 5).map(g => `L${g.line}: ${g.code}`),
    });
    result.score -= Math.min(15, (guards.length - validCases) * 3);
  }

  result.info.push({
    id: 'GUARD_COUNT',
    severity: 'INFO',
    message: `${guards.length} guard conditions found in rule logic`,
  });
}

function analyzeDetections(lines, testSource, result) {
  const detections = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    if (line.includes('context.report') || line.includes('report({') || line.includes("report(node")) {
      // Find the messageId
      const ctx = lines.slice(i, Math.min(lines.length, i + 5)).join('\n');
      const msgMatch = ctx.match(/messageId:\s*['"]([^'"]+)['"]/);

      detections.push({
        line: lineNum,
        messageId: msgMatch ? msgMatch[1] : 'unknown',
        code: line.substring(0, 80),
      });
    }
  }

  // Check if each messageId appears in invalid test cases
  const invalidCases = countTestCases(testSource, 'invalid');

  for (const det of detections) {
    if (det.messageId !== 'unknown' && !testSource.includes(det.messageId)) {
      result.violations.push({
        id: 'DETECTION_UNTESTED',
        severity: 'ERROR',
        message: `Detection at L${det.line} uses messageId '${det.messageId}' but it never appears in tests — this detection path may be dead code (FN risk)`,
        fix: `Add an invalid test case that triggers messageId '${det.messageId}'`,
      });
      result.score -= 10;
    }
  }

  if (detections.length > 0 && invalidCases < detections.length) {
    result.warnings.push({
      id: 'DETECTION_UNDER_TESTED',
      severity: 'WARN',
      message: `${detections.length} detection paths but only ${invalidCases} invalid test cases — some vulnerable patterns may not be verified`,
      fix: `Add invalid test cases. Target: at least 1 per detection path.`,
    });
    result.score -= Math.min(10, (detections.length - invalidCases) * 2);
  }

  result.info.push({
    id: 'DETECTION_COUNT',
    severity: 'INFO',
    message: `${detections.length} detection points (context.report calls)`,
  });
}

function analyzeVisitors(source, testSource, result) {
  // Extract AST node types the rule visits
  const visitorPattern = /^\s+(\w+)\s*\(/gm;
  const createMatch = source.match(/create\s*\([^)]*\)\s*\{[\s\S]*?return\s*\{([\s\S]*?)\};/);

  if (!createMatch) {
    result.info.push({
      id: 'VISITOR_PARSE_FAIL',
      severity: 'INFO',
      message: 'Could not parse visitor map — rule may use non-standard structure',
    });
    return;
  }

  const visitorBlock = createMatch[1];
  const visitors = [];
  const nodeTypeRegex = /^\s+['"]?(\w+)['"]?\s*[:(]/gm;
  let match;
  while ((match = nodeTypeRegex.exec(visitorBlock)) !== null) {
    const name = match[1];
    // Filter out helper functions — real AST visitors are PascalCase or 'Program:exit' style
    if (name[0] === name[0].toUpperCase() || name.includes(':')) {
      visitors.push(name);
    }
  }

  result.info.push({
    id: 'VISITORS',
    severity: 'INFO',
    message: `AST visitors: ${visitors.join(', ') || 'none detected'}`,
  });
}

function analyzeTestDepth(testSource, result) {
  if (!testSource) {
    result.violations.push({
      id: 'NO_TEST_FILE',
      severity: 'ERROR',
      message: 'No test file found — rule has zero test coverage',
      fix: 'Run: node scripts/generate-rule-tests.mjs <plugin> <rule>',
    });
    result.score -= 30;
    return;
  }

  const validCount = countTestCases(testSource, 'valid');
  const invalidCount = countTestCases(testSource, 'invalid');
  const totalCases = validCount + invalidCount;

  if (validCount < 5) {
    result.warnings.push({
      id: 'TEST_FEW_VALID',
      severity: 'WARN',
      message: `Only ${validCount} valid test cases (target: ≥5) — insufficient safe-pattern coverage (FP risk)`,
      fix: 'Add valid cases for aliased imports, destructured APIs, static values, TypeScript generics',
    });
    result.score -= (5 - validCount) * 2;
  }

  if (invalidCount < 5) {
    result.warnings.push({
      id: 'TEST_FEW_INVALID',
      severity: 'WARN',
      message: `Only ${invalidCount} invalid test cases (target: ≥5) — insufficient vulnerability coverage (FN risk)`,
      fix: 'Add invalid cases for string concat, template literals, variable indirection, async wrappers',
    });
    result.score -= (5 - invalidCount) * 2;
  }

  if (totalCases < 8) {
    result.violations.push({
      id: 'TEST_SHALLOW',
      severity: 'ERROR',
      message: `Only ${totalCases} total test cases — critically shallow (target: ≥8)`,
      fix: 'Add at minimum 5 valid + 5 invalid cases',
    });
    result.score -= 10;
  }

  result.info.push({
    id: 'TEST_CASES',
    severity: 'INFO',
    message: `${validCount} valid + ${invalidCount} invalid = ${totalCases} total test cases`,
  });
}

function analyzeEdgeCases(testSource, result) {
  if (!testSource) return;

  const EDGE_CATEGORIES = [
    { name: 'Aliased imports', patterns: ['require(', 'as ', 'import {'], risk: 'FN', id: 'EDGE_ALIAS' },
    { name: 'Destructured APIs', patterns: ['const {', 'const ['], risk: 'FN', id: 'EDGE_DESTRUCTURE' },
    { name: 'Variable indirection', patterns: ['const cmd =', 'const query =', 'const url =', 'let '], risk: 'FN', id: 'EDGE_INDIRECTION' },
    { name: 'Template literals', patterns: ['`${', '\\`\\${'], risk: 'FN', id: 'EDGE_TEMPLATE' },
    { name: 'Async/await', patterns: ['async ', 'await '], risk: 'FN', id: 'EDGE_ASYNC' },
    { name: 'TypeScript generics', patterns: ['<T>', '<User>', '<any>'], risk: 'FP', id: 'EDGE_GENERICS' },
    { name: 'Nullish/optional', patterns: ['?.', '??', 'undefined', 'null'], risk: 'FP', id: 'EDGE_NULLISH' },
    { name: 'Empty arguments', patterns: ['()', 'args.length === 0', '.length === 0'], risk: 'FP', id: 'EDGE_EMPTY' },
  ];

  const missing = [];

  for (const cat of EDGE_CATEGORIES) {
    const found = cat.patterns.some(p => testSource.includes(p));
    if (!found) {
      missing.push(cat);
    }
  }

  if (missing.length > 4) {
    result.warnings.push({
      id: 'EDGE_MISSING',
      severity: 'WARN',
      message: `${missing.length}/8 edge case categories not tested: ${missing.map(m => m.name).join(', ')}`,
      fix: `Add test cases for: ${missing.filter(m => m.risk === 'FN').map(m => m.name).join(', ')} (FN risk) and ${missing.filter(m => m.risk === 'FP').map(m => m.name).join(', ')} (FP risk)`,
    });
    result.score -= missing.length;
  }

  result.info.push({
    id: 'EDGE_COVERAGE',
    severity: 'INFO',
    message: `${8 - missing.length}/8 edge case categories present in tests`,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────

function isInsideCreate(lines, lineIdx) {
  // Simple heuristic: check if we're after 'create(' and before the last '}'
  const before = lines.slice(0, lineIdx).join('\n');
  return before.includes('create(');
}

function countTestCases(testSource, type) {
  if (!testSource) return 0;

  if (type === 'invalid') {
    // Every invalid test case MUST have an errors: array — count those
    return (testSource.match(/errors\s*:\s*\[/g) || []).length;
  }

  if (type === 'valid') {
    // Total code entries minus invalid ones = valid code entries
    const totalCodeEntries = (testSource.match(/code\s*:/g) || []).length;
    const invalidCount = countTestCases(testSource, 'invalid');
    const validCodeEntries = Math.max(0, totalCodeEntries - invalidCount);
    // Also count bare string entries (standalone valid test cases without { code: })
    const bareStrings = (testSource.match(/^\s*'.+'\s*,?\s*$/gm) || []).length;
    return validCodeEntries + bareStrings;
  }

  return 0;
}

// ── CLI Router ───────────────────────────────────────────────────────

function getRulesToAudit() {
  const rules = [];

  if (fleetMode) {
    for (const plugin of SECURITY_PLUGINS) {
      const rulesDir = path.join(ROOT, 'packages', `eslint-plugin-${plugin}`, 'src', 'rules');
      if (!fs.existsSync(rulesDir)) continue;
      for (const dir of fs.readdirSync(rulesDir)) {
        if (fs.existsSync(path.join(rulesDir, dir, 'index.ts'))) {
          rules.push({ plugin, rule: dir });
        }
      }
    }
    return rules;
  }

  const target = args.find(a => !a.startsWith('--'));
  if (!target) {
    console.error('Usage: node scripts/audit-rule.mjs <plugin>/<rule> | <plugin> --all | --fleet');
    process.exit(1);
  }

  if (target.includes('/')) {
    const [plugin, rule] = target.split('/');
    return [{ plugin, rule }];
  }

  if (allMode) {
    const rulesDir = path.join(ROOT, 'packages', `eslint-plugin-${target}`, 'src', 'rules');
    if (!fs.existsSync(rulesDir)) { console.error(`Plugin not found: ${target}`); process.exit(1); }
    for (const dir of fs.readdirSync(rulesDir)) {
      if (fs.existsSync(path.join(rulesDir, dir, 'index.ts'))) {
        rules.push({ plugin: target, rule: dir });
      }
    }
    return rules;
  }

  return [{ plugin: target, rule: target }];
}

// ── Main ─────────────────────────────────────────────────────────────

const rulesToAudit = getRulesToAudit();
const allResults = [];

if (!jsonOutput) {
  console.log(`\n🔍 Rule Auditor — ${rulesToAudit.length} rules\n`);
}

for (const { plugin, rule } of rulesToAudit) {
  const result = auditRule(plugin, rule);
  allResults.push(result);

  if (!jsonOutput && !fleetMode) {
    // Detailed output for single/plugin mode
    const icon = result.score >= 90 ? '✅' : result.score >= 70 ? '🟡' : '🔴';
    console.log(`${icon} ${result.rule} — Score: ${result.score}/100\n`);

    if (result.violations.length > 0) {
      console.log('  VIOLATIONS (must fix):');
      for (const v of result.violations) {
        console.log(`    ❌ [${v.id}] ${v.message}`);
        if (v.fix) console.log(`       Fix: ${v.fix}`);
        if (v.details) v.details.forEach(d => console.log(`       · ${d}`));
      }
      console.log();
    }

    if (result.warnings.length > 0) {
      console.log('  WARNINGS (should fix):');
      for (const w of result.warnings) {
        console.log(`    ⚠️  [${w.id}] ${w.message}`);
        if (w.fix) console.log(`       Fix: ${w.fix}`);
        if (w.details) w.details.forEach(d => console.log(`       · ${d}`));
      }
      console.log();
    }

    if (result.info.length > 0) {
      console.log('  INFO:');
      for (const i of result.info) {
        console.log(`    ℹ️  ${i.message}`);
      }
      console.log();
    }
  }
}

// Fleet summary
if (!jsonOutput && (fleetMode || allMode)) {
  const byPlugin = {};
  for (const r of allResults) {
    const plugin = r.rule.split('/')[0];
    if (!byPlugin[plugin]) byPlugin[plugin] = { total: 0, passing: 0, violations: 0, warnings: 0, scores: [] };
    byPlugin[plugin].total++;
    byPlugin[plugin].scores.push(r.score);
    byPlugin[plugin].violations += r.violations?.length || 0;
    byPlugin[plugin].warnings += r.warnings?.length || 0;
    if (r.score >= 70) byPlugin[plugin].passing++;
  }

  for (const [plugin, stats] of (Object.entries(byPlugin) as Array<[string, any]>).sort((a, b) => {
    const avgA = a[1].scores.reduce((s: number, v: number) => s + v, 0) / a[1].scores.length;
    const avgB = b[1].scores.reduce((s: number, v: number) => s + v, 0) / b[1].scores.length;
    return avgA - avgB;
  })) {
    const avg = Math.round(stats.scores.reduce((s, v) => s + v, 0) / stats.scores.length);
    const icon = avg >= 90 ? '✅' : avg >= 70 ? '🟡' : '🔴';
    console.log(`  ${icon} ${plugin}: avg=${avg} | ${stats.passing}/${stats.total} passing | ${stats.violations} violations | ${stats.warnings} warnings`);

    // Show worst rules
    const worstRules = allResults
      .filter(r => r.rule.startsWith(plugin + '/'))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .filter(r => r.score < 80);

    for (const wr of worstRules) {
      const ruleName = wr.rule.split('/')[1];
      const topViolation = wr.violations[0];
      console.log(`     └─ ${ruleName}: ${wr.score}/100 ${topViolation ? `— ${topViolation.id}` : ''}`);
    }
  }

  const totalViolations = allResults.reduce((s, r) => s + (r.violations?.length || 0), 0);
  const totalWarnings = allResults.reduce((s, r) => s + (r.warnings?.length || 0), 0);
  const avgScore = Math.round(allResults.reduce((s, r) => s + r.score, 0) / allResults.length);

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  Fleet: ${allResults.length} rules | avg score: ${avgScore}/100`);
  console.log(`  Violations: ${totalViolations} | Warnings: ${totalWarnings}`);
  console.log(`${'─'.repeat(60)}\n`);
}

if (jsonOutput) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    rulesAudited: allResults.length,
    avgScore: Math.round(allResults.reduce((s, r) => s + r.score, 0) / allResults.length),
    totalViolations: allResults.reduce((s, r) => s + (r.violations?.length || 0), 0),
    totalWarnings: allResults.reduce((s, r) => s + (r.warnings?.length || 0), 0),
    results: allResults,
  }, null, 2));
}

if (ciMode) {
  const avgScore = Math.round(allResults.reduce((s, r) => s + r.score, 0) / allResults.length);
  if (avgScore < threshold) {
    console.error(`\n❌ Average audit score ${avgScore} is below threshold ${threshold}`);
    process.exit(1);
  }
}
