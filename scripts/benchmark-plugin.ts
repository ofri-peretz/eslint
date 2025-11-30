#!/usr/bin/env tsx
/**
 * Performance Benchmarks for @forge-js/eslint-plugin-llm-optimized
 *
 * Run with: pnpm tsx scripts/benchmark-plugin.ts
 *
 * This script measures performance of core plugin utilities:
 * - LRU Cache operations
 * - External module detection
 * - File system cache
 * - LLM message formatting
 * - Security benchmark lookups
 */

import { performance } from 'node:perf_hooks';

// Import from the packages
import {
  createFileSystemCache,
  createLRUCache,
  isDefinitelyExternal,
} from '../packages/eslint-plugin/src/utils/node-fs-utils';

// Type alias for clarity
type LRUCache<K, V> = ReturnType<typeof createLRUCache<K, V>>;

import {
  formatLLMMessage,
  MessageIcons,
  toSARIF,
  getSecurityBenchmarks,
  severityToCVSS,
} from '../packages/eslint-plugin-utils/src/llm-message-format';

// =============================================================================
// BENCHMARK UTILITIES
// =============================================================================

interface BenchmarkResult {
  name: string;
  opsPerSecond: number;
  avgTimeMs: number;
  iterations: number;
}

const results: BenchmarkResult[] = [];

function bench(name: string, fn: () => void, iterations = 10000): void {
  // Warm up
  for (let i = 0; i < 100; i++) {
    fn();
  }

  // Measure
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();

  const totalMs = end - start;
  const avgTimeMs = totalMs / iterations;
  const opsPerSecond = Math.round(1000 / avgTimeMs);

  results.push({ name, opsPerSecond, avgTimeMs, iterations });
}

function printResults(): void {
  console.log('\n📊 Benchmark Results\n');
  console.log('=' .repeat(80));
  console.log(
    'Benchmark'.padEnd(50) +
    'Ops/sec'.padStart(12) +
    'Avg (μs)'.padStart(12)
  );
  console.log('-'.repeat(80));

  for (const result of results) {
    const opsStr = result.opsPerSecond.toLocaleString();
    const avgUs = (result.avgTimeMs * 1000).toFixed(2);
    console.log(
      result.name.padEnd(50) +
      opsStr.padStart(12) +
      avgUs.padStart(12)
    );
  }

  console.log('=' .repeat(80));
  console.log(`\nTotal benchmarks: ${results.length}`);
}

function section(name: string): void {
  console.log(`\n▶ ${name}...`);
}

// =============================================================================
// LRU CACHE BENCHMARKS
// =============================================================================

section('LRU Cache');

const lruCache = createLRUCache<string, string>(1000);
for (let i = 0; i < 500; i++) {
  lruCache.set(`key-${i}`, `value-${i}`);
}

bench('LRU: set (new key)', () => {
  lruCache.set(`new-${Math.random()}`, 'value');
});

bench('LRU: get (cache hit)', () => {
  lruCache.get('key-250');
});

bench('LRU: get (cache miss)', () => {
  lruCache.get('nonexistent');
});

bench('LRU: has (exists)', () => {
  lruCache.has('key-100');
});

bench('LRU: has (not exists)', () => {
  lruCache.has('nonexistent');
});

bench('LRU: create + fill (100 entries)', () => {
  const c = createLRUCache<string, string>(100);
  for (let i = 0; i < 100; i++) {
    c.set(`k-${i}`, `v-${i}`);
  }
}, 1000);

// =============================================================================
// EXTERNAL MODULE DETECTION BENCHMARKS
// =============================================================================

section('External Module Detection');

bench('isDefinitelyExternal: known package (react)', () => {
  isDefinitelyExternal('react');
});

bench('isDefinitelyExternal: node: prefix', () => {
  isDefinitelyExternal('node:fs');
});

bench('isDefinitelyExternal: bare module (fs)', () => {
  isDefinitelyExternal('fs');
});

bench('isDefinitelyExternal: relative path', () => {
  isDefinitelyExternal('./utils');
});

bench('isDefinitelyExternal: alias path', () => {
  isDefinitelyExternal('@app/services');
});

bench('isDefinitelyExternal: scoped package', () => {
  isDefinitelyExternal('@types/node');
});

const externalPackages = ['react', 'vue', 'lodash', 'axios', 'express', 'typescript', 'webpack', 'vite'];
bench('isDefinitelyExternal: batch (8 packages)', () => {
  for (const pkg of externalPackages) {
    isDefinitelyExternal(pkg);
  }
}, 5000);

// =============================================================================
// FILE SYSTEM CACHE BENCHMARKS
// =============================================================================

section('FileSystemCache');

bench('createFileSystemCache', () => {
  createFileSystemCache();
});

