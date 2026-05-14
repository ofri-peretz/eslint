/**
 * ilb-perf-import-nestjs — head-to-head no-cycle benchmark.
 *
 * Lints the same TS file set from the nestjs OSS corpus with two configs:
 *   - eslint-plugin-import         (no-cycle)
 *   - eslint-plugin-import-next    (no-cycle)
 *
 * Reports wall-clock (median of 3 timed + 1 warmup, with CV), per-rule cost
 * from TIMING=all, peak RSS (per-worker process.resourceUsage().maxRSS),
 * and a detection-parity gate (cycle-count diff must be ≤5%).
 *
 * Worker pattern mirrors scripts/ilb-wild.ts: a generated TS file loads the
 * plugin config and invokes the ESLint Node API, printing one JSON line to
 * stdout. TIMING=all is forwarded via env; the resulting rule-time table is
 * parsed from stderr (sometimes stdout in ESLint v9).
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';
import { cloneRepo, resolveBenchDir } from '../../lib/clone-repo';

const SUITE_DIR = path.dirname(fileURLToPath(import.meta.url));
const BENCHMARKS_ROOT = path.resolve(SUITE_DIR, '..', '..');
const REPO_ROOT = path.resolve(BENCHMARKS_ROOT, '..');
const RESULTS_DIR = path.join(BENCHMARKS_ROOT, 'results', 'ilb-perf-import-nestjs');
const WORKER_DIR = path.join(BENCHMARKS_ROOT, '.workers-ilb-perf-import-nestjs');

const RUNS = 3;
const WARMUP = 1;
const PARITY_THRESHOLD = 0.05;
const PER_RUN_TIMEOUT_MS = 600_000;

type Competitor = {
  id: string;
  displayName: string;
  host: 'eslint' | 'oxlint';
  config: string;
  extraArgs?: string[];
  ruleId?: string;
  package: string;
  version: string;
  algorithm: string;
  resolver: string;
  isOurs: boolean;
  purpose: string;
};

type CorpusSpec = {
  name: string;
  repo: string;
  commit: string;
  srcGlob: string;
};

type RunStats = {
  wallMs: number;
  findings: number;
  parseErrors: number;
  filesWithFindings: number;
  ruleTimings: Record<string, number>;
  peakRssKb: number;
  cycleFindings?: any[];
};

type CompetitorResult = {
  id: string;
  displayName: string;
  host: 'eslint' | 'oxlint';
  package: string;
  version: string;
  timing: {
    runsMs: number[];
    medianMs: number;
    meanMs: number;
    stddevMs: number;
    cv: number;
    msPerFile: number;
  };
  perRuleMs: Record<string, number>;
  peakRssMb: number;
  findings: { total: number; parseErrors: number; filesWithFindings: number };
  cycleFindings?: any[];
};

function loadCompetitors(): { corpus: CorpusSpec; competitors: Competitor[] } {
  const file = path.join(SUITE_DIR, 'competitors.json');
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function findFiles(corpusDir: string, srcGlob: string): string[] {
  return globSync(srcGlob, {
    cwd: corpusDir,
    nodir: true,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/*.d.ts',
      '**/*.test.*',
      '**/*.spec.*',
      '**/__tests__/**',
      '**/__mocks__/**',
      '**/dist/**',
      '**/build/**',
    ],
  });
}

function buildWorkerScript(configPath: string, files: string[], ruleId: string, cwd: string): string {
  // Worker resolves the config relative to the suite, instantiates ESLint
  // via Node API, lints the file list, prints one JSON line.
  return `
import { ESLint } from 'eslint';
import { pathToFileURL } from 'url';

async function run() {
  const configMod = await import(pathToFileURL(${JSON.stringify(configPath)}).href);
  const overrideConfig = configMod.default;

  const eslint = new ESLint({
    cwd: ${JSON.stringify(cwd)},
    overrideConfigFile: true,
    overrideConfig,
  });

  const files = ${JSON.stringify(files)};
  const results = await eslint.lintFiles(files);

  let total = 0;
  let parseErrors = 0;
  let filesWithFindings = 0;
  const cycleFindings = [];
  for (const r of results) {
    let fileHadFinding = false;
    for (const m of r.messages) {
      if (m.fatal) { parseErrors++; continue; }
      if (m.ruleId === ${JSON.stringify(ruleId)}) {
        total++;
        fileHadFinding = true;
        cycleFindings.push({
          file: r.filePath,
          line: m.line,
          message: m.message,
        });
      }
    }
    if (fileHadFinding) filesWithFindings++;
  }

  const ru = process.resourceUsage();
  process.stdout.write(JSON.stringify({
    findings: total,
    parseErrors,
    filesWithFindings,
    peakRssKb: ru.maxRSS,
    fileCount: results.length,
    cycleFindings,
  }) + '\\n');
}

run().catch((e) => {
  process.stdout.write(JSON.stringify({ error: e.stack?.slice(0, 800) || String(e) }) + '\\n');
  process.exit(1);
});
`;
}

