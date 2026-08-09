#!/usr/bin/env -S npx tsx
/**
 * ILB-Headline — the "esbuild chart" bench.
 *
 * esbuild's landing page headlines ONE number: the time to production-bundle
 * 10 copies of three.js, same job, every bundler. It is legible because every
 * bar does identical work.
 *
 * ILB-Flagship measures ONE RULE at a time — correct for per-rule attribution,
 * wrong for a headline: nobody runs one rule. This suite measures the job a
 * user actually runs: **a full recommended-config lint of one real repo**,
 * across three stacks.
 *
 * Honesty rules baked in (a headline number is the easiest place to lie):
 *
 *  1. SAME FILE SET. Every stack lints the same explicit glob. oxlint is not
 *     allowed to look fast by silently skipping files ESLint parsed, so we
 *     record filesProcessed per stack and mark the row `comparable: false`
 *     when they diverge beyond a tolerance.
 *  2. SAME JOB, NOT SAME RULE COUNT. Each stack runs its own recommended
 *     preset. We record rule counts so a reader can see what the time bought.
 *     A stack running 3 rules is not "faster" than one running 300.
 *  3. MEDIAN OF N, plus min/max. Single-shot latency on a warm page cache is
 *     noise. Default --repeat=5.
 *  4. DISCARDED WARMUP. The first run pays for cold FS + JIT; it is timed and
 *     reported separately, never folded into the median.
 *  5. EXIT CODES RECORDED. ESLint exits 1 when it reports findings — that is
 *     success. A crash (exit 2, or a JSON parse failure) must never be timed
 *     as a fast run; those rows are marked `ok: false` and excluded from the
 *     headline.
 *
 * Usage:
 *   npx tsx benchmarks/suites/ilb-headline/run.ts --repo=three.js --repeat=5
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { MATCHUPS, UNCONTESTED } from './matchups.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUITE = __dirname;
const REPO_ROOT = resolve(SUITE, '../../..');
const OOS_DIR = process.env.ILB_OOS_DIR || resolve(REPO_ROOT, '..', 'oos');
// Reuse the flagship workspace: it already pins eslint 9.x, oxlint, our
// plugins AND the competitor plugins at known versions. A second install
// would let the two suites drift apart silently.
const WORKSPACE = resolve(REPO_ROOT, 'benchmarks/suites/ilb-flagship/workspace');
const CONFIGS = resolve(SUITE, '.configs');
const CACHE_DIR = resolve(SUITE, '.cache');
const RESULTS_DIR = resolve(REPO_ROOT, 'benchmarks/results/ilb-headline');

const ESLINT_BIN = resolve(WORKSPACE, 'node_modules/.bin/eslint');
const OXLINT_BIN = resolve(WORKSPACE, 'node_modules/.bin/oxlint');

for (const [label, bin] of [['eslint', ESLINT_BIN], ['oxlint', OXLINT_BIN]] as const) {
  if (!existsSync(bin)) {
    console.error(`${label} missing at ${bin} — run \`npm install\` in ${WORKSPACE}`);
    process.exit(2);
  }
}

const argv: Record<string, string | true> = {};
for (const a of process.argv.slice(2)) {
  const [k, v] = a.replace(/^--/, '').split('=');
  argv[k] = v ?? true;
}

const REPO = String(argv.repo || 'three.js');
const REPEAT = Math.max(1, Number(argv.repeat) || 5);
const repoPath = resolve(OOS_DIR, REPO);

if (!existsSync(repoPath)) {
  console.error(`Repo not found: ${repoPath}`);
  process.exit(2);
}

mkdirSync(CONFIGS, { recursive: true });
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(RESULTS_DIR, { recursive: true });

// The one glob every stack lints. Explicit, not per-tool defaults — default
// discovery differs between ESLint and oxlint and would silently compare
// different file sets.
//
// Discovered per repo, never hardcoded: `src/` is a three.js/next.js
// convention, but lodash keeps sources at the repo root and shadcn-ui uses
// `apps/`. A hardcoded `src/**` silently matched ZERO files on lodash, and
// every stack "failed fast" — which is precisely how a benchmark reports an
// impossibly good number. Pick the first candidate that actually contains
// lintable files, and fail loudly if none do.
// Ordered most-specific → least. A bare '*.js' is NOT a candidate: on nestjs
// it matched exactly one root config file, both ESLint stacks "agreed" on 1
// file, and parity reported YES — a green benchmark measuring nothing.
// Every candidate must be a source TREE, and the winner must clear MIN_FILES.
const GLOB_CANDIDATES = [
  'src/**/*.{js,jsx,ts,tsx,mjs,cjs}',
  'packages/*/src/**/*.{js,jsx,ts,tsx,mjs,cjs}',
  'packages/**/*.{js,jsx,ts,tsx,mjs,cjs}',
  'lib/**/*.{js,jsx,ts,tsx,mjs,cjs}',
  'apps/**/*.{js,jsx,ts,tsx,mjs,cjs}',
];

