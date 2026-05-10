#!/usr/bin/env -S npx tsx
/**
 * ILB-Flagship runner — full-fidelity bench.
 *
 * For each (rule, repo) pair in manifest.json, captures:
 *   1. Latency  — cold + warm, ESLint (ours + competitor) + oxlint native
 *   2. Findings — file:line:message tuples (not just counts)
 *   3. Overlap  — set ops on findings between ours and competitor:
 *                 - bothCaught     (likely TP, no rule for us, but evidence)
 *                 - oursOnly       (we caught, they missed → either better recall or our FP)
 *                 - competitorOnly (they caught, we missed → either their better recall or their FP)
 *   4. Synthetic corpus precision/recall — for rules that have a CWE corpus,
 *      run against labeled fixtures to get true P/R/F1.
 *
 * On real OSS we cannot auto-classify FP vs FN without manual triage; the
 * overlap sets are the actionable evidence (read the messages).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUITE = __dirname;
const REPO_ROOT = resolve(SUITE, '../../..');
const OOS_DIR = process.env.ILB_OOS_DIR || resolve(REPO_ROOT, '..', 'oos');
const WORKSPACE = resolve(SUITE, 'workspace');
const CONFIGS = resolve(WORKSPACE, 'configs');
const RESULTS_DIR = resolve(REPO_ROOT, 'benchmarks/results/ilb-flagship');
const CACHE_DIR = resolve(SUITE, '.cache');
const CORPUS_DIR = resolve(REPO_ROOT, 'benchmarks/corpus');

mkdirSync(RESULTS_DIR, { recursive: true });
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(CONFIGS, { recursive: true });

const argv = parseArgs(process.argv.slice(2));
const manifest = JSON.parse(readFileSync(join(SUITE, 'manifest.json'), 'utf8'));

function parseArgs(args) {
  const out = {};
  for (const a of args) {
    const [k, v] = a.replace(/^--/, '').split('=');
    out[k] = v ?? true;
  }
  return out;
}

const ESLINT_BIN = resolve(WORKSPACE, 'node_modules/.bin/eslint');
const OXLINT_BIN = resolve(WORKSPACE, 'node_modules/.bin/oxlint');

if (!existsSync(ESLINT_BIN)) { console.error(`ESLint missing at ${ESLINT_BIN}.`); process.exit(2); }
if (!existsSync(OXLINT_BIN)) { console.error(`oxlint missing at ${OXLINT_BIN}.`); process.exit(2); }

function slug(id) { return id.replace(/[\/]/g, '-'); }

function writeESLintConfig(slugId, plugin, rule, options = []) {
  const file = join(CONFIGS, `${slugId}.${plugin}.eslint.config.mjs`);
  const ruleSlug = plugin.replace(/^eslint-plugin-/, '').replace(/^@.+\//, '');
  // Manifest can pass options like `[{ img: ['Image'] }]` so rule sees
  // custom components / framework wrappers. Without this the bench is
  // unrealistic for projects using next/image, Chakra <Image>, etc.
  const trailingOpts = options && options.length > 0
    ? ', ' + options.map((o) => JSON.stringify(o)).join(', ')
    : '';
  const body = `import plugin from '${plugin}';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**', '**/coverage/**', '**/*.min.js', '**/test/**', '**/__tests__/**', '**/*.test.*', '**/*.spec.*'],
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: { '${ruleSlug}': plugin.default ?? plugin },
    rules: {
      '${ruleSlug}/${rule}': ['error'${trailingOpts}],
    },
  },
];
`;
  writeFileSync(file, body);
  return file;
}

function writeOxlintConfig(slugId, ruleId) {
  const file = join(CONFIGS, `${slugId}.oxlintrc.json`);
  const plugin = ruleId.split('/')[0];
  const cfg = {
    plugins: [plugin],
    categories: { correctness: 'off', suspicious: 'off', pedantic: 'off', style: 'off', perf: 'off', restriction: 'off', nursery: 'off' },
    rules: { [ruleId]: 'error' },
  };
  writeFileSync(file, JSON.stringify(cfg, null, 2));
  return file;
}

function repoSourceGlobs(repoPath) {
  const candidates = ['packages', 'src', 'lib', 'apps', 'app', 'pages'];
  const found = candidates.filter((c) => existsSync(join(repoPath, c)));
  return found.length ? found.map((c) => `${c}/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}`) : ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'];
}

function repoSourceDirs(repoPath) {
  const candidates = ['packages', 'src', 'lib', 'apps', 'app', 'pages'];
  const found = candidates.filter((c) => existsSync(join(repoPath, c)));
  return found.length ? found : ['.'];
}

function timed(label, fn) {
  const t0 = performance.now();
  const result = fn();
  return { label, ms: Math.round(performance.now() - t0), ...result };
}

const REPEAT = Math.max(1, Number(argv.repeat) || 1);

/**
 * Wrap `timed` to run the function N times and return median + min + max +
 * the result from the median run. Findings are taken from the last run (they
 * are deterministic — same input produces same findings).
 *
 * Wilson Score interval would require a sample of independent observations,
 * which N back-to-back runs of the same input are not. We surface the spread
 * (min/max) and median; the SLO comparison should use the median.
 */