bench('FileSystemCache: full cycle', () => {
  const cache = createFileSystemCache();
  cache.dependencies.set('file1.ts', []);
  cache.fileExists.set('file1.ts', true);
  cache.fileHashes.set('file1.ts', 'hash123');
  cache.nonCyclicFiles.add('file1.ts');
  cache.dependencies.get('file1.ts');
  cache.fileExists.get('file1.ts');
}, 5000);

// =============================================================================
// LLM MESSAGE FORMAT BENCHMARKS
// =============================================================================

section('LLM Message Format');

bench('formatLLMMessage: basic (no CWE)', () => {
  formatLLMMessage({
    icon: MessageIcons.WARNING,
    issueName: 'Test Issue',
    description: 'Test description',
    severity: 'MEDIUM',
    fix: 'Test fix instruction',
    documentationLink: 'https://example.com',
  });
});

bench('formatLLMMessage: security (with CWE)', () => {
  formatLLMMessage({
    icon: MessageIcons.SECURITY,
    issueName: 'SQL Injection',
    cwe: 'CWE-89',
    description: 'SQL Injection detected',
    severity: 'CRITICAL',
    fix: 'Use parameterized query',
    documentationLink: 'https://owasp.org',
  });
});

bench('formatLLMMessage: full (all fields)', () => {
  formatLLMMessage({
    icon: MessageIcons.SECURITY,
    issueName: 'XSS Vulnerability',
    cwe: 'CWE-79',
    description: 'Cross-site scripting in user input handling',
    severity: 'HIGH',
    fix: 'Sanitize output using DOMPurify.sanitize(input)',
    documentationLink: 'https://owasp.org/www-community/xss-filter-evasion-cheatsheet',
  });
});

const cwes = ['CWE-89', 'CWE-79', 'CWE-78', 'CWE-22', 'CWE-915'];
bench('formatLLMMessage: batch (10 messages)', () => {
  for (let i = 0; i < 10; i++) {
    formatLLMMessage({
      icon: MessageIcons.SECURITY,
      issueName: `Issue ${i}`,
      cwe: cwes[i % cwes.length],
      description: `Description ${i}`,
      severity: 'HIGH',
      fix: `Fix ${i}`,
      documentationLink: 'https://example.com',
    });
  }
}, 1000);

// =============================================================================
// SARIF & SECURITY BENCHMARKS
// =============================================================================

section('SARIF & Security');

bench('toSARIF', () => {
  toSARIF({
    icon: MessageIcons.SECURITY,
    issueName: 'SQL Injection',
    cwe: 'CWE-89',
    description: 'SQL Injection detected',
    severity: 'CRITICAL',
    fix: 'Use parameterized query',
    documentationLink: 'https://owasp.org',
  });
});

bench('getSecurityBenchmarks: known CWE', () => {
  getSecurityBenchmarks('CWE-89');
});

bench('getSecurityBenchmarks: unknown CWE', () => {
  getSecurityBenchmarks('CWE-99999');
});

const allCwes = ['CWE-89', 'CWE-79', 'CWE-78', 'CWE-22', 'CWE-915', 'CWE-798', 'CWE-327', 'CWE-330', 'CWE-400', 'CWE-306'];
bench('getSecurityBenchmarks: batch (10 CWEs)', () => {
  for (const cwe of allCwes) {
    getSecurityBenchmarks(cwe);
  }
}, 5000);

bench('severityToCVSS: all severities', () => {
  severityToCVSS('CRITICAL');
  severityToCVSS('HIGH');
  severityToCVSS('MEDIUM');
  severityToCVSS('LOW');
});

// =============================================================================
// BASELINE BENCHMARKS (for tracking)
// =============================================================================

section('Baselines (for tracking)');

bench('BASELINE: LRU cache cycle', () => {
  const c = createLRUCache<string, string>(100);
  c.set('key', 'value');
  c.get('key');
  c.has('key');
  c.delete('key');
});

bench('BASELINE: isDefinitelyExternal (3 checks)', () => {
  isDefinitelyExternal('react');
  isDefinitelyExternal('./utils');
  isDefinitelyExternal('node:fs');
});

bench('BASELINE: formatLLMMessage (security)', () => {
  formatLLMMessage({
    icon: MessageIcons.SECURITY,
    issueName: 'SQL Injection',
    cwe: 'CWE-89',
    description: 'SQL Injection detected',
    severity: 'CRITICAL',
    fix: 'Use parameterized query',
    documentationLink: 'https://owasp.org',
  });
});

// =============================================================================
// PRINT RESULTS
// =============================================================================

printResults();

// Output JSON for CI
if (process.argv.includes('--json')) {
  const jsonOutput = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    results: results.map(r => ({
      name: r.name,
      opsPerSecond: r.opsPerSecond,
      avgTimeUs: r.avgTimeMs * 1000,
      iterations: r.iterations,
    })),
  };
  console.log('\n📄 JSON Output:');
  console.log(JSON.stringify(jsonOutput, null, 2));
}