// A headline benchmark over a handful of files measures process startup, not
// linting. Below this, refuse rather than publish a meaningless number.
const MIN_FILES = 50;

function countMatches(glob: string): number {
  // Use ESLint itself to resolve the glob — guarantees the count reflects the
  // exact file set the bench will lint, rather than a shell glob that differs.
  //
  // `files:` is REQUIRED. Without it ESLint 9 treats .ts/.tsx as unmatched and
  // reports "all files are ignored" — nestjs read as 0 files and the bench fell
  // back to a 1-file root glob. `ignores: []` overrides the target repo's own
  // .gitignore rules (nestjs gitignores `packages/**/*.js`); we are measuring a
  // source tree, not honouring a repo's build-artifact policy.
  const probe = join(CONFIGS, 'probe.eslint.config.mjs');
  writeFileSync(
    probe,
    "export default [{ files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'], ignores: [], rules: {} }];\n",
  );
  const res = spawnSync(
    ESLINT_BIN,
    ['--no-warn-ignored', '--no-config-lookup', '--config', probe, '-f', 'json', glob],
    { cwd: repoPath, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 },
  );
  try {
    return JSON.parse(res.stdout || '[]').length;
  } catch {
    return 0;
  }
}

function resolveGlob(): string {
  if (typeof argv.glob === 'string') return argv.glob;
  // Pick the candidate matching the MOST files, not the first that matches
  // anything — "first non-zero" silently settled for a 1-file root glob.
  let best = { glob: '', n: 0 };
  for (const candidate of GLOB_CANDIDATES) {
    const n = countMatches(candidate);
    if (n > best.n) best = { glob: candidate, n };
  }
  if (best.n < MIN_FILES) {
    console.error(
      `Best glob for ${REPO} matched only ${best.n} file(s) (minimum ${MIN_FILES}).\n` +
      `Pass --glob=<pattern> explicitly. Refusing to run: a benchmark over a\n` +
      `handful of files measures process startup, not linting.`,
    );
    process.exit(2);
  }
  console.log(`  glob: ${best.glob} → ${best.n} files`);
  return best.glob;
}

function version(bin: string): string {
  const r = spawnSync(bin, ['--version'], { encoding: 'utf8' });
  return (r.stdout || '').trim().replace(/^Version:\s*/, '');
}

// The benchmark scope is the four SDK-AGNOSTIC plugins. These are the ones
// that genuinely compete: a team choosing security linting picks between
// eslint-plugin-secure-coding and eslint-plugin-no-secrets/regexp, and between
// import-next and eslint-plugin-import. The framework-bound plugins (pg, jwt,
// nestjs-security, mongodb-security…) have no comparable competitor, so a
// "win" there would be uncontested by construction and worth nothing to a
// reader deciding what to install.
const FILES_GLOB = "['**/*.{js,jsx,ts,tsx,mjs,cjs}']";
const SHARED_IGNORES = "['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.d.ts']";

/** Our four SDK-agnostic plugins, recommended presets. */
function oursConfig(): string {
  const file = join(CONFIGS, 'ours.eslint.config.mjs');
  writeFileSync(file, `
import secureCoding from 'eslint-plugin-secure-coding';
import nodeSecurity from 'eslint-plugin-node-security';
import browserSecurity from 'eslint-plugin-browser-security';
import importNext from 'eslint-plugin-import-next';

// \`files\` is required: without it ESLint 9 leaves .ts/.tsx unmatched and
// reports "all files are ignored", which silently benches zero files.
const base = { files: ${FILES_GLOB} };

export default [
  { ignores: ${SHARED_IGNORES} },
  { ...base, ...(secureCoding.configs?.recommended ?? {}) },
  { ...base, ...(nodeSecurity.configs?.recommended ?? {}) },
  { ...base, ...(browserSecurity.configs?.recommended ?? {}) },
  { ...base, ...(importNext.configs?.recommended ?? {}) },
];
`.trimStart());
  return file;
}

/**
 * The community stack a team would otherwise install for the SAME jobs:
 *   secure-coding / node-security / browser-security → no-secrets + regexp
 *   import-next                                       → eslint-plugin-import
 *
 * Emitted BOTH combined and per-plugin. A single anonymous "community" bar
 * hides who is actually being compared and lets a reader assume we cherry-
 * picked a weak opponent; naming each one — and showing its own time and rule
 * count — is what makes the comparison checkable.
 */