function parseTimingTable(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of text.split('\n')) {
    if (!line.includes('|')) continue;
    const cols = line.split('|').map((c) => c.trim());
    if (cols.length < 3) continue;
    const ruleId = cols[0];
    const timeMs = parseFloat(cols[1]);
    if (!Number.isFinite(timeMs) || ruleId === 'Rule' || ruleId.startsWith(':')) continue;
    out[ruleId] = (out[ruleId] || 0) + timeMs;
  }
  return out;
}

function clearEslintCache(): void {
  const cache = path.join(REPO_ROOT, '.eslintcache');
  if (fs.existsSync(cache)) {
    try { fs.rmSync(cache, { recursive: true, force: true }); } catch {}
  }
}

function runWorker(workerPath: string): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync('npx', ['tsx', workerPath], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    maxBuffer: 200 * 1024 * 1024,
    timeout: PER_RUN_TIMEOUT_MS,
    env: { ...process.env, TIMING: 'all' },
  });
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
  };
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function statSummary(nums: number[]) {
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  const stddev = Math.sqrt(variance);
  return {
    medianMs: Math.round(median(nums)),
    meanMs: Math.round(mean),
    stddevMs: Math.round(stddev),
    cv: mean > 0 ? +(stddev / mean).toFixed(3) : 0,
  };
}

function runOxlintOnce(
  c: Competitor,
  corpusDir: string,
): { stdout: string; stderr: string; wallMs: number; peakRssKb: number } {
  // /usr/bin/time -l on darwin reports peak RSS to stderr. Use it as a wrapper
  // so we get child-process RSS rather than this process's RSS.
  const configPath = path.join(corpusDir, c.config);
  const args = [
    '-l', 'oxlint',
    '-c', configPath,
    ...(c.extraArgs || []),
    'packages',
    '--format', 'json',
  ];
  const t0 = Date.now();
  const result = spawnSync('/usr/bin/time', args, {
    cwd: corpusDir,
    encoding: 'utf-8',
    maxBuffer: 200 * 1024 * 1024,
    timeout: PER_RUN_TIMEOUT_MS,
    env: { ...process.env, PATH: `${path.join(corpusDir, 'node_modules', '.bin')}:${process.env.PATH}` },
  });
  const wallMs = Date.now() - t0;
  // Parse "<n> maximum resident set size" from stderr.
  const rssMatch = (result.stderr || '').match(/(\d+)\s+maximum resident set size/);
  const peakRssKb = rssMatch ? Math.round(parseInt(rssMatch[1], 10) / 1024) : 0;
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    wallMs,
    peakRssKb,
  };
}

function parseOxlintFindings(stdout: string, ruleId: string): { total: number; fileCount: number } {
  // oxlint --format json emits one big JSON-ish object with diagnostics + a
  // trailing meta block. We can't rely on JSON.parse (some builds emit
  // malformed JSON with multiple roots). Count diagnostic messages by ruleId
  // via a substring scan; pull file count from the meta tail.
  let total = 0;
  const target = `"code": "${ruleId}"`;
  let idx = stdout.indexOf(target);
  while (idx !== -1) {
    total++;
    idx = stdout.indexOf(target, idx + target.length);
  }
  const fileMatch = stdout.match(/"number_of_files":\s*(\d+)/);
  const fileCount = fileMatch ? parseInt(fileMatch[1], 10) : 0;
  return { total, fileCount };
}

