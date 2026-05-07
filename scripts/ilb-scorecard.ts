#!/usr/bin/env -S npx tsx

/**
 * ILB Scorecard — Unified one-page scorecard across all Interlace benches.
 *
 * Reads the latest results from each bench directory and produces a single
 * markdown page (the artifact we share weekly / per-release). Gracefully
 * handles missing benches (renders "—" for ungenerated scores).
 *
 * Sources:
 *   ILB-Wild        → benchmark-results/<latest>/summary.json
 *   ILB-Arena       → benchmarks/results/ilb-arena/<latest>.json
 *   ILB-Juliet      → benchmarks/results/ilb-juliet/<latest>.json
 *   ILB-AI          → benchmarks/results/ilb-ai/<latest>.json
 *   ILB-Perf        → benchmarks/results/ilb-perf-import/<latest>.json
 *   ILB-Cov         → derived from ILB-Wild's pluginRollup
 *   ILB-Edge        → derived from ILB-Wild summary (fpEdge repos)
 *   ILB-LLM-Tokens  → benchmarks/results/ilb-llm-tokens/latest.json
 *   ILB-LLM-Fix     → benchmarks/results/ilb-llm-fix/latest.json
 *
 * Usage:
 *   tsx scripts/ilb-scorecard.ts                # writes benchmark-results/scorecard.md
 *   tsx scripts/ilb-scorecard.ts --print        # writes file AND prints to stdout
 *   tsx scripts/ilb-scorecard.ts --json         # emit JSON instead of MD
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BENCH_RESULTS = path.join(ROOT, 'benchmarks/results');
const WILD_RESULTS = path.join(ROOT, 'benchmark-results');

const args = process.argv.slice(2);
const PRINT = args.includes('--print');
const EMIT_JSON = args.includes('--json');

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface BenchScore {
  score: string;
  detail: string;
  date: string | null;
  source: string;
  raw?: unknown;
}

interface BenchRow extends BenchScore {
  name: string;
  dimension: string;
  industry: string;
  target: string;
}

interface WildRepo {
  repo: string;
  success: boolean;
  loc: number;
  fileCount: number;
  fpEdge?: boolean;
  findings: { total: number; densityPerKloc: number };
  timing: { msPerFile: number };
  peakRssMb: number;
}

interface WildPluginRollupEntry {
  rulesEverFired: number;
  totalRules: number;
  corpusActivationRate: number;
  reposExercising: number;
}

interface WildSummary {
  date: string;
  success: number;
  corpusSize: number;
  aggregate: { avgDensityPerKloc: number; totalLoc: number };
  repos: WildRepo[];
  pluginRollup?: Record<string, WildPluginRollupEntry>;
}

interface WildResult {
  path: string;
  date: string;
  data: WildSummary | null;
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function latestFile(dir: string, suffix = '.json'): string | null {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir).filter((e) => e.endsWith(suffix));
  if (entries.length === 0) return null;
  // Filter for date-stamped files (YYYY-MM-DD.json) before fancy variants.
  const dated = entries.filter((e) => /^\d{4}-\d{2}-\d{2}\b/.test(e)).sort().reverse();
  if (dated.length > 0) return path.join(dir, dated[0]);
  return path.join(dir, entries.sort().reverse()[0]);
}

function latestWildSummary(): WildResult | null {
  if (!fs.existsSync(WILD_RESULTS)) return null;
  const dirs = fs
    .readdirSync(WILD_RESULTS)
    .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e))
    .filter((e) => fs.statSync(path.join(WILD_RESULTS, e)).isDirectory())
    .sort()
    .reverse();
  for (const d of dirs) {
    const p = path.join(WILD_RESULTS, d, 'summary.json');
    if (fs.existsSync(p)) return { path: p, date: d, data: readJson<WildSummary>(p) };
  }
  return null;
}

function readJson<T = unknown>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function missing(where: string): BenchScore {
  return { score: '—', detail: `not yet generated (${where})`, date: null, source: where };
}

// ---------------------------------------------------------------------------
// SCORE EXTRACTORS
// ---------------------------------------------------------------------------

function readWild(): BenchScore {
  const wild = latestWildSummary();
  if (!wild?.data) return missing('benchmark-results/<date>/summary.json');
  const d = wild.data;
  return {
    score: `${d.aggregate.avgDensityPerKloc} findings/kLoC`,
    detail: `${d.aggregate.totalLoc.toLocaleString()} LoC across ${d.success}/${d.corpusSize} repos`,
    date: d.date,
    source: path.relative(ROOT, wild.path),
    raw: d,
  };
}

function readArena(): BenchScore {
  const f = latestFile(path.join(BENCH_RESULTS, 'ilb-arena'));
  if (!f) return missing('benchmarks/results/ilb-arena/');
  const d = readJson<{
    plugins?: Record<string, { metrics?: { TP: number; FP: number; FN: number; f1Score: string; precision: string; recall: string } }>;
    timestamp?: string;
  }>(f);
  if (!d) return missing(f);
  const interlace = d.plugins?.['interlace'];
  const m = interlace?.metrics;
  if (m && Number.isFinite(m.TP)) {
    const sorted = Object.entries(d.plugins ?? {})
      .map(([name, p]) => ({ name, f1: parseFloat(p.metrics?.f1Score ?? '0') || 0 }))
      .sort((a, b) => b.f1 - a.f1);
    const rank = sorted.findIndex((p) => p.name === 'interlace') + 1;
    return {
      score: `F1 ${m.f1Score} (rank ${rank}/${sorted.length})`,
      detail: `TP ${m.TP}/40 · FP ${m.FP} · FN ${m.FN} · precision ${m.precision} · recall ${m.recall}`,
      date: d.timestamp?.slice(0, 10) ?? path.basename(f).replace(/\.json$/, ''),
      source: path.relative(ROOT, f),
      raw: d,
    };
  }
  return {
    score: '—',
    detail: 'result schema not recognized',
    date: d.timestamp?.slice(0, 10) ?? path.basename(f).replace(/\.json$/, ''),
    source: path.relative(ROOT, f),
  };
}

function readJuliet(): BenchScore {
  const f = latestFile(path.join(BENCH_RESULTS, 'ilb-juliet'));
  if (!f) return missing('benchmarks/results/ilb-juliet/');
  const d = readJson<{
    plugins?: Record<string, { aggregate?: { TP: number; FP: number; FN: number; f1: number; bas: number } }>;
    corpus?: unknown[];
    timestamp?: string;
  }>(f);
  if (!d) return missing(f);
  const interlace = d.plugins?.['interlace']?.aggregate;
  if (interlace && Number.isFinite(interlace.TP)) {
    const sorted = Object.entries(d.plugins ?? {})
      .map(([name, p]) => ({ name, f1: p.aggregate?.f1 ?? 0 }))
      .sort((a, b) => b.f1 - a.f1);
    const rank = sorted.findIndex((p) => p.name === 'interlace') + 1;
    const cwes = (d.corpus ?? []).length;
    return {
      score: `F1 ${interlace.f1}% (rank ${rank}/${sorted.length})`,
      detail: `TP ${interlace.TP} · FP ${interlace.FP} · FN ${interlace.FN} · BAS ${interlace.bas}% · ${cwes} CWEs`,
      date: d.timestamp?.slice(0, 10) ?? path.basename(f).replace(/\.json$/, ''),
      source: path.relative(ROOT, f),
      raw: d,
    };
  }
  return {
    score: '—',
    detail: 'shape not yet standardized',
    date: d.timestamp?.slice(0, 10) ?? path.basename(f).replace(/\.json$/, ''),
    source: path.relative(ROOT, f),
  };
}

function readAI(): BenchScore {
  const f = latestFile(path.join(BENCH_RESULTS, 'ilb-ai'));
  if (!f) return missing('benchmarks/results/ilb-ai/');
  const d = readJson<{
    models?: Record<string, { totalFunctions?: number; functionsWithVulnerabilities?: number }>;
    timestamp?: string;
  }>(f);
  if (!d) return missing(f);
  if (d.models) {
    const totals = Object.values(d.models).reduce(
      (acc, m) => {
        acc.total += m.totalFunctions ?? 0;
        acc.vuln += m.functionsWithVulnerabilities ?? 0;
        return acc;
      },
      { total: 0, vuln: 0 },
    );
    if (totals.total > 0) {
      const detection = (totals.vuln / totals.total) * 100;
      const modelCount = Object.keys(d.models).length;
      return {
        score: `${detection.toFixed(0)}% detection`,
        detail: `${totals.vuln}/${totals.total} LLM-generated functions flagged across ${modelCount} model${modelCount === 1 ? '' : 's'}`,
        date: d.timestamp?.slice(0, 10) ?? path.basename(f).replace(/\.json$/, ''),
        source: path.relative(ROOT, f),
        raw: d,
      };
    }
  }
  return missing(f);
}

function readPerf(): BenchScore {
  const wild = latestWildSummary();
  if (!wild?.data) return missing('benchmark-results/<date>/summary.json');
  const ok = wild.data.repos.filter((r) => r.success);
  if (ok.length === 0) return missing(wild.path);
  const median = (arr: number[]): number => {
    const s = [...arr].sort((a, b) => a - b);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  const msPerFile = median(ok.map((r) => r.timing.msPerFile));
  const peakRss = Math.max(...ok.map((r) => r.peakRssMb));
  return {
    score: `${msPerFile.toFixed(1)} ms/file (median)`,
    detail: `peak RSS ${peakRss}MB across ${ok.length} repos · cold scenario`,
    date: wild.data.date,
    source: path.relative(ROOT, wild.path),
    raw: wild.data,
  };
}

function readCoverage(wildData: WildSummary | null): BenchScore {
  if (!wildData) return missing('derived from ILB-Wild');
  const rollup = wildData.pluginRollup ?? {};
  const plugins = Object.values(rollup);
  if (plugins.length === 0) return missing('ILB-Wild pluginRollup empty');
  const totalFired = plugins.reduce((s, p) => s + p.rulesEverFired, 0);
  const totalRules = plugins.reduce((s, p) => s + p.totalRules, 0);
  const rate = totalRules ? (totalFired / totalRules) * 100 : 0;
  return {
    score: `${rate.toFixed(0)}% rules fired`,
    detail: `${totalFired}/${totalRules} rules across ${plugins.length} plugins on Wild corpus`,
    date: wildData.date,
    source: 'derived from ILB-Wild',
    raw: rollup,
  };
}

function readEdge(wildData: WildSummary | null): BenchScore {
  if (!wildData) return missing('derived from ILB-Wild');
  const fp = wildData.repos.filter((r) => r.success && r.fpEdge);
  if (fp.length === 0) {
    return {
      score: '—',
      detail: 'no FP-Edge repos in latest Wild run · run `npm run ilb:wild -- --fp-corpus`',
      date: wildData.date,
      source: 'derived from ILB-Wild',
    };
  }
  const totalFindings = fp.reduce((s, r) => s + r.findings.total, 0);
  const totalLoc = fp.reduce((s, r) => s + r.loc, 0);
  return {
    score: `${totalFindings} FP candidates`,
    detail: `${fp.length} adversarial-real repos · ${totalLoc.toLocaleString()} LoC · awaiting triage`,
    date: wildData.date,
    source: 'derived from ILB-Wild',
    raw: fp,
  };
}

function readLlmTokens(): BenchScore {
  const f = path.join(BENCH_RESULTS, 'ilb-llm-tokens', 'latest.json');
  if (!fs.existsSync(f)) return missing('benchmarks/results/ilb-llm-tokens/latest.json');
  const d = readJson<{
    headlineScore?: Record<string, number | null>;
    perCategoryScore?: Record<string, Record<string, number | null>>;
    measurements?: unknown[];
    methodologyVersion?: string;
    timestamp?: string;
  }>(f);
  if (!d) return missing(f);

  const fmtPct = (v: number | null | undefined): string =>
    typeof v !== 'number' ? '—' : (v >= 0 ? '+' : '') + v + '%';

  // Headline = security/v2-compact (the SLO-targetable cell) when present.
  // Falls back to the aggregate v2-compact if per-category scoring isn't in
  // the result (e.g. result was generated by an older runner).
  const securityCompact = d.perCategoryScore?.['security']?.['v2-compact'];
  const aggregateCompact = d.headlineScore?.['v2-compact'];
  const headlineNumber = typeof securityCompact === 'number' ? securityCompact : aggregateCompact;

  if (typeof headlineNumber !== 'number') {
    return {
      score: '—',
      detail: 'no v2-compact score (security or aggregate) in result',
      date: d.timestamp?.slice(0, 10) ?? null,
      source: path.relative(ROOT, f),
    };
  }

  // Detail surfaces per-category compact deltas so the aggregate can't mislead.
  const sec = d.perCategoryScore?.['security']?.['v2-compact'];
  const qua = d.perCategoryScore?.['quality']?.['v2-compact'];
  const per = d.perCategoryScore?.['performance']?.['v2-compact'];
  const perCatLine = d.perCategoryScore
    ? `compact: sec ${fmtPct(sec)} · qual ${fmtPct(qua)} · perf ${fmtPct(per)}`
    : `compact ${fmtPct(aggregateCompact)} (aggregate only — older runner)`;

  return {
    score: `sec/compact ${fmtPct(headlineNumber)} vs V1`,
    detail: `${perCatLine} · ${d.measurements?.length ?? 0} measurements · methodology ${d.methodologyVersion ?? '?'}`,
    date: d.timestamp?.slice(0, 10) ?? null,
    source: path.relative(ROOT, f),
    raw: d,
  };
}

function readLlmFix(): BenchScore {
  const f = path.join(BENCH_RESULTS, 'ilb-llm-fix', 'latest.json');
  if (!fs.existsSync(f)) return missing('benchmarks/results/ilb-llm-fix/latest.json');
  const d = readJson<{
    headlineScore?: number;
    passRateByVariant?: Record<string, number | null>;
    summary?: Array<{ model: string; totalCostUsd?: number }>;
    methodologyVersion?: string;
    timestamp?: string;
  }>(f);
  if (!d) return missing(f);
  if (typeof d.headlineScore !== 'number') {
    return {
      score: '—',
      detail: 'headlineScore not present',
      date: d.timestamp?.slice(0, 10) ?? null,
      source: path.relative(ROOT, f),
    };
  }
  const variants = d.passRateByVariant ?? {};
  const variantParts = Object.entries(variants)
    .map(([v, pct]) => `${v}=${pct === null ? '—' : pct + '%'}`)
    .join(' · ');
  const totalCost = (d.summary ?? []).reduce((s, c) => s + (c.totalCostUsd ?? 0), 0);
  const uniqueModels = (d.summary ?? [])
    .map((s) => s.model)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(',');
  return {
    score: `${d.headlineScore}% macro pass`,
    detail: `${variantParts} · models ${uniqueModels} · spent $${totalCost.toFixed(4)} · methodology ${d.methodologyVersion ?? '?'}`,
    date: d.timestamp?.slice(0, 10) ?? null,
    source: path.relative(ROOT, f),
    raw: d,
  };
}

// ---------------------------------------------------------------------------
// BUILD SCORECARD
// ---------------------------------------------------------------------------

const wild = readWild();
const wildData = (wild.raw ?? null) as WildSummary | null;

const benches: BenchRow[] = [
  { name: 'ILB-Juliet', dimension: 'Synthetic CWE accuracy', industry: 'NIST Juliet / OWASP Bench', target: 'F1 ≥ 80%', ...readJuliet() },
  { name: 'ILB-Arena', dimension: 'Head-to-head vs competitors', industry: 'OWASP Benchmark', target: 'Rank ≤ 3', ...readArena() },
  { name: 'ILB-Wild', dimension: 'Findings on popular OSS', industry: '(we define this)', target: '—', ...wild },
  { name: 'ILB-Edge', dimension: 'FP resilience on adversarial-real code', industry: 'Adversarial GLUE / CheckList', target: 'FP rate ≤ 2%', ...readEdge(wildData) },
  { name: 'ILB-Perf', dimension: 'Lint throughput', industry: 'MLPerf / SPEC CPU', target: '≤ 15 ms/file', ...readPerf() },
  { name: 'ILB-Cov', dimension: 'Rule activation rate', industry: '(analogous to mutation testing)', target: '≥ 70%', ...readCoverage(wildData) },
  { name: 'ILB-AI', dimension: 'Vuln detection on LLM-generated code', industry: 'HumanEval (task design)', target: '—', ...readAI() },
  { name: 'ILB-LLM-Tokens', dimension: 'Formatter token cost', industry: '(we define this)', target: 'sec/compact ≤ V1', ...readLlmTokens() },
  { name: 'ILB-LLM-Fix', dimension: 'First-fix accuracy on LLM-consumed lint output', industry: 'HumanEval / SWE-Bench (task design)', target: '≥ 80% macro pass', ...readLlmFix() },
];

if (EMIT_JSON) {
  const out = {
    generatedAt: new Date().toISOString(),
    benches: benches.map(({ raw: _raw, ...b }) => b),
  };
  if (PRINT) console.log(JSON.stringify(out, null, 2));
  fs.mkdirSync(WILD_RESULTS, { recursive: true });
  fs.writeFileSync(path.join(WILD_RESULTS, 'scorecard.json'), JSON.stringify(out, null, 2));
  console.log(`✅ ${path.relative(ROOT, path.join(WILD_RESULTS, 'scorecard.json'))}`);
  process.exit(0);
}

const md = renderMd(benches);
fs.mkdirSync(WILD_RESULTS, { recursive: true });
fs.writeFileSync(path.join(WILD_RESULTS, 'scorecard.md'), md);
console.log(`✅ ${path.relative(ROOT, path.join(WILD_RESULTS, 'scorecard.md'))}`);
if (PRINT) {
  console.log('\n' + md);
}

// ---------------------------------------------------------------------------
// RENDERER
// ---------------------------------------------------------------------------

function renderMd(benches: BenchRow[]): string {
  const today = new Date().toISOString().split('T')[0];
  const rows = benches
    .map(
      (b) =>
        `| **${b.name}** | ${b.dimension} | **${b.score}** | ${b.detail} | ${b.target} | ${b.date ?? '—'} |`,
    )
    .join('\n');

  let wildSection = '';
  if (wildData) {
    const repoRows = wildData.repos
      .map((r) => {
        if (!r.success) return `| ${r.repo} | ❌ | — | — | — | — |`;
        const flags = r.fpEdge ? ' 🔬' : '';
        return `| ${r.repo}${flags} | ✅ | ${r.loc.toLocaleString()} | ${r.fileCount} | ${r.findings.total} | ${r.findings.densityPerKloc} |`;
      })
      .join('\n');
    const pluginRows = Object.entries(wildData.pluginRollup ?? {})
      .sort((a, b) => b[1].corpusActivationRate - a[1].corpusActivationRate)
      .map(
        ([p, v]) =>
          `| ${p} | ${v.rulesEverFired} / ${v.totalRules} | ${v.corpusActivationRate}% | ${v.reposExercising} |`,
      )
      .join('\n');
    wildSection = `

## ILB-Wild drilldown (${wildData.date})

### Per-repo

| Repo | Status | LoC | Files | Findings | /kLoC |
|---|---|---|---|---|---|
${repoRows}

🔬 = ILB-Edge target (findings = FP candidates)

### Plugin activation across the corpus

| Plugin | Rules fired | Activation | Repos exercising |
|---|---|---|---|
${pluginRows}
`;
  }

  return `# Interlace Bench Scorecard

> Generated: ${today} · Methodology: [\`benchmarks/ILB_NAMING.md\`](benchmarks/ILB_NAMING.md)

## Top-line scorecard

| Bench | Dimension | Score | Detail | SLO | As of |
|---|---|---|---|---|---|
${rows}

## How to read this

- **Score** is the single comparable number for each bench.
- **SLO** is the target we want to hit; the CI gate fails if a bench regresses below it.
- **As of** is the date of the underlying result file. Stale dates (>30 days) mean the bench should be re-run.
- Where score = "—", the bench has not been generated yet against the current methodology version.

## Industry parallels

| Bench | Parallel |
|---|---|
| ILB-Juliet | NIST SARD / Juliet Test Suite, OWASP Benchmark v1.2 |
| ILB-Arena | OWASP Benchmark Accuracy Score (BAS = TPR − FPR) |
| ILB-Wild | (none — we define the JS standard) |
| ILB-Edge | Adversarial GLUE / CheckList |
| ILB-Perf | MLPerf Inference, SPEC CPU |
| ILB-Cov | (analogous to mutation testing coverage) |
| ILB-AI | HumanEval / SWE-Bench (task design); WMDP (security framing) |
| ILB-LLM-Tokens | (we define this — \`tiktoken\` reproducibility benchmarks closest) |
| ILB-LLM-Fix | HumanEval / SWE-Bench (task design only) |
${wildSection}

## How to refresh

\`\`\`bash
npm run ilb:wild              # repopulates ILB-Wild, ILB-Edge, ILB-Cov, ILB-Perf
npm run ilb:arena             # ILB-Arena (head-to-head)
npm run ilb:juliet            # ILB-Juliet (synthetic CWE)
npm run ilb:ai                # ILB-AI
npm run ilb:llm:tokens        # ILB-LLM-Tokens (no API calls)
npm run ilb:llm:fix           # ILB-LLM-Fix (calls Claude CLI; opt-in)
npm run ilb:scorecard         # regenerate this page
npm run ilb:regression        # gate against benchmark-results/baseline.json
\`\`\`

_Generated by \`scripts/ilb-scorecard.ts\`_
`;
}