const COMPETITOR_BLOCKS: Record<string, string> = {
  'no-secrets': `
import noSecrets from 'eslint-plugin-no-secrets';
const base = { files: ${FILES_GLOB} };
export default [
  { ignores: ${SHARED_IGNORES} },
  { ...base, plugins: { 'no-secrets': noSecrets }, rules: { 'no-secrets/no-secrets': 'error' } },
];
`,
  // eslint-plugin-security is the de-facto standard Node security plugin
  // (the one most teams reach for) — the honest rival to node-security and
  // secure-coding. Omitting it and comparing only against no-secrets would
  // have been picking a weak opponent.
  security: `
import security from 'eslint-plugin-security';
const base = { files: ${FILES_GLOB} };
export default [
  { ignores: ${SHARED_IGNORES} },
  { ...base, ...(security.configs?.recommended ?? {}) },
];
`,
  // Mozilla's plugin — the real competitor for DOM/XSS sink detection,
  // i.e. what browser-security does.
  'no-unsanitized': `
import noUnsanitized from 'eslint-plugin-no-unsanitized';
const base = { files: ${FILES_GLOB} };
export default [
  { ignores: ${SHARED_IGNORES} },
  { ...base, plugins: { 'no-unsanitized': noUnsanitized },
    rules: { 'no-unsanitized/method': 'error', 'no-unsanitized/property': 'error' } },
];
`,
  regexp: `
import regexp from 'eslint-plugin-regexp';
const base = { files: ${FILES_GLOB} };
export default [
  { ignores: ${SHARED_IGNORES} },
  { ...base, ...(regexp.configs?.['flat/recommended'] ?? {}) },
];
`,
  import: `
import importPlugin from 'eslint-plugin-import';
const base = { files: ${FILES_GLOB} };
export default [
  { ignores: ${SHARED_IGNORES} },
  {
    ...base,
    plugins: { import: importPlugin },
    rules: {
      'import/no-cycle': 'error',
      'import/no-unresolved': 'off',
      'import/named': 'error',
      'import/export': 'error',
    },
  },
];
`,
};

function competitorConfig(): string {
  const file = join(CONFIGS, 'competitor.eslint.config.mjs');
  writeFileSync(file, `
import noSecrets from 'eslint-plugin-no-secrets';
import security from 'eslint-plugin-security';
import noUnsanitized from 'eslint-plugin-no-unsanitized';
import regexp from 'eslint-plugin-regexp';
import importPlugin from 'eslint-plugin-import';

const base = { files: ${FILES_GLOB} };

export default [
  { ignores: ${SHARED_IGNORES} },
  { ...base, plugins: { 'no-secrets': noSecrets }, rules: { 'no-secrets/no-secrets': 'error' } },
  { ...base, ...(security.configs?.recommended ?? {}) },
  { ...base, plugins: { 'no-unsanitized': noUnsanitized },
    rules: { 'no-unsanitized/method': 'error', 'no-unsanitized/property': 'error' } },
  { ...base, ...(regexp.configs?.['flat/recommended'] ?? {}) },
  {
    ...base,
    plugins: { import: importPlugin },
    rules: {
      'import/no-cycle': 'error',
      'import/no-unresolved': 'off',
      'import/named': 'error',
      'import/export': 'error',
    },
  },
];
`.trimStart());
  return file;
}

/** One config per individual competitor plugin. */
function competitorSoloConfig(name: string): string {
  const file = join(CONFIGS, `competitor-${name}.eslint.config.mjs`);
  writeFileSync(file, COMPETITOR_BLOCKS[name].trimStart());
  return file;
}

/** Stock oxlint — the engine's own built-in rules. NOT ours. */
function oxlintConfig(): string {
  const file = join(CONFIGS, 'oxlint.json');
  writeFileSync(file, JSON.stringify({
    plugins: ['react', 'jsx-a11y', 'oxc'],
    categories: { correctness: 'error', suspicious: 'error' },
    ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  }, null, 2));
  return file;
}

/**
 * OUR rules on the oxlint engine, via the JS-plugin shims in
 * tools/oxlint-plugins/. Same four SDK-agnostic plugins as the ESLint row,
 * so this bar isolates the ENGINE while holding the rules constant — which
 * is the only way to read "how much of oxlint's speed can our users get".
 *
 * Requires the plugins to be built (`turbo run build --filter=eslint-plugin-*`);
 * the shims load from each package's dist/.
 */