function extractOxlintCycleFindings(stdout: string, ruleId: string): any[] {
  // Parse each individual diagnostic JSON object out of the malformed
  // top-level structure. Each diagnostic looks like
  //   {"message": "...","code": "<ruleId>","severity": "error", ... ,"filename": "...","labels": [{"span":{"line":N,"column":M, ...}}], ...}
  // We slice between matched braces by tracking nesting depth.
  const out: any[] = [];
  let i = stdout.indexOf('"diagnostics":');
  if (i < 0) return out;
  i = stdout.indexOf('[', i);
  if (i < 0) return out;
  let depth = 0;
  let objStart = -1;
  let inString = false;
  let escape = false;
  for (; i < stdout.length; i++) {
    const ch = stdout[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart >= 0) {
        const objText = stdout.slice(objStart, i + 1);
        objStart = -1;
        // Only attempt parse for the right rule (cheap pre-filter).
        if (objText.includes(`"code": "${ruleId}"`)) {
          try {
            const obj = JSON.parse(objText);
            out.push({
              file: obj.filename,
              line: obj.labels?.[0]?.span?.line,
              message: obj.message,
              note: obj.note,
            });
          } catch {
            // ignore — malformed individual diagnostic
          }
        }
      }
    } else if (ch === ']' && depth === 0) {
      break;
    }
  }
  return out;
}

function benchmarkOxlint(c: Competitor, corpusDir: string): CompetitorResult {
  console.log(`\n▶ ${c.displayName}`);

  const runs: RunStats[] = [];
  for (let i = 0; i < WARMUP + RUNS; i++) {
    const isWarmup = i < WARMUP;
    const tag = isWarmup ? 'warmup' : `run ${i - WARMUP + 1}/${RUNS}`;
    process.stdout.write(`   ⏱  ${tag}... `);

    const exec = runOxlintOnce(c, corpusDir);
    const { total, fileCount } = parseOxlintFindings(exec.stdout, c.ruleId || '');

    if (isWarmup) {
      console.log(`${exec.wallMs}ms (discarded)`);
      continue;
    }

    runs.push({
      wallMs: exec.wallMs,
      findings: total,
      parseErrors: 0,
      filesWithFindings: 0,
      ruleTimings: {},
      peakRssKb: exec.peakRssKb,
      // Capture cycle findings on first measured run only; subsequent runs
      // are for wall-clock stats and the parse cost is significant.
      cycleFindings: runs.length === 0 ? extractOxlintCycleFindings(exec.stdout, c.ruleId || '') : undefined,
    });
    console.log(`${exec.wallMs}ms | ${total} cycles | ${fileCount} files | RSS ${Math.round(exec.peakRssKb / 1024)}MB`);
  }

  const wallMs = runs.map((r) => r.wallMs);
  const timing = statSummary(wallMs);
  const peakRssMb = Math.round(Math.max(...runs.map((r) => r.peakRssKb)) / 1024);
  const { fileCount } = parseOxlintFindings(runOxlintOnce(c, corpusDir).stdout, c.ruleId || '');
  const msPerFile = fileCount > 0 ? +(timing.medianMs / fileCount).toFixed(2) : 0;

  return {
    id: c.id,
    displayName: c.displayName,
    host: c.host,
    package: c.package,
    version: c.version,
    timing: {
      runsMs: wallMs,
      ...timing,
      msPerFile,
    },
    perRuleMs: {},
    peakRssMb,
    findings: {
      total: runs[0].findings,
      parseErrors: 0,
      filesWithFindings: 0,
    },
    cycleFindings: runs[0].cycleFindings,
  };
}

