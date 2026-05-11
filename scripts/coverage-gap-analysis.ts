#!/usr/bin/env -S npx tsx

/**
 * Branch Coverage → FP/FN Gap Analyzer
 *
 * For each security plugin:
 * 1. Runs vitest with --coverage (v8 provider, json reporter)
 * 2. Parses the coverage JSON to find uncovered branches
 * 3. Maps each uncovered branch to the rule's source code
 * 4. Classifies the gap as potential FP or FN
 * 5. Outputs a structured report
 *
 * Usage:
 *   tsx scripts/coverage-gap-analysis.ts                     # all security plugins
 *   tsx scripts/coverage-gap-analysis.ts --plugin pg         # single plugin
 *   tsx scripts/coverage-gap-analysis.ts --json              # JSON output for CI
 *   tsx scripts/coverage-gap-analysis.ts --ci --threshold 90 # CI gate (exit 1 if below)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SECURITY_PLUGINS = [
  'browser-security', 'crypto', 'express-security', 'jwt',
  'lambda-security', 'mongodb-security', 'nestjs-security',
  'node-security', 'pg', 'secure-coding', 'vercel-ai-security',
];

const args = process.argv.slice(2);
const pluginFilter = args.includes('--plugin') ? args[args.indexOf('--plugin') + 1] : null;
const jsonOutput = args.includes('--json');
const ciMode = args.includes('--ci');
const threshold = args.includes('--threshold') ? parseInt(args[args.indexOf('--threshold') + 1]) : 90;

const plugins = pluginFilter ? [pluginFilter] : SECURITY_PLUGINS;

function runCoverage(pluginName) {
  const pkg = `eslint-plugin-${pluginName}`;
  const coverageDir = `packages/${pkg}/coverage`;
  const configPath = `packages/${pkg}/vitest.config.mts`;

  try {
    // Clean old coverage
    execSync(`rm -rf ${coverageDir}`, { stdio: 'pipe' });

    // Run vitest directly with JSON coverage reporter for deterministic flag handling.
    execSync(
      `npx vitest run --config ${configPath} --coverage --coverage.reporter=json 2>/dev/null`,
      { stdio: 'pipe', cwd: process.cwd(), timeout: 120000 }
    );

    const jsonPath = path.join(coverageDir, 'coverage-final.json');
    if (!fs.existsSync(jsonPath)) return null;

    return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  } catch (e) {
    // Tests may "fail" but still produce coverage
    const jsonPath = path.join(coverageDir, 'coverage-final.json');
    if (fs.existsSync(jsonPath)) {
      return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    }
    return null;
  }
}

function analyzeFile(filePath: string, fileCoverage: any) {
  const source = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf-8').split('\n')
    : [];

  const branchMap = fileCoverage.branchMap || {};
  const branches: Record<string, number[]> = fileCoverage.b || {};
  const statementMap = fileCoverage.statementMap || {};
  const statements = fileCoverage.s || {};

  const uncoveredBranches = [];
  const uncoveredStatements = [];

  // Find uncovered branches
  for (const [branchId, counts] of Object.entries(branches)) {
    const branchInfo = branchMap[branchId];
    if (!branchInfo) continue;

    counts.forEach((count, idx) => {
      if (count === 0) {
        const loc = branchInfo.locations?.[idx] || branchInfo.loc;
        const line = loc?.start?.line;
        const lineContent = line && source[line - 1] ? source[line - 1].trim() : '';

        uncoveredBranches.push({
          branchId,
          branchType: branchInfo.type, // 'if', 'binary-expr', 'cond-expr', 'switch'
          armIndex: idx,
          line,
          lineContent,
          classification: classifyGap(lineContent, branchInfo.type, idx),
        });
      }
    });
  }

  // Find uncovered statements
  for (const [stmtId, count] of Object.entries(statements)) {
    if (count === 0) {
      const loc = statementMap[stmtId]?.start;
      const line = loc?.line;
      const lineContent = line && source[line - 1] ? source[line - 1].trim() : '';

      uncoveredStatements.push({
        stmtId,
        line,
        lineContent,
      });
    }
  }

  return { uncoveredBranches, uncoveredStatements };
}

/**
 * Classify an uncovered branch as potential FP or FN risk.
 *
 * Logic:
 * - If the uncovered arm is the "else" of an early-return guard → potential FN
 *   (the rule never sees this code path, so patterns here are missed)
 * - If the uncovered arm is a "report" path → potential FN
 *   (a detection path that's never exercised)
 * - If the uncovered arm is a "return" / bail-out path → potential FP
 *   (a safe-pattern guard that's never tested — safe code might not be recognized)
 */
function classifyGap(lineContent, branchType, armIndex) {
  const lower = lineContent.toLowerCase();

  // Untested report() call → code thinks it's a detection but we never exercise it
  if (lower.includes('context.report') || lower.includes('report(')) {
    return { type: 'FN_RISK', reason: 'Untested detection path — report() never called' };
  }

  // Untested early return → safe pattern not recognized
  if (lower.includes('return') && !lower.includes('report')) {
    return { type: 'FP_RISK', reason: 'Untested bail-out — safe code may not be recognized' };
  }

  // Untested "else" arm of an if
  if (branchType === 'if' && armIndex === 1) {
    return { type: 'FP_RISK', reason: 'Else-branch untested — safe alternative may be flagged' };
  }

  // Untested conditional in a guard
  if (lower.includes('!==') || lower.includes('!==') || lower.includes('!')) {
    return { type: 'FP_RISK', reason: 'Negation guard untested — may over-match' };
  }

  return { type: 'UNKNOWN', reason: 'Uncovered branch — manual review needed' };
}