function oursOxlintConfig(): string | null {
  const shimDir = resolve(REPO_ROOT, 'tools/oxlint-plugins');
  const shims = [
    'interlace-secure-coding.cjs',
    'interlace-node-security.cjs',
    'interlace-browser-security.cjs',
    'interlace-import-next.cjs',
  ].map((f) => join(shimDir, f));

  const missing = shims.filter((s) => !existsSync(s));
  if (missing.length) {
    console.warn(`  our-oxlint: skipped, missing shims: ${missing.join(', ')}`);
    return null;
  }

  const file = join(CONFIGS, 'ours-oxlint.json');
  writeFileSync(file, JSON.stringify({
    // No `categories`: we want OUR rules measured, not oxlint's built-ins
    // stacked on top, or the row would not be comparable to the ESLint one.
    jsPlugins: shims.map((specifier, i) => ({
      name: ['interlace-secure-coding', 'interlace-node-security',
             'interlace-browser-security', 'interlace-import-next'][i],
      specifier,
    })),
    ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  }, null, 2));
  return file;
}

type Run = {
  ms: number;
  exitCode: number | null;
  filesProcessed: number;
  findings: number;
  ok: boolean;
  note?: string;
};

function runESLint(configPath: string, cacheFile: string | null, timing = false): Run {
  const args = [
    '--no-warn-ignored', '--no-config-lookup', '--config', configPath,
    ...(cacheFile ? ['--cache', '--cache-location', cacheFile] : ['--no-cache']),
    '-f', 'json', GLOB,
  ];
  const t0 = performance.now();
  const res = spawnSync(ESLINT_BIN, args, {
    cwd: repoPath, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024,
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=8192',
      // TIMING=all makes ESLint report per-rule cost. Only set on a dedicated
      // profiling pass — it adds overhead, so it must never contaminate a
      // timed measurement run.
      ...(timing ? { TIMING: 'all' } : {}),
    },
  });
  const ms = performance.now() - t0;
  // ESLint: 0 = clean, 1 = findings reported (still a valid run), 2 = fatal.
  let filesProcessed = 0, findings = 0, ok = res.status === 0 || res.status === 1;
  let note: string | undefined;
  try {
    const json = JSON.parse(res.stdout || '[]');
    filesProcessed = json.length;
    // Count only RULE findings. `ruleId: null` is a parse/syntax error, not a
    // detection — including those made every per-job config report the same
    // ~689 "findings" (the repo's TS parse errors), which would have published
    // an identical findings number for rules that found nothing at all.
    for (const f of json) {
      for (const msg of f.messages || []) {
        if (msg.ruleId) findings++;
      }
    }
  } catch (e) {
    ok = false;
    note = `stdout parse failed: ${String(e).slice(0, 120)} | stderr: ${(res.stderr || '').slice(-200)}`;
  }
  if (!ok && !note) note = `exit ${res.status}: ${(res.stderr || '').slice(-200)}`;
  // TIMING=all writes its table to stderr; carried out for the profiling pass.
  return {
    ms, exitCode: res.status, filesProcessed, findings, ok, note,
    ...(timing ? { timingOutput: res.stderr ?? '' } : {}),
  } as Run;
}

/**
 * oxlint takes DIRECTORY paths, not brace globs — handed `lib/**\/*.{js,ts}`
 * it prints "No files found to lint" and exits 0, which parsed as a
 * successful zero-work run: the fastest possible bar, measuring nothing.
 * Derive the directory root from the glob so both engines walk the same tree,
 * and let its own `number_of_files` prove parity afterwards.
 */
function globRoot(glob: string): string {
  const dir = glob.split('/').filter((seg) => !seg.includes('*'))[0];
  return dir || '.';
}

function runOxlint(configPath: string): Run {
  const args = ['--config', configPath, '-f', 'json', globRoot(GLOB)];
  const t0 = performance.now();
  const res = spawnSync(OXLINT_BIN, args, {
    cwd: repoPath, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024,
  });
  const ms = performance.now() - t0;
  let filesProcessed = 0, findings = 0, ok = res.status === 0 || res.status === 1;
  let note: string | undefined;
  try {
    const json = JSON.parse(res.stdout || '{}');
    findings = (json.diagnostics || []).length;
    // oxlint reports the files it actually read in its summary when available.
    filesProcessed = json.number_of_files ?? json.numberOfFiles ?? 0;
    // Zero files is never a valid measurement — it is the "instant" run that
    // makes a benchmark look spectacular while doing nothing.
    if (filesProcessed === 0) {
      ok = false;
      note = 'oxlint linted 0 files — path/glob mismatch, not a fast run';
    }
  } catch (e) {
    ok = false;
    note = `stdout parse failed: ${String(e).slice(0, 120)} | stderr: ${(res.stderr || '').slice(-200)}`;
  }
  if (!ok && !note) note = `exit ${res.status}: ${(res.stderr || '').slice(-200)}`;
  return { ms, exitCode: res.status, filesProcessed, findings, ok, note };
}

