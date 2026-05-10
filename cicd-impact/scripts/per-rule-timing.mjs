#!/usr/bin/env node
/**
 * Per-rule TIMING attribution for Interlace plugins.
 *
 * Wraps each rule's `create` function with a timing harness so we can attribute
 * total lint time to specific rules. Identifies the N hottest rules — the
 * targets a plugin author should optimise first.
 *
 * Run with the same loader/shim setup as latency-bench.mjs:
 *   node --require ./cicd-impact/scripts/cjs-resolve-shim.cjs \
 *        --experimental-loader ./cicd-impact/scripts/loader-hook.mjs \
 *        ./cicd-impact/scripts/per-rule-timing.mjs
 *
 * Env: CORPUS=<dir> (default node_modules/lodash)
 *      RUNS=<n> (default 1 — TIMING runs are slower)
 *      TOP_N=<n> (default 20)
 */

import { Linter } from 'eslint';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../..');

const CORPUS_DIR = process.env.CORPUS
  ? resolve(REPO_ROOT, process.env.CORPUS)
  : join(REPO_ROOT, 'node_modules/lodash');
const TOP_N = parseInt(process.env.TOP_N || '20', 10);
const RUNS = parseInt(process.env.RUNS || '1', 10);

// ----- Corpus walk ----------------------------------------------------------
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

// ----- Load Interlace plugins from built dist ------------------------------
const interlacePlugins = [
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

const interlaceDistPath = (pkgName) =>
  pathToFileURL(join(REPO_ROOT, `packages/${pkgName}/dist/src/index.js`)).href;

const plugins = {};
const allRules = []; // [{ ruleId: 'prefix/rule-name', meta, create }]
for (const [prefix, pkg] of interlacePlugins) {
  const mod = await import(interlaceDistPath(pkg));
  const plugin = mod.default || mod;
  plugins[prefix] = plugin;
  for (const [ruleName, ruleDef] of Object.entries(plugin.rules || {})) {
    allRules.push({
      ruleId: `${prefix}/${ruleName}`,
      meta: ruleDef.meta,
      create: ruleDef.create,
    });
  }
}
console.log(`Loaded ${allRules.length} rules across ${interlacePlugins.length} plugins`);

// ----- Instrument every rule's create with timing --------------------------
// We accumulate two metrics per rule: total ms and number of times its
// listeners fired (rough proxy for AST-node-visit count).
const ruleStats = new Map(); // ruleId -> { totalMs, listenerCalls, ruleId }
for (const r of allRules) {
  ruleStats.set(r.ruleId, { ruleId: r.ruleId, totalMs: 0, listenerCalls: 0 });
}

function instrumentPlugin(plugin, prefix) {
  const newRules = {};
  for (const [ruleName, ruleDef] of Object.entries(plugin.rules || {})) {
    const ruleId = `${prefix}/${ruleName}`;
    const stats = ruleStats.get(ruleId);
    newRules[ruleName] = {
      ...ruleDef,
      create(context) {
        const listeners = ruleDef.create(context);
        const wrapped = {};
        for (const [selector, fn] of Object.entries(listeners)) {
          if (typeof fn !== 'function') {
            wrapped[selector] = fn;
            continue;
          }
          wrapped[selector] = function instrumented(...args) {
            const t0 = performance.now();
            try {
              return fn.apply(this, args);
            } finally {
              stats.totalMs += performance.now() - t0;
              stats.listenerCalls += 1;
            }
          };
        }
        return wrapped;
      },
    };
  }
  return { ...plugin, rules: newRules };
}

const instrumented = {};
const rulesConfig = {};
for (const [prefix, pkg] of interlacePlugins) {
  instrumented[prefix] = instrumentPlugin(plugins[prefix], prefix);
  // Enable every rule with severity "error" so all rules participate.
  for (const ruleName of Object.keys(plugins[prefix].rules || {})) {
    rulesConfig[`${prefix}/${ruleName}`] = 'error';
  }
}

const config = {
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs',
    globals: { module: 'readonly', require: 'readonly', exports: 'readonly', process: 'readonly', console: 'readonly', Buffer: 'readonly', __dirname: 'readonly', __filename: 'readonly' },
  },
  plugins: instrumented,
  rules: rulesConfig,
};

// ----- Run -----------------------------------------------------------------
const linter = new Linter();
const wrapped = [{ files: ['**/*.js'], ...config }];

console.log(`\nRunning ${RUNS} pass(es) with all ${allRules.length} rules enabled...`);
let totalLintMs = 0;
for (let r = 0; r < RUNS; r++) {
  const t0 = performance.now();
  for (const { path, text } of sources) {
    const basename = path.split('/').pop();
    linter.verify(text, wrapped, { filename: basename });
  }
  totalLintMs += performance.now() - t0;
}
console.log(`Total lint time across all runs: ${totalLintMs.toFixed(0)} ms`);

// ----- Report --------------------------------------------------------------
const ranked = [...ruleStats.values()]
  .filter((s) => s.totalMs > 0 || s.listenerCalls > 0)
  .sort((a, b) => b.totalMs - a.totalMs);

const totalRuleMs = ranked.reduce((sum, r) => sum + r.totalMs, 0);

console.log(`\nRules that fired: ${ranked.length}/${allRules.length}`);
console.log(`Total rule-time: ${totalRuleMs.toFixed(0)} ms (${((totalRuleMs / totalLintMs) * 100).toFixed(1)}% of total lint)`);
console.log(`\n--- Top ${TOP_N} hottest rules ---`);
console.log('rank  rule_id'.padEnd(60) + ' total_ms  listener_calls   share_of_rule_time');
for (let i = 0; i < Math.min(TOP_N, ranked.length); i++) {
  const r = ranked[i];
  const share = ((r.totalMs / totalRuleMs) * 100).toFixed(1);
  console.log(
    `${String(i + 1).padStart(3)}.  ${r.ruleId.padEnd(50)} ${r.totalMs.toFixed(1).padStart(7)} ms  ${String(r.listenerCalls).padStart(8)}  ${share.padStart(6)}%`,
  );
}

// ----- Persist -------------------------------------------------------------
const outPath = join(__dirname, '..', 'outputs', 'per-rule-timing.json');
writeFileSync(
  outPath,
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      corpus: CORPUS_DIR,
      file_count: files.length,
      runs: RUNS,
      total_lint_ms: totalLintMs,
      total_rule_ms: totalRuleMs,
      ranked,
    },
    null,
    2,
  ),
);
console.log(`\nWrote ${outPath}`);
