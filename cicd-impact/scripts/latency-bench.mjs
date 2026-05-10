#!/usr/bin/env node
/**
 * Latency bench — programmatic ESLint API, runs each plugin against the
 * `benchmarks/corpus/` JS files. Bypasses npm package resolution by loading
 * built artifacts directly from <package>/dist/src/index.js paths.
 *
 * Output: median ms total + ms/file for each plugin over 3 timed runs.
 *
 * Usage:
 *   node cicd-impact/scripts/latency-bench.mjs
 */

import { Linter } from 'eslint';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../..');

// CORPUS env var overrides the default ILB corpus.
//   CORPUS=node_modules/lodash node cicd-impact/scripts/latency-bench.mjs
const CORPUS_DIR = process.env.CORPUS
  ? resolve(REPO_ROOT, process.env.CORPUS)
  : join(REPO_ROOT, 'benchmarks/corpus');
const RUNS = parseInt(process.env.RUNS || '3', 10);
const FILE_CAP = parseInt(process.env.FILE_CAP || '0', 10); // 0 = no cap

// ----- Corpus discovery (recursive .js files) -------------------------------
function* walkJs(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue; // never recurse into nested deps
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) yield* walkJs(p);
    else if (st.isFile() && entry.endsWith('.js') && !entry.endsWith('.min.js')) yield p;
  }
}

let files = [...walkJs(CORPUS_DIR)];
if (FILE_CAP > 0 && files.length > FILE_CAP) {
  files = files.slice(0, FILE_CAP);
  console.log(`Capping corpus to first ${FILE_CAP} files (FILE_CAP env)`);
}
const totalLoc = files.reduce((sum, p) => sum + readFileSync(p, 'utf8').split('\n').length, 0);
console.log(
  `Corpus: ${files.length} JS files (${(totalLoc / 1000).toFixed(1)}K LoC) in ${CORPUS_DIR}`,
);

const sources = files.map((p) => ({ path: p, text: readFileSync(p, 'utf8') }));

// ----- Plugin loaders (absolute dist paths to bypass package.json `main`) ---
// Each entry: name -> async () => loaded plugin module's default export

const interlaceDistPath = (pkgName) =>
  pathToFileURL(join(REPO_ROOT, `packages/${pkgName}/dist/src/index.js`)).href;

const competitorPath = (pkgName) =>
  pathToFileURL(join(REPO_ROOT, `node_modules/${pkgName}`)).href;

// Strategy: import the plugin, register its rules with the Linter via
// `defineRule`, then verify each file with the rule set enabled.
async function loadInterlace(pkgName) {
  const mod = await import(interlaceDistPath(pkgName));
  return mod.default || mod;
}
async function loadCompetitor(pkgName) {
  // Use bare specifier so Node respects package.json exports/main and resolves
  // through node_modules normally.
  const mod = await import(pkgName);
  return mod.default || mod;
}

// ----- Build linter setups for each candidate -------------------------------
async function setupInterlace() {
  const plugins = await Promise.all([
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
  ].map(async ([prefix, pkg]) => [prefix, await loadInterlace(pkg)]));

  const config = { plugins: {}, rules: {} };
  for (const [prefix, plugin] of plugins) {
    config.plugins[prefix] = plugin;
    const recommended = plugin.configs?.recommended;
    if (recommended) {
      const recRules = Array.isArray(recommended)
        ? recommended.find((c) => c.rules)?.rules || {}
        : recommended.rules || {};
      Object.assign(config.rules, recRules);
    }
  }
  return config;
}

async function setupSinglePlugin(pkgName, prefix, ruleSetExtractor) {
  const plugin = await loadCompetitor(pkgName);
  const config = { plugins: { [prefix]: plugin }, rules: {} };
  const rules = ruleSetExtractor(plugin);
  Object.assign(config.rules, rules);
  return config;
}

// ----- Time a single config against the corpus ------------------------------
function lintAll(config) {
  const linter = new Linter();
  // Flat-config array form with files glob. Filename passed to verify() must
  // be a relative path that matches the glob; ESLint's matcher interprets
  // absolute paths as no-match, producing spurious "No matching configuration
  // found" warnings for every file. Use basename to sidestep.
  const wrapped = [
    {
      files: ['**/*.js'],
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'commonjs',
        globals: { module: 'readonly', require: 'readonly', exports: 'readonly', process: 'readonly', console: 'readonly', Buffer: 'readonly', __dirname: 'readonly', __filename: 'readonly' },
      },
      ...config,
    },
  ];
  let issues = 0;
  let parseErrors = 0;
  for (const { path, text } of sources) {
    const basename = path.split('/').pop();
    const messages = linter.verify(text, wrapped, { filename: basename });
    for (const m of messages) {
      if (m.fatal) parseErrors++;
      else issues++;
    }
  }
  return { issues, parseErrors };
}