function stats(samples: number[]) {
  const s = [...samples].sort((a, b) => a - b);
  const median = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  return { median, min: s[0], max: s[s.length - 1], samples };
}

/** Warmup (discarded from the median) + N timed repeats. */
function measure(label: string, fn: () => Run) {
  process.stdout.write(`  ${label}: warmup…`);
  const warmup = fn();
  if (!warmup.ok) {
    process.stdout.write(` FAILED (${warmup.note})\n`);
    return { ok: false as const, warmupMs: warmup.ms, note: warmup.note, exitCode: warmup.exitCode };
  }
  const samples: number[] = [];
  let last = warmup;
  for (let i = 0; i < REPEAT; i++) {
    const r = fn();
    if (!r.ok) {
      process.stdout.write(` FAILED on repeat ${i + 1} (${r.note})\n`);
      return { ok: false as const, warmupMs: warmup.ms, note: r.note, exitCode: r.exitCode };
    }
    samples.push(r.ms);
    last = r;
    process.stdout.write(` ${Math.round(r.ms)}ms`);
  }
  const st = stats(samples);
  process.stdout.write(` → median ${Math.round(st.median)}ms\n`);
  return {
    ok: true as const,
    warmupMs: warmup.ms,
    ...st,
    exitCode: last.exitCode,
    filesProcessed: last.filesProcessed,
    findings: last.findings,
  };
}

console.log(`\nILB-Headline — ${REPO}, repeat=${REPEAT}`);
const GLOB = resolveGlob();
console.log('');

const oursCfg = oursConfig();
const compCfg = competitorConfig();
const oxCfg = oxlintConfig();

const oursCache = join(CACHE_DIR, 'ours.cache');
const compCache = join(CACHE_DIR, 'competitor.cache');
for (const f of [oursCache, compCache]) if (existsSync(f)) rmSync(f);

const oursOxCfg = oursOxlintConfig();

console.log('Cold (--no-cache):');
const oursCold = measure('ours (eslint)   ', () => runESLint(oursCfg, null));
const oursOxCold = oursOxCfg
  ? measure('ours (oxlint)   ', () => runOxlint(oursOxCfg))
  : { ok: false as const, note: 'shims missing — build the plugins first' };
const compCold = measure('competitor      ', () => runESLint(compCfg, null));
const oxCold = measure('oxlint (stock)  ', () => runOxlint(oxCfg));

// Warm matters more than cold for the stack a team actually lives with: CI
// and editors run against a populated cache, so this is the number a
// developer feels on every save. Both engines get a primed cache.
console.log('\nWarm (--cache, primed):');
runESLint(oursCfg, oursCache); // prime
const oursWarm = measure('ours (eslint)   ', () => runESLint(oursCfg, oursCache));
const oursOxWarm = oursOxCfg
  ? measure('ours (oxlint)   ', () => runOxlint(oursOxCfg))
  : { ok: false as const, note: 'shims missing — build the plugins first' };
runESLint(compCfg, compCache); // prime
const compWarm = measure('competitor      ', () => runESLint(compCfg, compCache));
const oxWarm = measure('oxlint (stock)  ', () => runOxlint(oxCfg));

/**
 * Profiling pass — how much work each stack actually did.
 *
 * A latency bar alone is misleading: a stack running 1 rule will always beat
 * one running 87, and the reader cannot see that from a chart. This captures
 * rule counts and the slowest/fastest rule per stack so "faster" can be read
 * as "faster WHILE doing more", which is the only version of the claim that
 * means anything.
 *
 * Run once per stack, outside the timed loop (TIMING=all adds overhead).
 */
function profileESLint(configPath: string): {
  rulesExecuted: number;
  slowest: { rule: string; ms: number }[];
  fastest: { rule: string; ms: number }[];
} | null {
  const res = runESLint(configPath, null, true);
  const out = (res as any).timingOutput as string | undefined;
  if (!out) return null;
  // ESLint's TIMING=all table: "rule-name | time (ms) | relative"
  const entries: { rule: string; ms: number }[] = [];
  for (const line of out.split('\n')) {
    const m = line.match(/^\s*([\w@/-]+)\s*\|\s*([\d.]+)\s*\|/);
    if (m && m[1] !== 'Rule') entries.push({ rule: m[1], ms: Number(m[2]) });
  }
  if (!entries.length) return null;
  entries.sort((a, b) => b.ms - a.ms);
  return {
    rulesExecuted: entries.length,
    slowest: entries.slice(0, 3),
    fastest: entries.slice(-3).reverse(),
  };
}