function timedN(label, fn) {
  if (REPEAT === 1) return timed(label, fn);
  const samples = [];
  let lastResult = null;
  for (let i = 0; i < REPEAT; i++) {
    const t0 = performance.now();
    const r = fn();
    const ms = Math.round(performance.now() - t0);
    samples.push(ms);
    lastResult = r;
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted.length % 2
    ? sorted[(sorted.length - 1) / 2]
    : Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2);
  return {
    label,
    ms: median,            // primary timing the scorecard reads
    msMedian: median,
    msMin: sorted[0],
    msMax: sorted[sorted.length - 1],
    msSamples: samples,
    repeats: REPEAT,
    ...lastResult,
  };
}

/**
 * Run ESLint and capture per-finding tuples {file, line, message}.
 * Returns also the timing of the whole run.
 */
function runEslintCapture({ configPath, repoPath, cacheFile, rulePrefix }) {
  const globs = repoSourceGlobs(repoPath);
  const args = [
    '--no-warn-ignored', '--no-config-lookup', '--config', configPath,
    ...(cacheFile ? ['--cache', '--cache-location', cacheFile] : ['--no-cache']),
    '-f', 'json',
    ...globs,
  ];
  const res = spawnSync(ESLINT_BIN, args, {
    cwd: repoPath, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' },
  });
  let findings = [];
  let filesProcessed = 0;
  if (res.stdout) {
    try {
      const json = JSON.parse(res.stdout);
      filesProcessed = json.length;
      for (const f of json) {
        for (const m of (f.messages || [])) {
          // Keep ONLY findings whose ruleId starts with our prefix.
          // ruleId=null = ESLint core (parser errors, unused-disable-directive, etc.) → exclude.
          if (!m.ruleId) continue;
          if (rulePrefix && !m.ruleId.startsWith(rulePrefix)) continue;
          findings.push({
            file: relative(repoPath, f.filePath),
            line: m.line,
            column: m.column,
            ruleId: m.ruleId,
            message: (m.message || '').slice(0, 280),
          });
        }
      }
    } catch (e) {
      return { exitCode: res.status, findings: [], filesProcessed: 0, parseError: String(e).slice(0, 200), stderrTail: (res.stderr || '').slice(-300) };
    }
  }
  return { exitCode: res.status, findings, filesProcessed, stderrTail: (res.stderr || '').slice(-300) };
}

