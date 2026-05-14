/**
 * Run a specific benchmark or all benchmarks
 * Usage: node scripts/run-benchmark.js [benchmark-name] [--iterations=N]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runBenchmark, printSummaryTable } from '../lib/runner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const BENCHMARKS_DIR = path.join(ROOT_DIR, 'suites');
const RESULTS_DIR = path.join(ROOT_DIR, 'results');

// Benchmark configurations — keys map to results/<key>/ subdirs.
const BENCHMARKS = {
  'ilb-perf-import': {
    name: 'ILB-Perf — Import Plugin Core Rules (9 rules)',
    baseDir: 'ilb-perf-import',
    plugins: [
      { name: 'eslint-plugin-import', config: 'import.config.js' },
      { name: 'eslint-plugin-import-next', config: 'import-next.config.js' },
    ],
    fixtureSizes: [1000, 5000, 10000],
  },
  'ilb-perf-import-recommended': {
    name: 'ILB-Perf — Import Plugin Recommended Preset',
    baseDir: 'ilb-perf-import',
    plugins: [
      { name: 'eslint-plugin-import', config: 'import-recommended.config.js' },
      { name: 'eslint-plugin-import-next', config: 'import-next-recommended.config.js' },
    ],
    fixtureSizes: [1000, 5000, 10000],
  },
  'ilb-perf-import-no-cycle': {
    name: 'ILB-Perf — Import Plugin no-cycle Only',
    baseDir: 'ilb-perf-import',
    plugins: [
      { name: 'eslint-plugin-import', config: 'import-no-cycle.config.js' },
      { name: 'eslint-plugin-import-next', config: 'import-next-no-cycle.config.js' },
    ],
    fixtureSizes: [1000, 5000, 10000],
  },
  'ilb-cwe-corpus': {
    name: 'ILB-CWE-Corpus — Synthetic CWE Corpus',
    baseDir: 'ilb-cwe-corpus',
    plugins: [
      { name: 'eslint-plugin-security', config: 'security.config.js' },
      { name: 'eslint-plugin-secure-coding', config: 'secure-coding.config.js' },
    ],
    fixtureSizes: [1000, 5000],
  },
};

// Parse CLI args
const args = process.argv.slice(2);
const benchmarkName = args.find(a => !a.startsWith('--'));
const runAll = args.includes('--all');
const iterations = parseInt(args.find(a => a.startsWith('--iterations='))?.split('=')[1] || '10');

async function main() {
  console.log('🔬 ESLint Benchmark Suite\n');

  const benchmarksToRun = runAll 
    ? Object.keys(BENCHMARKS) 
    : benchmarkName 
      ? [benchmarkName] 
      : [];

  if (benchmarksToRun.length === 0) {
    console.log('Usage: node scripts/run-benchmark.js [benchmark] [--iterations=N]');
    console.log('\nAvailable benchmarks:');
    Object.keys(BENCHMARKS).forEach(b => console.log(`  - ${b}`));
    console.log('\nOr use --all to run all benchmarks');
    process.exit(1);
  }

  for (const name of benchmarksToRun) {
    const config = BENCHMARKS[name];
    
    if (!config) {
      console.log(`❌ Unknown benchmark: ${name}`);
      continue;
    }

    const benchmarkDir = path.join(BENCHMARKS_DIR, config.baseDir || name);
    const resultsDir = path.join(RESULTS_DIR, name);

    // Ensure results directory exists
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const results = runBenchmark({
      name: config.name,
      plugins: config.plugins,
      fixtureSizes: config.fixtureSizes,
      fixturesDir: path.join(benchmarkDir, 'fixtures'),
      configsDir: path.join(benchmarkDir, 'configs'),
      iterations,
    });

    // Save results
    const filename = `${new Date().toISOString().split('T')[0]}.json`;
    const resultsPath = path.join(resultsDir, filename);
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

    console.log('\n' + '─'.repeat(60));
    console.log(`\n✅ Results saved to: results/${name}/${filename}`);
    
    printSummaryTable(results);
  }
}

main();