function benchmarkCompetitor(c: Competitor, files: string[], ruleId: string, corpusDir: string): CompetitorResult {
  console.log(`\n▶ ${c.displayName}`);

  const configPath = path.join(SUITE_DIR, c.config);
  const workerPath = path.join(WORKER_DIR, `${c.id}.ts`);
  fs.writeFileSync(workerPath, buildWorkerScript(configPath, files, ruleId, corpusDir));

  const runs: RunStats[] = [];
  for (let i = 0; i < WARMUP + RUNS; i++) {
    const isWarmup = i < WARMUP;
    const tag = isWarmup ? 'warmup' : `run ${i - WARMUP + 1}/${RUNS}`;
    process.stdout.write(`   ⏱  ${tag}... `);

    clearEslintCache();
    const t0 = Date.now();
    const exec = runWorker(workerPath);
    const wallMs = Date.now() - t0;

    if (isWarmup) {
      console.log(`${wallMs}ms (discarded)`);
      continue;
    }

    const jsonLine = exec.stdout
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('{') && l.endsWith('}'));
    if (!jsonLine) {
      console.log('stdout-parse-error');
      console.log(`   stdout: ${exec.stdout.slice(0, 400)}`);
      console.log(`   stderr: ${exec.stderr.slice(0, 400)}`);
      throw new Error(`${c.id}: worker stdout unparseable`);
    }
    const data = JSON.parse(jsonLine);
    if (data.error) {
      throw new Error(`${c.id}: worker error — ${data.error}`);
    }

    const ruleTimings = parseTimingTable(exec.stderr + '\n' + exec.stdout);
    runs.push({
      wallMs,
      findings: data.findings,
      parseErrors: data.parseErrors,
      filesWithFindings: data.filesWithFindings,
      ruleTimings,
      peakRssKb: data.peakRssKb,
      cycleFindings: data.cycleFindings,
    });
    console.log(`${wallMs}ms | ${data.findings} cycles | ${data.parseErrors} parse-errors | RSS ${Math.round(data.peakRssKb / 1024)}MB`);
  }

  const wallMs = runs.map((r) => r.wallMs);
  const timing = statSummary(wallMs);
  const peakRssMb = Math.round(Math.max(...runs.map((r) => r.peakRssKb)) / 1024);

  // Per-rule: average across runs.
  const ruleSet = new Set<string>();
  for (const r of runs) for (const k of Object.keys(r.ruleTimings)) ruleSet.add(k);
  const perRuleMs: Record<string, number> = {};
  for (const id of Array.from(ruleSet)) {
    const samples = runs.map((r) => r.ruleTimings[id]).filter((n) => Number.isFinite(n));
    if (samples.length) {
      perRuleMs[id] = +(samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(2);
    }
  }

  return {
    id: c.id,
    displayName: c.displayName,
    host: c.host,
    package: c.package,
    version: c.version,
    timing: {
      runsMs: wallMs,
      ...timing,
      msPerFile: +(timing.medianMs / files.length).toFixed(2),
    },
    perRuleMs,
    peakRssMb,
    findings: {
      total: runs[0].findings,
      parseErrors: runs[0].parseErrors,
      filesWithFindings: runs[0].filesWithFindings,
    },
    cycleFindings: runs[0].cycleFindings,
  };
}

function ruleIdForConfig(configRelPath: string): string {
  return configRelPath.includes('import-next') ? 'import-next/no-cycle' : 'import/no-cycle';
}

function countLoc(files: string[]): number {
  let total = 0;
  for (const f of files) {
    try {
      const lines = fs.readFileSync(f, 'utf-8').split('\n').length;
      total += lines;
    } catch {}
  }
  return total;
}

function writeJson(corpus: CorpusSpec, fileCount: number, loc: number, results: CompetitorResult[]) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const date = new Date().toISOString().split('T')[0];
  const outPath = path.join(RESULTS_DIR, `${date}.json`);

  // Dump per-plugin cycle findings to sidecar files for the FP/FN scorer.
  // Strip cycleFindings from the main JSON to keep it compact.
  for (const r of results) {
    if (r.cycleFindings && r.cycleFindings.length > 0) {
      const sidecar = path.join(RESULTS_DIR, `cycles-${r.id}.json`);
      fs.writeFileSync(sidecar, JSON.stringify({
        competitor: r.id,
        host: r.host,
        package: r.package,
        version: r.version,
        cycleFindings: r.cycleFindings,
      }, null, 2));
    }
    delete r.cycleFindings;
  }

  // Compare within each host (eslint, oxlint). Mixing hosts in one speedup
  // column would be misleading — ESLint's Node-API startup is not what
  // oxlint's Rust binary startup is.
  const baselines: Record<string, string> = {
    eslint: 'import-official',
    oxlint: 'oxlint-builtin',
  };
  const comparison: Record<string, any> = {};
  for (const host of ['eslint', 'oxlint'] as const) {
    const baselineId = baselines[host];
    const baseline = results.find((r) => r.id === baselineId && r.host === host);
    if (!baseline) continue;
    const vs: Record<string, { speedup: number; findingsDiffPct: number; parityWarning: boolean }> = {};
    for (const r of results) {
      if (r.host !== host || r.id === baseline.id) continue;
      const speedup = +(baseline.timing.medianMs / r.timing.medianMs).toFixed(2);
      const diff = Math.abs(baseline.findings.total - r.findings.total);
      const denom = Math.max(baseline.findings.total, r.findings.total, 1);
      const findingsDiffPct = +((diff / denom) * 100).toFixed(2);
      vs[r.id] = {
        speedup,
        findingsDiffPct,
        parityWarning: findingsDiffPct > PARITY_THRESHOLD * 100,
      };
    }
    comparison[host] = { baseline: baseline.id, vs };
  }

  const payload = {
    suite: 'ilb-perf-import-nestjs',
    timestamp: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    corpus: { ...corpus, fileCount, loc },
    competitors: results,
    comparison,
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  return { outPath, payload };
}