function runOxlintCapture({ configPath, repoPath, ruleId }) {
  const dirs = repoSourceDirs(repoPath);
  const args = ['--config', configPath, '-f', 'json', ...dirs];
  const res = spawnSync(OXLINT_BIN, args, { cwd: repoPath, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  let findings = [];
  let totalDiagnostics = 0;
  if (res.stdout) {
    try {
      const json = JSON.parse(res.stdout);
      const diags = json.diagnostics || [];
      totalDiagnostics = diags.length;
      const ruleSuffix = ruleId.split('/')[1];
      for (const d of diags) {
        const code = String(d.code || '');
        if (!code.includes(`(${ruleSuffix})`)) continue;
        const span = (d.labels && d.labels[0] && d.labels[0].span) || {};
        findings.push({
          file: d.filename,
          line: span.line,
          column: span.column,
          ruleId: code,
          message: (d.message || '').slice(0, 280),
        });
      }
    } catch {}
  }
  return { exitCode: res.status, findings, totalDiagnostics, stderrTail: (res.stderr || '').slice(-300) };
}

function findingsKey(f) {
  return `${f.file}::${f.line}`;
}

function setOps(oursFindings, theirsFindings) {
  const oursSet = new Map(oursFindings.map((f) => [findingsKey(f), f]));
  const theirsSet = new Map(theirsFindings.map((f) => [findingsKey(f), f]));
  const both = [];
  const oursOnly = [];
  const theirsOnly = [];
  for (const [k, v] of oursSet) {
    if (theirsSet.has(k)) both.push(v); else oursOnly.push(v);
  }
  for (const [k, v] of theirsSet) {
    if (!oursSet.has(k)) theirsOnly.push(v);
  }
  return {
    counts: { both: both.length, oursOnly: oursOnly.length, theirsOnly: theirsOnly.length },
    samples: {
      both: both.slice(0, 5),
      oursOnly: oursOnly.slice(0, 5),
      theirsOnly: theirsOnly.slice(0, 5),
    },
  };
}

/** Map flagship rule → CWE corpus directory if one exists. */
function corpusForRule(ruleId) {
  // Mapping is intentionally narrow — only flagship rules with labeled corpora.
  const map = {
    'pg/no-unsafe-query': 'CWE-089',
    'secure-coding/no-hardcoded-credentials': 'CWE-798',
  };
  return map[ruleId] || null;
}

/**
 * Run a rule against a synthetic corpus directory and compute
 * {tp, fp, fn, tn, precision, recall, f1}. Each fixture is one test case;
 * the rule must fire on `vulnerable/*` (TP) and stay silent on `safe/*` (TN).
 */
function runCorpus({ rule, plugin, ruleSlug, corpusDir }) {
  const cfg = writeESLintConfig(`corpus-${slug(rule)}`, plugin, ruleSlug);
  const vulnerableDir = join(corpusDir, 'vulnerable');
  const safeDir = join(corpusDir, 'safe');
  if (!existsSync(vulnerableDir) || !existsSync(safeDir)) return null;

  function runOnDir(dir) {
    const files = readdirSync(dir).filter((f) => /\.(js|ts|tsx|mjs|cjs)$/.test(f));
    const results = [];
    for (const file of files) {
      const filePath = join(dir, file);
      const res = spawnSync(ESLINT_BIN, ['--no-config-lookup', '--config', cfg, '--no-cache', '-f', 'json', filePath], { encoding: 'utf8' });
      try {
        const json = JSON.parse(res.stdout);
        const findings = json[0]?.messages?.length || 0;
        results.push({ file, findings });
      } catch {
        results.push({ file, findings: -1, error: true });
      }
    }
    return results;
  }
  const v = runOnDir(vulnerableDir);
  const s = runOnDir(safeDir);
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const r of v) (r.findings > 0 ? tp++ : fn++);
  for (const r of s) (r.findings > 0 ? fp++ : tn++);
  const precision = (tp + fp) === 0 ? null : tp / (tp + fp);
  const recall = (tp + fn) === 0 ? null : tp / (tp + fn);
  const f1 = (precision && recall) ? 2 * precision * recall / (precision + recall) : null;
  return {
    corpus: corpusDir,
    fixtures: { vulnerable: v, safe: s },
    confusion: { tp, fp, fn, tn },
    precision, recall, f1,
  };
}

function repoHead(repoPath) {
  const r = spawnSync('git', ['-C', repoPath, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  return (r.stdout || '').trim();
}

async function runOne(rule) {
  const slugId = slug(rule.id);
  const repoPath = join(OOS_DIR, rule.repo);
  if (!existsSync(repoPath)) return { rule: rule.id, skipped: 'repo not cloned', repoPath };

  const result = {
    rule: rule.id, repo: rule.repo, repoHead: repoHead(repoPath),
    starsK: rule.starsK, tier: rule.tier,
    runs: {},
    overlap: null,
    corpus: null,
  };

  // 1) Ours via ESLint, cold + warm with capture
  // Cold runs use --no-cache so each repeat in `timedN` is genuinely uncached.
  // Warm runs share a single cache file populated by an initial priming run.
  {
    const cfg = writeESLintConfig(slugId, rule.ours.plugin, rule.ours.rule, rule.ruleOptions);
    const cache = join(CACHE_DIR, `${slugId}.ours.eslintcache`);
    if (existsSync(cache)) rmSync(cache);
    const rulePrefix = rule.ours.plugin.replace(/^eslint-plugin-/, '').replace(/^@.+\//, '') + '/';
    const cold = timedN('cold', () => runEslintCapture({ configPath: cfg, repoPath, cacheFile: null, rulePrefix }));
    // Prime the warm cache with a single throwaway run, then measure.
    runEslintCapture({ configPath: cfg, repoPath, cacheFile: cache, rulePrefix });
    const warm = timedN('warm', () => runEslintCapture({ configPath: cfg, repoPath, cacheFile: cache, rulePrefix }));
    result.runs.oursEslint = {
      cold: { ms: cold.ms, msMin: cold.msMin, msMax: cold.msMax, repeats: cold.repeats ?? 1, exitCode: cold.exitCode, filesProcessed: cold.filesProcessed, findingsCount: cold.findings.length, findings: cold.findings },
      warm: { ms: warm.ms, msMin: warm.msMin, msMax: warm.msMax, repeats: warm.repeats ?? 1, exitCode: warm.exitCode, findingsCount: warm.findings.length },
    };
    const spread = REPEAT > 1 ? ` (${cold.msMin}…${cold.msMax})` : '';
    console.log(`  ours/eslint  cold=${cold.ms}ms${spread} findings=${cold.findings.length}  warm=${warm.ms}ms`);
  }

  // 2) Competitor via ESLint with capture
  if (rule.competitor) {
    const cfg = writeESLintConfig(slugId, rule.competitor.plugin, rule.competitor.rule, rule.competitorRuleOptions);
    const cache = join(CACHE_DIR, `${slugId}.competitor.eslintcache`);
    if (existsSync(cache)) rmSync(cache);
    const rulePrefix = rule.competitor.plugin.replace(/^eslint-plugin-/, '').replace(/^@.+\//, '') + '/';
    const cold = timedN('cold', () => runEslintCapture({ configPath: cfg, repoPath, cacheFile: null, rulePrefix }));
    runEslintCapture({ configPath: cfg, repoPath, cacheFile: cache, rulePrefix });
    const warm = timedN('warm', () => runEslintCapture({ configPath: cfg, repoPath, cacheFile: cache, rulePrefix }));
    result.runs.competitorEslint = {
      cold: { ms: cold.ms, msMin: cold.msMin, msMax: cold.msMax, repeats: cold.repeats ?? 1, exitCode: cold.exitCode, filesProcessed: cold.filesProcessed, findingsCount: cold.findings.length, findings: cold.findings },
      warm: { ms: warm.ms, msMin: warm.msMin, msMax: warm.msMax, repeats: warm.repeats ?? 1, exitCode: warm.exitCode, findingsCount: warm.findings.length },
    };
    const spread = REPEAT > 1 ? ` (${cold.msMin}…${cold.msMax})` : '';
    console.log(`  comp/eslint  cold=${cold.ms}ms${spread} findings=${cold.findings.length}  warm=${warm.ms}ms`);

    // Overlap on findings (file:line keying)
    result.overlap = setOps(result.runs.oursEslint.cold.findings, cold.findings);
    console.log(`  overlap      both=${result.overlap.counts.both} oursOnly=${result.overlap.counts.oursOnly} theirsOnly=${result.overlap.counts.theirsOnly}`);
  }

  // 3) oxlint native, cold + warm with capture
  if (rule.oxlintNative) {
    const cfg = writeOxlintConfig(slugId, rule.oxlintNative);
    const cold = timedN('cold', () => runOxlintCapture({ configPath: cfg, repoPath, ruleId: rule.oxlintNative }));
    const warm = timedN('warm', () => runOxlintCapture({ configPath: cfg, repoPath, ruleId: rule.oxlintNative }));
    result.runs.oxlintNative = {
      cold: { ms: cold.ms, msMin: cold.msMin, msMax: cold.msMax, repeats: cold.repeats ?? 1, findingsCount: cold.findings.length, findings: cold.findings },
      warm: { ms: warm.ms, msMin: warm.msMin, msMax: warm.msMax, repeats: warm.repeats ?? 1, findingsCount: warm.findings.length },
    };
    const spread = REPEAT > 1 ? ` (${cold.msMin}…${cold.msMax})` : '';
    console.log(`  oxlint native cold=${cold.ms}ms${spread} findings=${cold.findings.length}  warm=${warm.ms}ms`);
  }

  // 4) Synthetic corpus (if applicable)
  const cwe = corpusForRule(rule.id);
  if (cwe) {
    const corpusDir = join(CORPUS_DIR, cwe);
    if (existsSync(corpusDir)) {
      const ours = runCorpus({ rule: rule.id, plugin: rule.ours.plugin, ruleSlug: rule.ours.rule, corpusDir });
      const comp = rule.competitor ? runCorpus({ rule: rule.id + '-competitor', plugin: rule.competitor.plugin, ruleSlug: rule.competitor.rule, corpusDir }) : null;
      result.corpus = { cwe, ours, competitor: comp };
      const fmt = (r) => r ? `P=${(r.precision ?? 0).toFixed(2)} R=${(r.recall ?? 0).toFixed(2)} F1=${(r.f1 ?? 0).toFixed(2)} (TP=${r.confusion.tp} FP=${r.confusion.fp} FN=${r.confusion.fn} TN=${r.confusion.tn})` : '—';
      console.log(`  corpus       ours: ${fmt(ours)}`);
      if (comp) console.log(`  corpus       comp: ${fmt(comp)}`);
    }
  }

  return result;
}

async function main() {
  const onlyRule = argv.rule;
  const repoOverride = argv.repo;
  const rules = manifest.rules
    .filter((r) => !onlyRule || r.id === onlyRule)
    .map((r) => repoOverride ? { ...r, repo: repoOverride, starsK: r.starsK, tier: r.tier } : r);
  if (rules.length === 0) { console.error('No rules matched.'); process.exit(1); }

  console.log(`ILB-Flagship v2 — ${rules.length} rule(s) against OOS at ${OOS_DIR}\n`);
  const out = {
    schema: 'ilb-flagship/v2',
    runAt: new Date().toISOString(),
    workspace: WORKSPACE,
    oosDir: OOS_DIR,
    eslintVersion: spawnSync(ESLINT_BIN, ['--version'], { encoding: 'utf8' }).stdout?.trim(),
    oxlintVersion: spawnSync(OXLINT_BIN, ['--version'], { encoding: 'utf8' }).stdout?.trim(),
    nodeVersion: process.version,
    results: [],
  };

  for (const rule of rules) {
    console.log(`▶ ${rule.id}  on ${rule.repo} (${rule.starsK}K⭐ ${rule.tier})`);
    out.results.push(await runOne(rule));
  }

  const date = new Date().toISOString().slice(0, 10);
  const file = join(RESULTS_DIR, `${date}.json`);
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${file}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
