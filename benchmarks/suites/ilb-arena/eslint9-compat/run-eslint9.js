#!/usr/bin/env node

/**
 * ESLint 9 Benchmark Runner
 *
 * Runs eslint-plugin-security, eslint-plugin-no-unsanitized, and eslint-plugin-import
 * in ESLint 9 (flat config) mode for fair comparison. Sibling of run-eslint8.js.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ESLINT_VERSION_LABEL = '9.x';
const RESULT_FILENAME_PREFIX = 'eslint9';

const PLUGINS_TO_TEST = [
  {
    name: 'eslint-plugin-security',
    displayName: 'eslint-plugin-security',
    config: 'eslint.config.security.js',
    rules: 14,
    focus: 'Node.js security patterns',
    weeklyDownloads: '1.5M+',
  },
  {
    name: 'eslint-plugin-no-unsanitized',
    displayName: 'eslint-plugin-no-unsanitized (Mozilla)',
    config: 'eslint.config.no-unsanitized.js',
    rules: 2,
    focus: 'XSS via innerHTML/insertAdjacentHTML',
    weeklyDownloads: '~500K',
  },
  {
    name: 'eslint-plugin-import',
    displayName: 'eslint-plugin-import',
    config: 'eslint.config.import.js',
    rules: 17,
    focus: 'Import/export validation',
    weeklyDownloads: '45M+',
  },
];

const FIXTURE_DIR = join(__dirname, '../fixtures');
const OUTPUT_DIR = join(__dirname, '../../../results/ilb-arena');

function runEslint(configPath, targetFile) {
  const result = spawnSync(
    'npx',
    ['eslint', '--config', configPath, '--format', 'json', '--no-error-on-unmatched-pattern', targetFile],
    { cwd: __dirname, encoding: 'utf-8', timeout: 60000 },
  );

  try {
    return JSON.parse(result.stdout || '[]');
  } catch (e) {
    if (result.stderr && result.stderr.includes('TypeError')) {
      return { crashed: true, error: result.stderr };
    }
    console.error('Failed to parse ESLint output:', e.message);
    return [];
  }
}

function extractViolations(eslintResults) {
  if (eslintResults.crashed) {
    return { crashed: true, error: eslintResults.error, violations: [] };
  }
  const violations = [];
  for (const file of eslintResults) {
    for (const message of file.messages || []) {
      if (message.ruleId === null) continue;
      violations.push({
        ruleId: message.ruleId,
        severity: message.severity === 2 ? 'error' : 'warning',
        message: message.message,
        line: message.line,
        column: message.column,
      });
    }
  }
  return { crashed: false, violations };
}

function groupByRule(violations) {
  const byRule = {};
  for (const v of violations) {
    if (!byRule[v.ruleId]) byRule[v.ruleId] = { count: 0, lines: [] };
    byRule[v.ruleId].count++;
    byRule[v.ruleId].lines.push(v.line);
  }
  return byRule;
}

async function runBenchmark() {
  console.log(`🔬 ESLint ${ESLINT_VERSION_LABEL} Benchmark: Security Plugin Comparison\n`);
  console.log('='.repeat(70));

  const vulnerableFile = join(FIXTURE_DIR, 'vulnerable/vulnerable.js');
  const safeFile = join(FIXTURE_DIR, 'safe/safe-patterns.js');

  const results = {
    timestamp: new Date().toISOString(),
    eslintVersion: ESLINT_VERSION_LABEL,
    methodology: `ESLint ${ESLINT_VERSION_LABEL} flat config for fair comparison`,
    plugins: {},
  };

  for (const plugin of PLUGINS_TO_TEST) {
    console.log(`\n\n🔍 Testing: ${plugin.displayName}`);
    console.log(`   Rules: ${plugin.rules} | Focus: ${plugin.focus}`);
    console.log('-'.repeat(70));

    console.log('   Scanning vulnerable.js...');
    const vulnerableRaw = runEslint(plugin.config, vulnerableFile);
    const vulnerableResult = extractViolations(vulnerableRaw);

    console.log('   Scanning safe-patterns.js...');
    const safeRaw = runEslint(plugin.config, safeFile);
    const safeResult = extractViolations(safeRaw);

    if (vulnerableResult.crashed) {
      console.log(`\n   ❌ CRASHED: ${vulnerableResult.error.split('\n')[0]}`);
      results.plugins[plugin.name] = {
        displayName: plugin.displayName,
        rules: plugin.rules,
        status: 'CRASHED',
        error: vulnerableResult.error.split('\n').slice(0, 5).join('\n'),
      };
      continue;
    }

    const vulnerableByRule = groupByRule(vulnerableResult.violations);
    const safeByRule = groupByRule(safeResult.violations);

    console.log(`\n   📊 Results:`);
    console.log(`      Violations on vulnerable code: ${vulnerableResult.violations.length}`);
    console.log(`      Violations on safe code: ${safeResult.violations.length} (false positives)`);

    console.log(`\n   📋 Rules triggered on VULNERABLE code:`);
    for (const [rule, data] of Object.entries(vulnerableByRule)) {
      console.log(`      ${rule}: ${data.count}x (lines: ${data.lines.slice(0, 5).join(', ')}${data.lines.length > 5 ? '...' : ''})`);
    }

    if (Object.keys(safeByRule).length > 0) {
      console.log(`\n   ⚠️  Rules triggered on SAFE code (False Positives):`);
      for (const [rule, data] of Object.entries(safeByRule)) {
        console.log(`      ${rule}: ${data.count}x (lines: ${data.lines.slice(0, 5).join(', ')}${data.lines.length > 5 ? '...' : ''})`);
      }
    }

    results.plugins[plugin.name] = {
      displayName: plugin.displayName,
      rules: plugin.rules,
      focus: plugin.focus,
      weeklyDownloads: plugin.weeklyDownloads,
      status: 'OK',
      vulnerableAnalysis: {
        totalViolations: vulnerableResult.violations.length,
        byRule: vulnerableByRule,
      },
      safeAnalysis: {
        totalViolations: safeResult.violations.length,
        byRule: safeByRule,
      },
    };
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = join(OUTPUT_DIR, `${RESULT_FILENAME_PREFIX}-${new Date().toISOString().split('T')[0]}.json`);
  writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log('\n\n' + '='.repeat(70));
  console.log('📋 SUMMARY');
  console.log('='.repeat(70));
  console.log('\n| Plugin | Rules | Vulnerable Detections | Safe FPs | Status |');
  console.log('|--------|-------|----------------------|----------|--------|');
  for (const [, data] of Object.entries(results.plugins)) {
    if (data.status === 'CRASHED') {
      console.log(`| ${data.displayName.substring(0, 30).padEnd(30)} | ${String(data.rules).padEnd(5)} | N/A | N/A | ❌ CRASHED |`);
    } else {
      console.log(`| ${data.displayName.substring(0, 30).padEnd(30)} | ${String(data.rules).padEnd(5)} | ${String(data.vulnerableAnalysis.totalViolations).padEnd(20)} | ${String(data.safeAnalysis.totalViolations).padEnd(8)} | ✅ OK |`);
    }
  }
  console.log(`\n\n✅ Results saved to: ${outputPath}`);
  return results;
}

runBenchmark().catch(console.error);
