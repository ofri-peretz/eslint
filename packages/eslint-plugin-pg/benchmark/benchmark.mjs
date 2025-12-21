/**
 * eslint-plugin-pg Benchmark
 * 
 * Demonstrates detection capabilities and performance.
 */

import { execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const ITERATIONS = 5;
const TEST_FILE = './test-files/vulnerable.js';
const SAFE_FILE = './test-files/safe-patterns.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function hr() {
  console.log('─'.repeat(75));
}

function runESLint(configFile, targetFile, iterations = 1) {
  const times = [];
  let output = '';
  let errorCount = 0;
  let warningCount = 0;
  const rules = {};
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      output = execSync(
        `npx eslint --config benchmark/${configFile} benchmark/${targetFile} --format json 2>/dev/null`,
        { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, cwd: '..' }
      );
    } catch (e) {
      output = e.stdout || '';
    }
    const end = performance.now();
    times.push(end - start);
  }
  
  try {
    const results = JSON.parse(output);
    if (results && results[0]) {
      errorCount = results[0].errorCount || 0;
      warningCount = results[0].warningCount || 0;
      for (const msg of results[0].messages || []) {
        const rule = msg.ruleId || 'unknown';
        rules[rule] = (rules[rule] || 0) + 1;
      }
    }
  } catch {
    // JSON parse failed, use defaults
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  return {
    avgTime: avg.toFixed(2),
    minTime: min.toFixed(2),
    maxTime: max.toFixed(2),
    errors: errorCount,
    warnings: warningCount,
    total: errorCount + warningCount,
    rules,
    ruleCount: Object.keys(rules).length,
  };
}

async function runBenchmark() {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║     eslint-plugin-pg BENCHMARK                                            ║', colors.cyan);
  log('║     PostgreSQL Security & Best Practices                                  ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════════════════════════════╝', colors.cyan);
  console.log('\n');
  
  // ================================
  // Test 1: Vulnerability Detection
  // ================================
  log('📋 TEST 1: VULNERABILITY DETECTION', colors.bright);
  log('   Testing against vulnerable.js with known issues', colors.reset);
  hr();
  
  log('   Running eslint-plugin-pg...', colors.reset);
  const vulnResults = runESLint('eslint.config.pg.mjs', TEST_FILE, ITERATIONS);
  
  console.log(`
   ┌─────────────────────────────┬──────────────────────┐
   │ Metric                      │ eslint-plugin-pg     │
   ├─────────────────────────────┼──────────────────────┤
   │ Avg Execution Time          │ ${vulnResults.avgTime.padStart(18)}ms │
   │ Issues Found                │ ${String(vulnResults.total).padStart(20)} │
   │ Unique Rules Triggered      │ ${String(vulnResults.ruleCount).padStart(20)} │
   └─────────────────────────────┴──────────────────────┘
  `);
  
  // Rule breakdown
  log('\n   📊 ISSUES BY RULE:', colors.bright);
  hr();
  
  for (const [rule, count] of Object.entries(vulnResults.rules).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${rule.padEnd(40)} ${String(count).padStart(3)} issues`);
  }
  
  // ================================
  // Test 2: False Positive Check
  // ================================
  console.log('\n\n');
  log('📋 TEST 2: FALSE POSITIVE CHECK', colors.bright);
  log('   Testing against safe-patterns.js (should find 0 issues)', colors.reset);
  hr();
  
  log('   Running eslint-plugin-pg...', colors.reset);
  const safeResults = runESLint('eslint.config.pg.mjs', SAFE_FILE, ITERATIONS);
  
  console.log(`
   ┌─────────────────────────────┬──────────────────────┐
   │ Metric                      │ eslint-plugin-pg     │
   ├─────────────────────────────┼──────────────────────┤
   │ Issues Found                │ ${String(safeResults.total).padStart(20)} │
   │ False Positives             │ ${safeResults.total === 0 ? '✅ NONE'.padStart(20) : `⚠️ ${safeResults.total}`.padStart(20)} │
   └─────────────────────────────┴──────────────────────┘
  `);
  
  // ================================
  // Summary
  // ================================
  console.log('\n\n');
  hr();
  log('🏆 BENCHMARK SUMMARY', colors.bright);
  hr();
  
  const precision = vulnResults.total > 0 
    ? ((vulnResults.total / (vulnResults.total + safeResults.total)) * 100).toFixed(1)
    : '100.0';
  
  console.log(`
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                                                                             │
   │  Detection:                                                                 │
   │    • Issues Found:     ${String(vulnResults.total).padStart(3)} on vulnerable.js                            │
   │    • Rules Triggered:  ${String(vulnResults.ruleCount).padStart(3)} unique rules                                │
   │                                                                             │
   │  Precision:                                                                 │
   │    • False Positives:  ${String(safeResults.total).padStart(3)} on safe-patterns.js                        │
   │    • Precision Rate:   ${precision}%                                           │
   │                                                                             │
   │  Performance:                                                               │
   │    • Avg Time:         ${vulnResults.avgTime}ms per run                                │
   │                                                                             │
   └─────────────────────────────────────────────────────────────────────────────┘
  `);
  
  console.log('\n');
}

runBenchmark().catch(console.error);
