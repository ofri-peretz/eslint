/* eslint-disable @typescript-eslint/no-unused-vars, no-empty */
/**
 * ESLint Security Plugins Benchmark
 * 
 * Compares:
 * - eslint-plugin-secure-coding
 * - eslint-plugin-security
 * 
 * Tests:
 * - Performance (execution time)
 * - JavaScript compatibility
 * - TypeScript compatibility
 * - Detection coverage
 */

import { execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const ITERATIONS = 5;
const TEST_FILES = {
  js: './test-files/vulnerable.js',
  ts: './test-files/vulnerable.ts',
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(msg: string, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function hr() {
  console.log('─'.repeat(70));
}

/**
 * Run ESLint with a specific config and measure time
 */
function runESLint(configFile: string, targetFile: string, iterations = 1) {
  const times = [];
  let output = '';
  let errorCount = 0;
  let warningCount = 0;
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      output = execSync(
        `npx eslint --config ${configFile} ${targetFile} --format json 2>/dev/null`,
        { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
      );
    } catch (e) {
      // ESLint exits with error code when it finds issues
      output = (e as any).stdout || '';
    }
    const end = performance.now();
    times.push(end - start);
  }
  
  // Parse results
  try {
    const results = JSON.parse(output);
    if (results && results[0]) {
      errorCount = results[0].errorCount || 0;
      warningCount = results[0].warningCount || 0;
    }
  } catch (e) {
    // Parsing failed, count from output
  }
  
  // Calculate stats
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
  };
}

/**
 * Get detailed rule breakdown
 */
function getDetailedResults(configFile: string, targetFile: string) {
  let output = '';
  try {
    output = execSync(
      `npx eslint --config ${configFile} ${targetFile} --format json 2>/dev/null`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
  } catch (e) {
    output = (e as any).stdout || '';
  }
  
  const ruleBreakdown: Record<string, number> = {};
  try {
    const results = JSON.parse(output);
    if (results && results[0] && results[0].messages) {
      for (const msg of results[0].messages) {
        const rule = msg.ruleId || 'unknown';
        ruleBreakdown[rule] = (ruleBreakdown[rule] || 0) + 1;
      }
    }
  } catch (e) {}
  
  return ruleBreakdown;
}

/**
 * Main benchmark function
 */
async function runBenchmark() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║     ESLint Security Plugins Benchmark                                ║', colors.cyan);
  log('║     eslint-plugin-secure-coding vs eslint-plugin-security            ║', colors.cyan);
  log('╚══════════════════════════════════════════════════════════════════════╝', colors.cyan);
  console.log('\n');
  
  // ================================
  // 1. Performance Benchmark
  // ================================
  log('📊 PERFORMANCE BENCHMARK', colors.bright);
  log(`   Iterations: ${ITERATIONS}`, colors.reset);
  hr();
  
  // JavaScript files
  log('\n🟨 JavaScript File (vulnerable.js)', colors.yellow);
  
  log('   Running eslint-plugin-secure-coding...', colors.reset);
  const scJS = runESLint('eslint.config.secure-coding.mjs', TEST_FILES.js, ITERATIONS);
  
  log('   Running eslint-plugin-security...', colors.reset);
  const secJS = runESLint('eslint.config.security.mjs', TEST_FILES.js, ITERATIONS);
  
  console.log('\n');
  console.log('   ┌────────────────────────────┬─────────────────┬─────────────────┐');
  console.log('   │ Metric                     │ secure-coding   │ security        │');
  console.log('   ├────────────────────────────┼─────────────────┼─────────────────┤');
  console.log(`   │ Avg Execution Time (ms)    │ ${scJS.avgTime.padStart(13)}ms │ ${secJS.avgTime.padStart(13)}ms │`);
  console.log(`   │ Min Time (ms)              │ ${scJS.minTime.padStart(13)}ms │ ${secJS.minTime.padStart(13)}ms │`);
  console.log(`   │ Max Time (ms)              │ ${scJS.maxTime.padStart(13)}ms │ ${secJS.maxTime.padStart(13)}ms │`);
  console.log(`   │ Issues Found               │ ${String(scJS.total).padStart(15)} │ ${String(secJS.total).padStart(15)} │`);
  console.log('   └────────────────────────────┴─────────────────┴─────────────────┘');
  
  const jsPerfRatio = (parseFloat(scJS.avgTime) / parseFloat(secJS.avgTime)).toFixed(2);
  log(`\n   Performance Ratio: secure-coding is ${jsPerfRatio}x ${parseFloat(jsPerfRatio) > 1 ? 'slower' : 'faster'}`, colors.blue);
  log(`   Detection Ratio: secure-coding found ${(scJS.total / secJS.total).toFixed(2)}x more issues`, colors.green);
  
  // TypeScript files
  log('\n\n🔷 TypeScript File (vulnerable.ts)', colors.blue);
  
  log('   Running eslint-plugin-secure-coding...', colors.reset);
  const scTS = runESLint('eslint.config.secure-coding.mjs', TEST_FILES.ts, ITERATIONS);
  
  log('   Running eslint-plugin-security...', colors.reset);
  const secTS = runESLint('eslint.config.security.mjs', TEST_FILES.ts, ITERATIONS);
  
  console.log('\n');
  console.log('   ┌────────────────────────────┬─────────────────┬─────────────────┐');
  console.log('   │ Metric                     │ secure-coding   │ security        │');
  console.log('   ├────────────────────────────┼─────────────────┼─────────────────┤');
  console.log(`   │ Avg Execution Time (ms)    │ ${scTS.avgTime.padStart(13)}ms │ ${secTS.avgTime.padStart(13)}ms │`);
  console.log(`   │ Min Time (ms)              │ ${scTS.minTime.padStart(13)}ms │ ${secTS.minTime.padStart(13)}ms │`);
  console.log(`   │ Max Time (ms)              │ ${scTS.maxTime.padStart(13)}ms │ ${secTS.maxTime.padStart(13)}ms │`);
  console.log(`   │ Issues Found               │ ${String(scTS.total).padStart(15)} │ ${String(secTS.total).padStart(15)} │`);
  console.log('   └────────────────────────────┴─────────────────┴─────────────────┘');
  
  // ================================
  // 2. Detection Coverage Breakdown
  // ================================
  console.log('\n');
  hr();
  log('🔍 DETECTION COVERAGE BREAKDOWN', colors.bright);
  hr();
  
  log('\n📁 JavaScript Detection (vulnerable.js)', colors.yellow);
  
  const scJSRules = getDetailedResults('eslint.config.secure-coding.mjs', TEST_FILES.js);
  const secJSRules = getDetailedResults('eslint.config.security.mjs', TEST_FILES.js);
  
  log('\n   eslint-plugin-secure-coding rules triggered:', colors.green);
  // oxlint-disable-next-line no-array-sort
  Object.entries(scJSRules).sort((a, b) => b[1] - a[1]).forEach(([rule, count]) => {
    log(`      • ${rule}: ${count} issues`, colors.reset);
  });
  
  // oxlint-disable-next-line no-array-sort
  log('\n   eslint-plugin-security rules triggered:', colors.yellow);
  Object.entries(secJSRules).sort((a, b) => b[1] - a[1]).forEach(([rule, count]) => {
    log(`      • ${rule}: ${count} issues`, colors.reset);
  });
  
  // ================================
  // 3. Summary
  // ================================
  console.log('\n');
  hr();
  log('📋 SUMMARY', colors.bright);
  hr();
  
  console.log(`
   ┌─────────────────────────────────────────────────────────────────────┐
   │                        BENCHMARK RESULTS                            │
   ├─────────────────────────────┬───────────────────┬───────────────────┤
   │ Metric                      │ secure-coding     │ security          │
   ├─────────────────────────────┼───────────────────┼───────────────────┤
   │ JS Performance (avg ms)     │ ${scJS.avgTime.padStart(15)}ms │ ${secJS.avgTime.padStart(15)}ms │
   │ TS Performance (avg ms)     │ ${scTS.avgTime.padStart(15)}ms │ ${secTS.avgTime.padStart(15)}ms │
   │ JS Issues Found             │ ${String(scJS.total).padStart(17)} │ ${String(secJS.total).padStart(17)} │
   │ TS Issues Found             │ ${String(scTS.total).padStart(17)} │ ${String(secTS.total).padStart(17)} │
   │ JS Rules Triggered          │ ${String(Object.keys(scJSRules).length).padStart(17)} │ ${String(Object.keys(secJSRules).length).padStart(17)} │
   │ Total Rules Available       │ ${String(89).padStart(17)} │ ${String(14).padStart(17)} │
   └─────────────────────────────┴───────────────────┴───────────────────┘
  `);
  
  // Performance per issue
  const scIssueTime = (parseFloat(scJS.avgTime) / scJS.total).toFixed(2);
  const secIssueTime = (parseFloat(secJS.avgTime) / secJS.total).toFixed(2);
  
  log('\n   ⚡ Efficiency (time per issue detected):', colors.cyan);
  log(`      • secure-coding: ${scIssueTime}ms per issue`, colors.reset);
  log(`      • security: ${secIssueTime}ms per issue`, colors.reset);
  
  // Verdict
  console.log('\n');
  hr();
  log('🏆 VERDICT', colors.bright);
  hr();
  
  const perfWinner = parseFloat(secJS.avgTime) < parseFloat(scJS.avgTime) ? 'security' : 'secure-coding';
  const detectionWinner = scJS.total > secJS.total ? 'secure-coding' : 'security';
  const efficiencyWinner = parseFloat(scIssueTime) < parseFloat(secIssueTime) ? 'secure-coding' : 'security';
  
  log(`\n   Raw Performance: ${perfWinner === 'security' ? '🏅 eslint-plugin-security' : '🏅 eslint-plugin-secure-coding'}`, 
      perfWinner === 'security' ? colors.yellow : colors.green);
  log(`   Detection Coverage: ${detectionWinner === 'secure-coding' ? '🏅 eslint-plugin-secure-coding' : '🏅 eslint-plugin-security'}`, 
      detectionWinner === 'secure-coding' ? colors.green : colors.yellow);
  log(`   Efficiency (time/issue): ${efficiencyWinner === 'secure-coding' ? '🏅 eslint-plugin-secure-coding' : '🏅 eslint-plugin-security'}`, 
      efficiencyWinner === 'secure-coding' ? colors.green : colors.yellow);
  
  console.log('\n');
}

runBenchmark().catch(console.error);