// ── Main ──────────────────────────────────────────────────────────────

const results = {};
let totalBranches = 0;
let totalCovered = 0;

if (!jsonOutput) {
  console.log(`\n🔬 Branch Coverage Gap Analysis — ${plugins.length} plugins\n`);
}

for (const plugin of plugins) {
  const coverage = runCoverage(plugin);
  if (!coverage) {
    if (!jsonOutput) console.log(`  ⏭️  ${plugin}: no coverage data`);
    continue;
  }

  const pluginResult = { rules: {}, summary: {} };
  let pluginBranches = 0;
  let pluginCovered = 0;
  let pluginFpRisks = 0;
  let pluginFnRisks = 0;

  for (const [filePath, fileCoverage] of Object.entries(coverage) as Array<[string, any]>) {
    // Only analyze rule files
    if (!filePath.includes('/rules/') || !filePath.endsWith('index.ts')) continue;

    const ruleName = filePath.match(/rules\/([^/]+)\//)?.[1];
    if (!ruleName) continue;

    const { uncoveredBranches, uncoveredStatements } = analyzeFile(filePath, fileCoverage);

    const branchMap = fileCoverage.branchMap || {};
    const branches: Record<string, number[]> = fileCoverage.b || {};
    let ruleTotalBranches = 0;
    let ruleCoveredBranches = 0;

    for (const counts of Object.values(branches)) {
      counts.forEach(c => {
        ruleTotalBranches++;
        if (c > 0) ruleCoveredBranches++;
      });
    }

    pluginBranches += ruleTotalBranches;
    pluginCovered += ruleCoveredBranches;

    const fpRisks = uncoveredBranches.filter(b => b.classification.type === 'FP_RISK');
    const fnRisks = uncoveredBranches.filter(b => b.classification.type === 'FN_RISK');
    pluginFpRisks += fpRisks.length;
    pluginFnRisks += fnRisks.length;

    if (uncoveredBranches.length > 0) {
      pluginResult.rules[ruleName] = {
        branchCoverage: ruleTotalBranches > 0 ? Math.round((ruleCoveredBranches / ruleTotalBranches) * 100) : 100,
        totalBranches: ruleTotalBranches,
        uncoveredBranches: uncoveredBranches.length,
        fpRisks: fpRisks.length,
        fnRisks: fnRisks.length,
        gaps: uncoveredBranches.map(b => ({
          line: b.line,
          type: b.classification.type,
          reason: b.classification.reason,
          code: b.lineContent,
        })),
      };
    }
  }

  totalBranches += pluginBranches;
  totalCovered += pluginCovered;

  const pctCoverage = pluginBranches > 0 ? Math.round((pluginCovered / pluginBranches) * 100) : 100;
  pluginResult.summary = {
    branchCoverage: pctCoverage,
    totalBranches: pluginBranches,
    coveredBranches: pluginCovered,
    fpRisks: pluginFpRisks,
    fnRisks: pluginFnRisks,
    rulesWithGaps: Object.keys(pluginResult.rules).length,
  };

  results[plugin] = pluginResult;

  if (!jsonOutput) {
    const icon = pctCoverage >= 90 ? '✅' : pctCoverage >= 70 ? '🟡' : '🔴';
    const gapCount = Object.keys(pluginResult.rules).length;
    console.log(`  ${icon} ${plugin}: ${pctCoverage}% branches | ${gapCount} rules with gaps | FP_RISK=${pluginFpRisks} FN_RISK=${pluginFnRisks}`);

    // Show worst rules
    const worstRules = (Object.entries(pluginResult.rules) as Array<[string, any]>)
      .sort((a, b) => a[1].branchCoverage - b[1].branchCoverage)
      .slice(0, 3);

    for (const [rule, data] of worstRules) {
      console.log(`     └─ ${rule}: ${data.branchCoverage}% (${data.uncoveredBranches} uncovered)`);
      data.gaps.slice(0, 2).forEach((g: any) => {
        console.log(`        ${g.type === 'FP_RISK' ? '⚠️' : '❌'} L${g.line}: ${g.reason}`);
      });
    }
  }
}

const aggregatePct = totalBranches > 0 ? Math.round((totalCovered / totalBranches) * 100) : 100;

if (!jsonOutput) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  Aggregate: ${aggregatePct}% branch coverage across ${plugins.length} plugins`);
  console.log(`  Total: ${totalBranches} branches, ${totalCovered} covered, ${totalBranches - totalCovered} uncovered`);
  console.log(`${'─'.repeat(60)}\n`);
}

if (jsonOutput) {
  const output = {
    timestamp: new Date().toISOString(),
    aggregate: {
      branchCoverage: aggregatePct,
      totalBranches,
      coveredBranches: totalCovered,
    },
    plugins: results,
  };
  console.log(JSON.stringify(output, null, 2));
}

// CI gate
if (ciMode && aggregatePct < threshold) {
  console.error(`\n❌ Branch coverage ${aggregatePct}% is below threshold ${threshold}%`);
  process.exit(1);
}