function writeReport(jsonPath: string, payload: any) {
  const mdPath = jsonPath.replace(/\.json$/, '.md');
  const c = payload.competitors;
  const cmp = payload.comparison;

  const buildRows = (host: 'eslint' | 'oxlint') => c
    .filter((x: CompetitorResult) => x.host === host)
    .map((x: CompetitorResult) => {
      const cvPct = (x.timing.cv * 100).toFixed(1);
      return `| ${x.displayName} | ${x.timing.medianMs} ms | ${cvPct}% | ${x.timing.msPerFile} ms | ${x.peakRssMb} MB | ${x.findings.total} | ${x.findings.parseErrors} |`;
    }).join('\n');
  const eslintRows = buildRows('eslint');
  const oxlintRows = buildRows('oxlint');

  const perRuleRows = c
    .filter((x: CompetitorResult) => Object.keys(x.perRuleMs).length > 0)
    .map((x: CompetitorResult) => {
      const rule = Object.entries(x.perRuleMs).sort((a, b) => b[1] - a[1])[0];
      return rule ? `| ${x.displayName} | \`${rule[0]}\` | ${rule[1]} ms |` : `| ${x.displayName} | — | — |`;
    }).join('\n') || '_(oxlint does not expose per-rule TIMING; ESLint per-rule shown when available)_';

  const buildSpeedupSection = (host: 'eslint' | 'oxlint') => {
    const cmp2 = cmp?.[host];
    if (!cmp2) return '';
    const rows = Object.entries(cmp2.vs as Record<string, { speedup: number; findingsDiffPct: number; parityWarning: boolean }>)
      .map(([id, v]) => `| \`${id}\` vs \`${cmp2.baseline}\` | **${v.speedup}x** | ${v.findingsDiffPct}% | ${v.parityWarning ? '⚠️' : '✅'} |`)
      .join('\n');
    return `### ${host} host — speedup vs baseline (\`${cmp2.baseline}\`)\n\n| Comparison | Median speedup | Findings diff | Parity |\n|---|---|---|---|\n${rows}\n`;
  };
  const speedup = `## Speedup\n\n${buildSpeedupSection('eslint')}\n${buildSpeedupSection('oxlint')}`;

  const cvWarnings = c.filter((x: CompetitorResult) => x.timing.cv > 0.05)
    .map((x: CompetitorResult) => `- ⚠️ \`${x.id}\`: CV=${(x.timing.cv * 100).toFixed(1)}% (>5%) — rerun for tighter measurement`)
    .join('\n') || '_(none)_';

  const md = `# ILB-Perf-Import — nestjs

> Pinned: \`${payload.corpus.commit}\` · ${payload.corpus.name}

## Summary

| Metric | Value |
|---|---|
| Corpus | nestjs (\`${payload.corpus.srcGlob}\`) |
| Files linted | ${payload.corpus.fileCount} |
| Lines of code | ${payload.corpus.loc.toLocaleString()} |
| Runs (warmup + timed) | ${WARMUP} + ${RUNS} |

## Wall-clock (median of ${RUNS} runs)

### ESLint host

| Competitor | Median | CV | ms/file | Peak RSS | Cycles | Parse errors |
|---|---|---|---|---|---|---|
${eslintRows}

### Oxlint host

| Competitor | Median | CV | ms/file | Peak RSS | Cycles | Parse errors |
|---|---|---|---|---|---|---|
${oxlintRows}

${speedup}

## Top rule by self-time

| Competitor | Rule | Avg time |
|---|---|---|
${perRuleRows}

## CV gate

${cvWarnings}

## Methodology

- ${WARMUP} warmup + ${RUNS} timed runs, \`.eslintcache\` cleared between runs
- Per-rule timing via \`TIMING=all\` (parsed from stderr)
- Peak RSS via \`process.resourceUsage().maxRSS\` in the worker
- ESLint v9 via \`tsx\` (Node API, not the CLI)
- Glob: \`${payload.corpus.srcGlob}\`

Detection-parity gate at ${PARITY_THRESHOLD * 100}% means: if the two
plugins disagree on cycle count by more than that, the wall-clock
comparison isn't apples-to-apples.

Companion JSON: \`${path.basename(jsonPath)}\`.
`;
  fs.writeFileSync(mdPath, md);
  return mdPath;
}