/**
 * Static rule inventory — what each plugin SHIPS, not just what ran.
 *
 * Reported PER PLUGIN, not as one combined "competitor" number. A single
 * total hides the actual claim: no individual competitor covers what one of
 * our plugins does, and a reader choosing a package installs one plugin at a
 * time, not an aggregate.
 *
 * Uses createRequire: this file is ESM, so bare `require` is not defined —
 * the first attempt silently returned 0 rules for every plugin and reported
 * "0 rules shipped" as though that were a finding.
 */
const requireCJS = createRequire(import.meta.url);

type PluginInventory = {
  plugin: string;
  npm: string;
  side: 'ours' | 'competitor';
  total: number;
  enabled: number;
};

function ruleInventory(): PluginInventory[] {
  const out: PluginInventory[] = [];
  const add = (
    side: 'ours' | 'competitor',
    plugin: string,
    npm: string,
    spec: string,
  ) => {
    let m: any = null;
    try { m = requireCJS(spec); } catch (e) {
      console.warn(`  inventory: could not load ${npm} (${String(e).slice(0, 80)})`);
      return;
    }
    // Prefer whichever of {module, module.default} actually carries `rules`.
    // Our packages expose a `default` that is NOT the plugin object, so a
    // plain `m.default ?? m` picked an empty shell and reported 0 rules.
    const mod =
      Object.keys(m?.rules ?? {}).length > 0 ? m
      : Object.keys(m?.default?.rules ?? {}).length > 0 ? m.default
      : (m?.default ?? m);
    const total = Object.keys(mod?.rules ?? {}).length;
    const rec =
      mod?.configs?.recommended ??
      mod?.configs?.['flat/recommended'] ??
      mod?.flatConfigs?.recommended;
    // Flat configs come as either a bare object or an array of blocks, and the
    // rules can sit on any block. Summing across all of them is the only shape
    // that works for both; picking `rec[0].rules` reported 0 for every one of
    // our plugins because their block order differs from the competitors'.
    const blocks = Array.isArray(rec) ? rec : rec ? [rec] : [];
    const enabled = blocks.reduce(
      (n: number, b: any) => n + Object.keys(b?.rules ?? {}).length,
      0,
    );
    out.push({ plugin, npm, side, total, enabled });
  };

  const pkg = (n: string) => resolve(REPO_ROOT, `packages/eslint-plugin-${n}/dist/src/index.js`);
  add('ours', 'secure-coding', 'eslint-plugin-secure-coding', pkg('secure-coding'));
  add('ours', 'node-security', 'eslint-plugin-node-security', pkg('node-security'));
  add('ours', 'browser-security', 'eslint-plugin-browser-security', pkg('browser-security'));
  add('ours', 'import-next', 'eslint-plugin-import-next', pkg('import-next'));

  const wsPkg = (n: string) => resolve(WORKSPACE, 'node_modules', n);
  add('competitor', 'no-secrets', 'eslint-plugin-no-secrets', wsPkg('eslint-plugin-no-secrets'));
  add('competitor', 'security', 'eslint-plugin-security', wsPkg('eslint-plugin-security'));
  add('competitor', 'no-unsanitized', 'eslint-plugin-no-unsanitized', wsPkg('eslint-plugin-no-unsanitized'));
  add('competitor', 'regexp', 'eslint-plugin-regexp', wsPkg('eslint-plugin-regexp'));
  add('competitor', 'import', 'eslint-plugin-import', wsPkg('eslint-plugin-import'));
  return out;
}

// ── Per-competitor head-to-head ───────────────────────────────────────
// Each named competitor measured alone, so a reader sees WHO is in the
// comparison and how each one performs — not one anonymous aggregate bar.
console.log('\nPer-competitor (each plugin alone):');
const soloResults: Record<string, unknown> = {};
for (const name of Object.keys(COMPETITOR_BLOCKS)) {
  const cfg = competitorSoloConfig(name);
  const cold = measure(`  ${name.padEnd(12)}`, () => runESLint(cfg, null));
  soloResults[name] = { cold, npm: `eslint-plugin-${name}` };
}

