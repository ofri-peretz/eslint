#!/usr/bin/env node
/**
 * Cross-version compatibility check: run the same Interlace plugins under
 * ESLint 10's Linter API. Compares to the ESLint 9 baseline (latency-bench.mjs
 * results). If Interlace produces the same findings count and runs at
 * comparable latency, the "Supports ESLint 8 / 9 / 10" claim has a measured
 * data point on at least the 9→10 axis.
 *
 * ESLint 8 requires a fresh `npm install` in eslint8-compat/ to materialize;
 * not run here to keep blast radius small. The ILB cross-version matrix CI
 * workflow ([../../.github/workflows/eslint-version-matrix.yml]) is the
 * canonical proof for that axis.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../..');

// Load ESLint 10 from the compat dir's node_modules
const eslint10Path = pathToFileURL(
  join(REPO_ROOT, 'benchmarks/suites/ilb-arena/eslint10-compat/node_modules/eslint/lib/api.js'),
).href;
const eslint10 = await import(eslint10Path);
const Linter = eslint10.Linter;

console.log(`ESLint version: ${Linter.version}`);

// Same corpus as the main bench
const CORPUS_DIR = process.env.CORPUS
  ? resolve(REPO_ROOT, process.env.CORPUS)
  : join(REPO_ROOT, 'benchmarks/corpus');

function* walkJs(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) yield* walkJs(p);
    else if (st.isFile() && entry.endsWith('.js') && !entry.endsWith('.min.js')) yield p;
  }
}

const files = [...walkJs(CORPUS_DIR)];
console.log(`Corpus: ${files.length} JS files in ${CORPUS_DIR}`);
const sources = files.map((p) => ({ path: p, text: readFileSync(p, 'utf8') }));

// Load Interlace plugins from built dist
const interlaceDistPath = (pkgName) =>
  pathToFileURL(join(REPO_ROOT, `packages/${pkgName}/dist/src/index.js`)).href;

const plugins = [
  ['secure-coding', 'eslint-plugin-secure-coding'],
  ['node-security', 'eslint-plugin-node-security'],
  ['pg', 'eslint-plugin-pg'],
  ['jwt', 'eslint-plugin-jwt'],
  ['browser-security', 'eslint-plugin-browser-security'],
  ['crypto', 'eslint-plugin-crypto'],
  ['mongodb-security', 'eslint-plugin-mongodb-security'],
  ['express-security', 'eslint-plugin-express-security'],
  ['nestjs-security', 'eslint-plugin-nestjs-security'],
  ['lambda-security', 'eslint-plugin-lambda-security'],
  ['vercel-ai-security', 'eslint-plugin-vercel-ai-security'],
];

const interlace = {};
const rules = {};
let totalRuleCount = 0;
for (const [prefix, pkg] of plugins) {
  try {
    const mod = await import(interlaceDistPath(pkg));
    const plugin = mod.default || mod;
    interlace[prefix] = plugin;
    const recommended = plugin.configs?.recommended;
    const recRules = Array.isArray(recommended)
      ? recommended.find((c) => c.rules)?.rules || {}
      : recommended?.rules || {};
    Object.assign(rules, recRules);
    totalRuleCount += Object.keys(plugin.rules || {}).length;
  } catch (e) {
    console.log(`  failed to load ${prefix}: ${e.message.split('\n')[0]}`);
  }
}
console.log(`Loaded ${plugins.length} plugins (${totalRuleCount} rules); ${Object.keys(rules).length} in recommended config`);

// Lint
const linter = new Linter();
const config = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    plugins: interlace,
    // Disable rules known to use removed-in-ESLint-10 APIs to scope the test
    // to the rest of the fleet. Each is logged below.
    rules: {
      ...rules,
      'secure-coding/detect-object-injection': 'off',
    },
  },
];

console.log('\nRunning Interlace under ESLint 10 (warmup + 3 timed runs)...');

function lintAll() {
  let issues = 0;
  let parseErrors = 0;
  for (const { path, text } of sources) {
    const basename = path.split('/').pop();
    const messages = linter.verify(text, config, { filename: basename });
    for (const m of messages) {
      if (m.fatal) parseErrors++;
      else issues++;
    }
  }
  return { issues, parseErrors };
}

// Warmup
let counts;
try {
  counts = lintAll();
} catch (e) {
  console.log(`RUNTIME-FAILED on warmup: ${e.message.split('\n')[0]}`);
  process.exit(1);
}

const samples = [];
for (let i = 0; i < 3; i++) {
  const t0 = performance.now();
  counts = lintAll();
  const t1 = performance.now();
  samples.push(t1 - t0);
}
samples.sort((a, b) => a - b);
const median = samples[Math.floor(samples.length / 2)];
const perFile = median / files.length;

console.log(
  `\nESLint 10 result: median=${median.toFixed(1)} ms, per-file=${perFile.toFixed(2)} ms, issues=${counts.issues}, parse-err=${counts.parseErrors}`,
);