async function main() {
  console.log('\n🔬 ILB-Perf-Import — nestjs corpus\n');

  const { corpus, competitors } = loadCompetitors();
  const benchDir = resolveBenchDir(REPO_ROOT);
  console.log(`📂 Corpus cache: ${benchDir}`);

  // Clone or refresh the corpus.
  console.log(`\n▶ Resolving corpus: ${corpus.name}@${corpus.commit}`);
  const corpusDir = cloneRepo(corpus, benchDir);

  // Find files.
  const files = findFiles(corpusDir, corpus.srcGlob);
  if (files.length === 0) {
    throw new Error(`No files matched glob ${corpus.srcGlob} under ${corpusDir}`);
  }
  const loc = countLoc(files);
  console.log(`   ${files.length} files matched (${loc.toLocaleString()} LoC)`);

  // Prepare worker dir.
  fs.mkdirSync(WORKER_DIR, { recursive: true });

  // Benchmark each competitor. ESLint competitors use the worker pattern;
  // oxlint competitors shell out to the oxlint binary inside the corpus.
  const results: CompetitorResult[] = [];
  for (const c of competitors) {
    if (c.host === 'oxlint') {
      results.push(benchmarkOxlint(c, corpusDir));
    } else {
      const ruleId = ruleIdForConfig(c.config);
      results.push(benchmarkCompetitor(c, files, ruleId, corpusDir));
    }
  }

  // Clean worker dir.
  try { fs.rmSync(WORKER_DIR, { recursive: true, force: true }); } catch {}

  // Write JSON + markdown report.
  const { outPath, payload } = writeJson(corpus, files.length, loc, results);
  const mdPath = writeReport(outPath, payload);

  // Print summary table.
  console.log('\n📊 Summary\n');
  const header = `${'Competitor'.padEnd(40)}${'Median'.padStart(10)}${'CV'.padStart(8)}${'RSS'.padStart(8)}${'Cycles'.padStart(8)}${'Parse-err'.padStart(11)}`;
  console.log(header);
  console.log('─'.repeat(header.length));
  for (const r of results) {
    const cv = `${(r.timing.cv * 100).toFixed(1)}%`;
    console.log(
      r.displayName.padEnd(40) +
      `${r.timing.medianMs}ms`.padStart(10) +
      cv.padStart(8) +
      `${r.peakRssMb}MB`.padStart(8) +
      `${r.findings.total}`.padStart(8) +
      `${r.findings.parseErrors}`.padStart(11),
    );
  }

  if (payload.comparison) {
    for (const host of ['eslint', 'oxlint'] as const) {
      const cmp = payload.comparison[host];
      if (!cmp) continue;
      console.log(`\n⚡ ${host} host — speedups vs ${cmp.baseline}:`);
      for (const [id, v] of Object.entries(cmp.vs as Record<string, any>)) {
        const flag = v.parityWarning ? '⚠️' : '✅';
        console.log(`   ${flag} ${id}: ${v.speedup}x (findings diff ${v.findingsDiffPct}%)`);
      }
    }
  }

  console.log(`\n📄 Results: ${path.relative(REPO_ROOT, outPath)}`);
  console.log(`📄 Report:  ${path.relative(REPO_ROOT, mdPath)}\n`);
}

main().catch((e) => {
  console.error('\n❌ Benchmark failed:', e.message);
  if (e.stack) console.error(e.stack);
  process.exit(1);
});