// ── Per-JOB head-to-head (the apples-to-apples core) ──────────────────
// For each job in the verified matchup table, run ONLY our rules for that
// job, then ONLY theirs, on the same files. This is the comparison that can
// actually be defended: same capability, same corpus, named rules on both
// sides. Aggregate plugin timings can never show this — a plugin bundles
// jobs its rival does not have, so any whole-plugin delta is partly a
// difference in scope rather than a difference in speed.
function jobConfig(side: 'ours' | 'theirs', idx: number, rules: string[]): string | null {
  if (!rules.length) return null;
  const file = join(CONFIGS, `job-${idx}-${side}.eslint.config.mjs`);

  if (side === 'ours') {
    const byPlugin = new Map<string, string[]>();
    for (const id of rules) {
      const [plugin, ...rest] = id.split('/');
      byPlugin.set(plugin, [...(byPlugin.get(plugin) ?? []), rest.join('/')]);
    }
    const imports = [...byPlugin.keys()]
      .map((p, i) => `import p${i} from 'eslint-plugin-${p}';`).join('\n');
    const plugins = [...byPlugin.keys()]
      .map((p, i) => `'${p}': p${i}`).join(', ');
    const ruleEntries = [...byPlugin.entries()]
      .flatMap(([p, rs]) => rs.map((r) => `'${p}/${r}': 'error'`)).join(', ');
    writeFileSync(file, `${imports}
export default [
  { ignores: ${SHARED_IGNORES} },
  { files: ${FILES_GLOB}, plugins: { ${plugins} }, rules: { ${ruleEntries} } },
];
`);
    return file;
  }

  const byPkg = new Map<string, string[]>();
  for (const id of rules) {
    const [pkg, rule] = id.split(':');
    byPkg.set(pkg, [...(byPkg.get(pkg) ?? []), rule]);
  }
  const names = [...byPkg.keys()];
  const imports = names.map((p, i) => `import q${i} from '${p}';`).join('\n');
  // Plugin namespace as ESLint expects it: strip the eslint-plugin- prefix,
  // keep the scope for scoped packages (@microsoft/sdl).
  const ns = (pkg: string) =>
    pkg.startsWith('@')
      ? `${pkg.split('/')[0]}/${pkg.split('/')[1].replace(/^eslint-plugin-/, '')}`
      : pkg.replace(/^eslint-plugin-/, '');
  const plugins = names.map((p, i) => `'${ns(p)}': q${i}`).join(', ');
  const ruleEntries = [...byPkg.entries()]
    .flatMap(([p, rs]) => rs.map((r) => `'${ns(p)}/${r}': 'error'`)).join(', ');
  writeFileSync(file, `${imports}
export default [
  { ignores: ${SHARED_IGNORES} },
  { files: ${FILES_GLOB}, plugins: { ${plugins} }, rules: { ${ruleEntries} } },
];
`);
  return file;
}

console.log('\nPer-job head-to-head (same capability, named rules both sides):');
const jobResults: any[] = [];
for (const [i, m] of MATCHUPS.entries()) {
  const oursCfgJob = jobConfig('ours', i, m.ours);
  const theirsCfgJob = jobConfig('theirs', i, m.theirs);

  const o = oursCfgJob ? runESLint(oursCfgJob, null) : null;
  const t = theirsCfgJob ? runESLint(theirsCfgJob, null) : null;

  jobResults.push({
    job: m.job,
    category: m.category,
    note: m.note,
    ours: {
      rules: m.ours, ruleCount: m.ours.length,
      ms: o?.ok ? o.ms : null, findings: o?.ok ? o.findings : null,
      ok: !!o?.ok, note: o?.ok ? undefined : o?.note,
    },
    theirs: {
      rules: m.theirs, ruleCount: m.theirs.length,
      ms: t?.ok ? t.ms : null, findings: t?.ok ? t.findings : null,
      // A job with no competitor rules is UNCONTESTED, not a win — recorded
      // distinctly so nothing downstream can render it as beating someone.
      ok: m.theirs.length === 0 ? null : !!t?.ok,
      note: m.theirs.length === 0 ? 'no comparable community rule' : (t?.ok ? undefined : t?.note),
    },
  });

  const fmtCell = (r: any) =>
    r.ms == null ? (r.note ?? 'n/a').slice(0, 22) : `${Math.round(r.ms)}ms/${r.findings}f`;
  const last = jobResults[jobResults.length - 1];
  console.log(
    `  ${m.job.slice(0, 42).padEnd(43)} ` +
    `ours ${String(last.ours.ruleCount).padStart(2)}r ${fmtCell(last.ours).padStart(14)} | ` +
    `theirs ${String(last.theirs.ruleCount).padStart(2)}r ${fmtCell(last.theirs)}`,
  );
}

console.log('\nProfiling (rule counts + per-rule cost)…');
const inventory = ruleInventory();
const oursProfile = profileESLint(oursCfg);
const compProfile = profileESLint(compCfg);
for (const p of inventory) {
  console.log(
    `  ${p.side === 'ours' ? '→' : ' '} ${p.npm.padEnd(34)} ` +
    `${String(p.total).padStart(3)} rules, ${String(p.enabled).padStart(3)} enabled`,
  );
}
const oursTotal = inventory.filter((p) => p.side === 'ours')
  .reduce((s, p) => s + p.total, 0);