async function bench(name, configFactory) {
  let config;
  try {
    config = await configFactory();
  } catch (e) {
    console.log(`  ${name}: SETUP-FAILED — ${e.message.split('\n')[0]}`);
    return null;
  }

  // Force GC if exposed (run with `node --expose-gc`).
  if (global.gc) global.gc();
  const memBefore = process.memoryUsage().heapUsed;

  // Warmup
  let counts;
  try {
    counts = lintAll(config);
  } catch (e) {
    console.log(`  ${name}: RUNTIME-FAILED — ${e.message.split('\n')[0]}`);
    return null;
  }

  const samples = [];
  let peakHeap = memBefore;
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    counts = lintAll(config);
    const t1 = performance.now();
    samples.push(t1 - t0);
    const after = process.memoryUsage().heapUsed;
    if (after > peakHeap) peakHeap = after;
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)];
  const perFile = median / files.length;
  const heapDelta = (peakHeap - memBefore) / 1024 / 1024;
  console.log(
    `  ${name.padEnd(40)}  median=${median.toFixed(1).padStart(7)} ms  per-file=${perFile.toFixed(2).padStart(5)} ms  Δheap=${heapDelta.toFixed(0).padStart(4)} MB  (issues=${counts.issues}, parse-err=${counts.parseErrors})`,
  );
  return { name, median, perFile, issues: counts.issues, parseErrors: counts.parseErrors, samples, heapDeltaMB: heapDelta };
}

// ----- Run the benches ------------------------------------------------------
console.log(`\nRunning ${RUNS} timed iterations per candidate (after 1 warmup)...\n`);

const results = [];

results.push(
  await bench('baseline (Linter, no rules)', async () => ({ rules: {} })),
);

results.push(
  await bench('Interlace (full security fleet)', setupInterlace),
);

const competitors = [
  // [bench-label, pkgName, prefix, rule-set-extractor]
  ['eslint-plugin-sonarjs', 'eslint-plugin-sonarjs', 'sonarjs', (p) => {
    const rec = p.configs?.recommended;
    if (Array.isArray(rec)) return rec.find((c) => c.rules)?.rules || {};
    return rec?.rules || {};
  }],
  ['eslint-plugin-no-secrets', 'eslint-plugin-no-secrets', 'no-secrets', () => ({
    'no-secrets/no-secrets': 'error',
  })],
  ['eslint-plugin-no-unsanitized', 'eslint-plugin-no-unsanitized', 'no-unsanitized', () => ({
    'no-unsanitized/method': 'error',
    'no-unsanitized/property': 'error',
  })],
  ['eslint-plugin-security-node', 'eslint-plugin-security-node', 'security-node', (p) => {
    const rec = p.configs?.recommended;
    return rec?.rules || {};
  }],
];

for (const [label, pkg, prefix, extractor] of competitors) {
  results.push(
    await bench(label, () => setupSinglePlugin(pkg, prefix, extractor)),
  );
}

// @microsoft/eslint-plugin-sdl — needs eslint-plugin-n co-registered (its
// recommended config references n/no-deprecated-api).
results.push(
  await bench('@microsoft/eslint-plugin-sdl', async () => {
    const plugin = await loadCompetitor('@microsoft/eslint-plugin-sdl');
    const nPlugin = await loadCompetitor('eslint-plugin-n');
    const rec = plugin.configs?.recommended;
    let rules = {};
    if (Array.isArray(rec)) {
      for (const c of rec) if (c.rules) Object.assign(rules, c.rules);
    } else if (rec?.rules) {
      rules = rec.rules;
    }
    return {
      plugins: { '@microsoft/sdl': plugin, n: nPlugin },
      rules,
    };
  }),
);

// eslint-plugin-security (the broken one — confirm it crashes)
results.push(
  await bench('eslint-plugin-security (broken on ESLint 9)', async () => {
    const plugin = await loadCompetitor('eslint-plugin-security');
    return {
      plugins: { security: plugin },
      rules: { 'security/detect-non-literal-regexp': 'error' },
    };
  }),
);

// ----- Summary --------------------------------------------------------------
console.log('\n--- Summary table ---');
console.log('analyzer'.padEnd(45), 'median(ms)'.padStart(12), 'ms/file'.padStart(10));
for (const r of results) {
  if (!r) continue;
  console.log(
    r.name.padEnd(45),
    r.median.toFixed(1).padStart(12),
    r.perFile.toFixed(2).padStart(10),
  );
}

// Persist results
import { writeFileSync } from 'node:fs';
const outPath = join(__dirname, '..', 'outputs', 'latency-bench-results.json');
writeFileSync(
  outPath,
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      methodology: { runs: RUNS, files: files.length, corpus: CORPUS_DIR },
      results,
    },
    null,
    2,
  ),
);
console.log(`\nWrote ${outPath}`);
