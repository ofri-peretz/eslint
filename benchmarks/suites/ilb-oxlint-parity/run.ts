#!/usr/bin/env -S npx tsx
/**
 * ILB-Oxlint-Parity — finding-level parity between ESLint and oxlint+JS plugins.
 *
 * For each fixture in the corpus, lint twice (ESLint via the bench config,
 * oxlint via a generated config that loads our shims), normalize both outputs
 * to (file, rule, line, column) tuples, and report parity. Known-divergent
 * rules live in allowlist.json with a reason and introduction date.
 *
 * Usage:
 *   tsx benchmarks/suites/ilb-oxlint-parity/run.ts
 *   tsx benchmarks/suites/ilb-oxlint-parity/run.ts --corpus benchmarks/corpus/CWE-798
 *   tsx benchmarks/suites/ilb-oxlint-parity/run.ts --ci --threshold 0.95
 *
 * Prerequisite: `npx turbo run build` — shims require dist/.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const RESULTS_DIR = path.join(REPO_ROOT, 'benchmarks', 'results', 'ilb-oxlint-parity');
const MANIFEST_PATH = path.join(REPO_ROOT, '.agent', 'oxlint-jsplugins-manifest.json');
const ALLOWLIST_PATH = path.join(HERE, 'allowlist.json');
const CACHE_PATH = path.join(REPO_ROOT, '.agent', 'oxlint-parity-cache.json');

const ARG = (flag, fallback = null) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const CORPUS = path.resolve(ARG('--corpus', path.join(REPO_ROOT, 'benchmarks', 'corpus', 'CWE-089')));
const ESLINT_CONFIG = ARG('--config', path.join(REPO_ROOT, 'eslint.benchmark.config.mjs'));
const CI = process.argv.includes('--ci');
const CACHED = process.argv.includes('--cached');
const THRESHOLD = Number.parseFloat(ARG('--threshold', '0.95'));

// Plugins enabled in oxlint must match what the ESLint config loads, otherwise
// oxlint reports findings ESLint never sees and parity collapses to noise.
// Default mirrors eslint.benchmark.config.mjs (security plugins).
const PLUGINS_DEFAULT = [
  'secure-coding', 'node-security', 'pg', 'crypto', 'express-security',
  'browser-security', 'jwt', 'mongodb-security', 'nestjs-security',
  'lambda-security', 'vercel-ai-security',
];
const PLUGINS = (ARG('--plugins', PLUGINS_DEFAULT.join(',')) || '')
  .split(',').map(s => s.trim()).filter(Boolean);

// ── Build a parity oxlint config from the manifest ───────────────────

// Load the actual rule keys from each shim. The audit's per-rule list maps to
// source-file paths, which sometimes diverge from the plugin's registered rule
// names (e.g. nested-category layouts). The shim is the source of truth.
function loadPluginRules(shimAbs) {
  // require() drops cache so multiple plugins don't share patched module state.
  const cachePath = require.resolve(shimAbs);
  delete require.cache[cachePath];
  const plugin = require(shimAbs);
  const rulesObj = plugin.rules ?? plugin.default?.rules ?? {};
  return Object.keys(rulesObj);
}

function buildOxlintConfig() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`✗ manifest missing: ${path.relative(process.cwd(), MANIFEST_PATH)}`);
    console.error(`  run: npm run oxlint:shims`);
    process.exit(2);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

  const jsPlugins = [];
  const rules = {};

  const allowedShorts = new Set(PLUGINS);

  for (const p of manifest.plugins) {
    if (p.ruleCount === 0) continue;
    if (!allowedShorts.has(p.short)) continue;
    const shimAbs = path.join(REPO_ROOT, p.shim);
    if (!fs.existsSync(shimAbs)) continue;

    let actualRuleNames;
    try {
      actualRuleNames = loadPluginRules(shimAbs);
    } catch (err) {
      console.warn(`  ⚠️  skipping ${p.short}: ${err.message}`);
      continue;
    }
    if (actualRuleNames.length === 0) continue;

    // Absolute path: oxlint resolves the specifier relative to the config file,
    // and we write the config to benchmarks/results/, not the repo root.
    jsPlugins.push({ name: `interlace-${p.short}`, specifier: shimAbs });

    for (const ruleName of actualRuleNames) {
      rules[`interlace-${p.short}/${ruleName}`] = 'error';
    }
  }

  return {
    // Disable oxlint's built-in plugins so its baseline rules (no-unused-vars,
    // etc.) don't show up as `oxlintOnly` noise in parity.
    plugins: [],
    categories: {
      correctness: 'off',
      suspicious: 'off',
      perf: 'off',
      pedantic: 'off',
      style: 'off',
      restriction: 'off',
      nursery: 'off',
    },
    jsPlugins,
    rules,
    ignorePatterns: ['node_modules', 'dist'],
  };
}

// ── Lint runners ──────────────────────────────────────────────────────

function lintEslint(corpus, configPath) {
  const cmd = `npx tsx ./node_modules/eslint/bin/eslint.js --no-error-on-unmatched-pattern --format json --config "${configPath}" "${corpus}"`;
  let raw = '';
  try {
    raw = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    raw = err.stdout?.toString() ?? '';
    if (!raw) throw err;
  }
  const results = JSON.parse(raw);
  // Filter ESLint output to the same plugin set we activate in oxlint.
  // The benchmark ESLint config loads every security plugin, but oxlint may
  // only have a subset enabled — without this filter, plugin-set drift
  // produces false `eslintOnly` divergences that aren't really parity issues.
  const allowedPrefixes = PLUGINS.map(p => `${p}/`);
  const findings = [];
  for (const r of results) {
    const rel = path.relative(REPO_ROOT, r.filePath).split(path.sep).join('/');
    for (const m of r.messages ?? []) {
      if (!m.ruleId) continue; // skip parse errors
      if (!allowedPrefixes.some(prefix => m.ruleId.startsWith(prefix))) continue;
      findings.push({ file: rel, rule: m.ruleId, line: m.line ?? 0, column: m.column ?? 0 });
    }
  }
  return findings;
}

function lintOxlint(corpus, configPath) {
  const cmd = `npx oxlint --config "${configPath}" --format json "${corpus}"`;
  let raw = '';
  try {
    raw = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    raw = err.stdout?.toString() ?? '';
    if (!raw) throw err;
  }
  // oxlint --format json emits a single JSON object with `diagnostics[]`.
  // Each diagnostic's rule lives in `code` as `<source>(<rule>)`.
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return []; }
  const diags = parsed.diagnostics ?? [];
  const findings = [];
  for (const d of diags) {
    const m = (d.code ?? '').match(/^([^(]+)\(([^)]+)\)$/);
    if (!m) continue;
    const [, source, ruleName] = m;
    // Map oxlint's `interlace-pg` source back to ESLint's `pg/<rule>` namespace.
    const ruleId = source.startsWith('interlace-')
      ? `${source.slice('interlace-'.length)}/${ruleName}`
      : `${source}/${ruleName}`;
    const filename = d.filename ?? '';
    const rel = path.relative(REPO_ROOT, path.resolve(REPO_ROOT, filename)).split(path.sep).join('/');
    const label = (d.labels ?? [])[0]?.span ?? {};
    findings.push({ file: rel, rule: ruleId, line: label.line ?? 0, column: label.column ?? 0 });
  }
  return findings;
}

// ── Diff + allowlist ──────────────────────────────────────────────────

function key(f) { return `${f.file}::${f.rule}::${f.line}::${f.column}`; }

function diff(eslintFindings, oxlintFindings) {
  const eSet = new Set(eslintFindings.map(key));
  const oSet = new Set(oxlintFindings.map(key));
  const eslintOnly = eslintFindings.filter(f => !oSet.has(key(f)));
  const oxlintOnly = oxlintFindings.filter(f => !eSet.has(key(f)));
  const sharedKeys = [...eSet].filter(k => oSet.has(k));
  return { shared: sharedKeys.length, eslintOnly, oxlintOnly };
}

function applyAllowlist(diffResult) {
  const allowlist = fs.existsSync(ALLOWLIST_PATH)
    ? JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf-8'))
    : { eslintOnly: [], oxlintOnly: [] };

  const matches = (entry, finding) => new RegExp(entry.rulePattern).test(finding.rule);

  const eUnexplained = diffResult.eslintOnly.filter(f => !allowlist.eslintOnly.some(e => matches(e, f)));
  const oUnexplained = diffResult.oxlintOnly.filter(f => !allowlist.oxlintOnly.some(e => matches(e, f)));

  return {
    eslintOnlyAllowlisted: diffResult.eslintOnly.length - eUnexplained.length,
    oxlintOnlyAllowlisted: diffResult.oxlintOnly.length - oUnexplained.length,
    eUnexplained,
    oUnexplained,
  };
}

// ── Cache key ─────────────────────────────────────────────────────────

// Compute a cache key that captures everything that could change parity:
//   - every plugin's source index + every rule file (the plugin behavior)
//   - oxlint runtime bundle hashes (the linter behavior)
//   - the corpus contents (what we lint)
//   - the active plugin set (PLUGINS) and threshold
//
// If this hash matches a cached pass, --cached mode skips the bench. CI mode
// (`--ci`) ignores the cache and always runs.
function computeCacheKey() {
  const h = crypto.createHash('sha256');
  // Plugin sources
  for (const short of [...PLUGINS].sort()) {
    const pkgDir = path.join(REPO_ROOT, 'packages', `eslint-plugin-${short}`, 'src');
    if (!fs.existsSync(pkgDir)) continue;
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(full));
        else if (e.isFile() && e.name.endsWith('.ts') && !/\.(test|spec)\.ts$/.test(e.name)) out.push(full);
      }
      return out;
    };
    for (const f of walk(pkgDir).sort()) {
      h.update(`${short}/${path.relative(pkgDir, f)}\n`);
      h.update(fs.readFileSync(f));
    }
  }
  // Oxlint runtime bundles
  for (const f of ['plugins.js', 'plugins-dev.js', 'lint.js', 'bindings.js']) {
    const full = path.join(REPO_ROOT, 'node_modules', 'oxlint', 'dist', f);
    if (fs.existsSync(full)) h.update(fs.readFileSync(full));
  }
  // Corpus
  if (fs.existsSync(CORPUS)) {
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(full));
        else if (e.isFile() && /\.(js|ts|jsx|tsx)$/.test(e.name)) out.push(full);
      }
      return out;
    };
    const stat = fs.statSync(CORPUS);
    const files = stat.isDirectory() ? walk(CORPUS).sort() : [CORPUS];
    for (const f of files) {
      h.update(`fixture:${path.relative(REPO_ROOT, f)}\n`);
      h.update(fs.readFileSync(f));
    }
  }
  // Plugin set + threshold
  h.update(JSON.stringify({ PLUGINS: [...PLUGINS].sort(), THRESHOLD }));
  return h.digest('hex');
}

function readCache() {
  if (!fs.existsSync(CACHE_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')); }
  catch { return {}; }
}

function writeCache(cache: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n');
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  console.log(`ILB-Oxlint-Parity v1.0 · corpus=${path.relative(REPO_ROOT, CORPUS)}`);
  console.log('');

  // Cache fast-path: skip the bench if a previous run with the same inputs
  // already passed. CI mode always runs (cache is local-dev convenience).
  if (CACHED && !CI) {
    const cacheKey = computeCacheKey();
    const cache = readCache();
    if (cache[cacheKey]?.status === 'pass') {
      const when = cache[cacheKey].at ?? '?';
      console.log(`  ✅ cache hit (passed ${when}) — skipping bench.`);
      console.log(`     key: ${cacheKey.slice(0, 16)}…`);
      console.log('');
      process.exit(0);
    }
    console.log(`  cache miss — running bench (key: ${cacheKey.slice(0, 16)}…)`);
    console.log('');
  }

  const distOk = fs.existsSync(path.join(REPO_ROOT, 'packages', 'eslint-plugin-pg', 'dist', 'src', 'index.js'));
  if (!distOk) {
    if (CACHED && !CI) {
      // Soft-skip in --cached mode (typically wired into `quality` for local
      // dev). Without dist, the bench can't run, but failing quality on a
      // fresh clone is more annoying than useful — the GH workflow runs
      // parity unconditionally on every PR.
      console.log('  ⚠ dist/ missing and cache miss — skipping bench.');
      console.log('     run: npx turbo run build && npm run ilb:oxlint-parity');
      console.log('     or:  rely on the GH Actions oxlint-parity workflow');
      console.log('');
      process.exit(0);
    }
    console.error('✗ dist/ missing — shims require built plugins.');
    console.error('  run: npx turbo run build');
    process.exit(2);
  }

  // Generate the parity oxlint config in a temp location.
  const tmpConfig = path.join(RESULTS_DIR, '.parity.oxlintrc.json');
  fs.writeFileSync(tmpConfig, JSON.stringify(buildOxlintConfig(), null, 2) + '\n');

  console.log('  Running ESLint... ');
  const eslintFindings = lintEslint(CORPUS, ESLINT_CONFIG);
  console.log(`    ${eslintFindings.length} finding(s)`);

  console.log('  Running oxlint+shims... ');
  const oxlintFindings = lintOxlint(CORPUS, tmpConfig);
  console.log(`    ${oxlintFindings.length} finding(s)`);

  const d = diff(eslintFindings, oxlintFindings);
  const allow = applyAllowlist(d);

  const total = d.shared + d.eslintOnly.length + d.oxlintOnly.length;
  const parityRate = total === 0 ? 1.0 : d.shared / total;

  const envelope = {
    suite: 'ilb-oxlint-parity',
    version: '1.0',
    runAt: new Date().toISOString(),
    corpus: path.relative(REPO_ROOT, CORPUS),
    eslintFindings: eslintFindings.length,
    oxlintFindings: oxlintFindings.length,
    shared: d.shared,
    eslintOnly: d.eslintOnly.length,
    oxlintOnly: d.oxlintOnly.length,
    parityRate: Number(parityRate.toFixed(4)),
    eslintOnlyAllowlisted: allow.eslintOnlyAllowlisted,
    oxlintOnlyAllowlisted: allow.oxlintOnlyAllowlisted,
    eslintOnlyUnexplained: allow.eUnexplained,
    oxlintOnlyUnexplained: allow.oUnexplained,
  };

  const outPath = path.join(RESULTS_DIR, `${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(outPath, JSON.stringify(envelope, null, 2) + '\n');

  console.log('');
  console.log(`  shared:               ${d.shared}`);
  console.log(`  eslint-only:          ${d.eslintOnly.length} (${allow.eslintOnlyAllowlisted} allowlisted)`);
  console.log(`  oxlint-only:          ${d.oxlintOnly.length} (${allow.oxlintOnlyAllowlisted} allowlisted)`);
  console.log(`  parity rate:          ${(parityRate * 100).toFixed(1)}%`);
  console.log(`  envelope:             ${path.relative(REPO_ROOT, outPath)}`);
  console.log('');

  if (allow.eUnexplained.length > 0) {
    console.log('  ✗ Unexplained eslint-only findings (oxlint missed these — not in allowlist):');
    for (const f of allow.eUnexplained.slice(0, 20)) {
      console.log(`     - ${f.file}:${f.line}  ${f.rule}`);
    }
    if (allow.eUnexplained.length > 20) console.log(`     ... and ${allow.eUnexplained.length - 20} more`);
    console.log('');
  }
  if (allow.oUnexplained.length > 0) {
    console.log('  ✗ Unexplained oxlint-only findings (oxlint over-reported — not in allowlist):');
    for (const f of allow.oUnexplained.slice(0, 20)) {
      console.log(`     - ${f.file}:${f.line}  ${f.rule}`);
    }
    if (allow.oUnexplained.length > 20) console.log(`     ... and ${allow.oUnexplained.length - 20} more`);
    console.log('');
  }

  const passed =
    allow.eUnexplained.length === 0 &&
    allow.oUnexplained.length === 0 &&
    parityRate >= THRESHOLD;

  // Update cache on every run so subsequent --cached invocations can short-
  // circuit. We always write (pass or fail) so a previously-failing key
  // doesn't get cached as passing if the bench wasn't re-run.
  if (CACHED || !CI) {
    const cacheKey = computeCacheKey();
    const cache = readCache();
    cache[cacheKey] = {
      status: passed ? 'pass' : 'fail',
      at: new Date().toISOString().slice(0, 10),
      shared: d.shared,
      eslintOnly: d.eslintOnly.length,
      oxlintOnly: d.oxlintOnly.length,
      parityRate,
    };
    // Trim cache to the last 50 entries to keep the file tidy.
    const entries = Object.entries(cache).sort((a: any, b: any) => (b[1].at ?? '').localeCompare(a[1].at ?? '')).slice(0, 50);
    writeCache(Object.fromEntries(entries));
  }

  if (CI) {
    if (allow.eUnexplained.length > 0 || allow.oUnexplained.length > 0) {
      console.log(`  ✗ FAIL — unexplained divergence not in allowlist.`);
      process.exit(1);
    }
    if (parityRate < THRESHOLD) {
      console.log(`  ✗ FAIL — parity rate ${(parityRate * 100).toFixed(1)}% below threshold ${(THRESHOLD * 100).toFixed(0)}%`);
      process.exit(1);
    }
    console.log('  ✅ PASS');
  }
}

main();