const compTotal = inventory.filter((p) => p.side === 'competitor')
  .reduce((s, p) => s + p.total, 0);
console.log(`  ours: ${oursTotal} rules across 4 plugins · competitor: ${compTotal} across 3`);

// Same-file-set check: the headline is only honest if every stack saw the
// same work. oxlint does not always report a file count; when it is 0 we
// record `unknown` rather than silently asserting parity.
const oursFiles = oursCold.ok ? oursCold.filesProcessed : 0;
const compFiles = compCold.ok ? compCold.filesProcessed : 0;
const oxFiles = oxCold.ok ? oxCold.filesProcessed : 0;
const eslintParity = oursFiles > 0 && oursFiles === compFiles;
// oxlint walks directories, ESLint expands the glob — a large divergence means
// they measured different trees. On nestjs this read 1714 vs 1 while the two
// ESLint stacks happily "agreed" at 1, so ESLint-only parity is not sufficient
// evidence that the run is comparable.
const oxParity = oxFiles > 0 ? Math.abs(oxFiles - oursFiles) / oursFiles < 0.05 : null;
if (oxParity === false) {
  console.warn(
    `\nWARNING: oxlint linted ${oxFiles} files but ESLint linted ${oursFiles}. ` +
    `The engines did not see the same tree — the oxlint bar is not comparable.`,
  );
}

const date = new Date().toISOString().slice(0, 10);
const out = {
  schema: 'ilb-headline/v1',
  generatedAt: new Date().toISOString(),
  repo: REPO,
  glob: GLOB,
  repeat: REPEAT,
  versions: {
    eslint: version(ESLINT_BIN),
    oxlint: version(OXLINT_BIN),
    node: process.version,
  },
  fileSet: {
    ours: oursFiles,
    competitor: compFiles,
    oxlint: oxFiles || null,
    eslintParity,
    oxlintParity: oxParity,
    comparable: eslintParity,
  },
  // Four stacks. `ours` and `oursOxlint` run the SAME four rulesets on
  // different engines; `competitor` and `oxlintStock` are the alternatives a
  // team would otherwise pick.
  stacks: {
    ours: { cold: oursCold, warm: oursWarm },
    oursOxlint: { cold: oursOxCold, warm: oursOxWarm },
    competitor: { cold: compCold, warm: compWarm },
    oxlintNative: { cold: oxCold, warm: oxWarm },
  },
  // Work done, not just time taken. Without this a reader cannot tell whether
  // a fast bar means "efficient" or "barely checked anything".
  coverage: {
    // Per-plugin, each with its npm name so every row can link to the package
    // it describes. Aggregates are derived downstream, never stored — a stored
    // total is a number that can silently disagree with its own parts.
    plugins: inventory,
    profile: { ours: oursProfile, competitor: compProfile },
  },
  // Each competitor measured alone + which of our plugins it actually
  // competes with. Named, not aggregated: a reader can verify the matchup
  // and check we did not pick a weak opponent.
  competitors: soloResults,
  // Job-level matchups, imported from the VERIFIED table. Never inlined here:
  // a second hand-written copy drifts from the one CI checks, and the copy
  // that ships would be the unverified one.
  matchups: MATCHUPS,
  uncontested: UNCONTESTED,
  // Per-job head-to-head: our rules vs theirs, on the SAME job, measured.
  jobResults,
  scope: {
    plugins: ['secure-coding', 'node-security', 'browser-security', 'import-next'],
    // Stated in the artifact so the caveat travels with the number: these are
    // the platform/SDK-agnostic plugins, the only ones with real competitors.
    rationale:
      'Only SDK-agnostic plugins are benchmarked. Framework-bound plugins ' +
      '(pg, jwt, nestjs-security, mongodb-security, lambda-security, ' +
      'vercel-ai-security, express-security) have no comparable competitor — ' +
      'benchmarking them would be an uncontested win worth nothing to a reader.',
  },
};

// Repo in the filename: the weekly job runs several repos on the same day,
// and a bare `<date>.json` meant the second run silently DESTROYED the first.
const outFile = join(RESULTS_DIR, `${date}-${REPO}.json`);
writeFileSync(outFile, JSON.stringify(out, null, 2));

console.log(`\nFile set — ours: ${oursFiles}, competitor: ${compFiles}, oxlint: ${oxFiles || 'unreported'}`);
console.log(`ESLint-stack parity: ${eslintParity ? 'YES' : 'NO — rows not comparable'}`);
console.log(`Wrote ${outFile}\n`);

if (!eslintParity) {
  console.warn('WARNING: the two ESLint stacks did not lint the same number of files.');
  console.warn('The headline number is NOT publishable until this is reconciled.');
}
