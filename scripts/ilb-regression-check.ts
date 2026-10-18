#!/usr/bin/env -S npx tsx

/**
 * ILB Regression Check — gates CI on cross-bench regressions.
 *
 * Compares the current ILB-Wild summary (latest in benchmark-results/<date>/)
 * against a baseline (benchmark-results/baseline.json or --baseline=<path>).
 * Also gates the new ILB-LLM-Tokens and ILB-LLM-Fix benches against their
 * own latest.json baselines (if present in the baseline payload).
 *
 * Exits non-zero if any tracked metric regresses beyond its threshold.
 *
 * Tracked metrics (per repo, where available):
 *   - ms-per-file        regression > 25%   → fail
 *   - findings density   delta  > 25%       → warn (info only by default)
 *   - plugin coverage    drop   > 5pp       → fail
 *   - peak RSS           regression > 50%   → warn (memory varies more)
 *
 * Aggregate metrics:
 *   - corpus avg density delta > 30%        → warn
 *   - ILB-Cov rate       drop > 10pp        → fail
 *
 * LLM benches (gated against benchmark-results/baseline-llm.json):
 *   - ILB-LLM-Tokens compact pct delta > 10pp worse vs V1 → fail
 *   - ILB-LLM-Fix headline pass-rate drop > 10pp → fail
 *
 * Usage:
 *   tsx scripts/ilb-regression-check.ts                     # vs baseline.json
 *   tsx scripts/ilb-regression-check.ts --baseline X.json   # vs custom baseline
 *   tsx scripts/ilb-regression-check.ts --update-baseline   # write current as new baseline
 *   tsx scripts/ilb-regression-check.ts --strict            # warnings also fail
 *   tsx scripts/ilb-regression-check.ts --expect-repos a,b  # the summary must hold these
 *   tsx scripts/ilb-regression-check.ts --expect-repos a,b --summary-only
 *                                     # only that check — the non-advisory half in CI
 *
 * The baseline is a ratchet, so --update-baseline refuses two things unless
 * told otherwise:
 *   - a run that covers fewer repos than the baseline it replaces
 *     (a 3-repo smoke run overwriting the 22-repo corpus)  → --allow-shrink
 *   - a run that regresses past a hard threshold          → --accept-regressions
 * Either override is a deliberate re-record; say why in the PR that commits it.
 *
 * A repo result most of whose files failed to parse is not a measurement
 * (scripts/lib/ilb-parse-health.ts). It is never compared, never satisfies
 * --expect-repos, and --update-baseline refuses it with no override.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHealthProblem } from './lib/ilb-parse-health';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const RESULTS_DIR = path.join(ROOT, 'benchmark-results');
const BENCH_RESULTS = path.join(ROOT, 'benchmarks/results');

const args = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
};
const flag = (name: string): boolean => args.includes(`--${name}`);

// --results-dir exists so the ratchet can be exercised against a scratch tree
// (scripts/__tests__/ilb-baseline-ratchet.lock.test.ts) without touching the
// committed baseline.
const resultsDir = path.resolve(opt('results-dir') ?? RESULTS_DIR);
const baselinePath = opt('baseline') ?? path.join(resultsDir, 'baseline.json');
const llmBaselinePath = path.join(resultsDir, 'baseline-llm.json');
const STRICT = flag('strict');
const UPDATE_BASELINE = flag('update-baseline');
const ALLOW_SHRINK = flag('allow-shrink');
const ACCEPT_REGRESSIONS = flag('accept-regressions');
const SUMMARY_ONLY = flag('summary-only');
const EXPECT_REPOS = (opt('expect-repos') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const THRESHOLDS = {
  msPerFileRegressionPct: 25,
  densityDeltaPct: 25,
  pluginCoverageDropPp: 5,
  peakRssRegressionPct: 50,
  corpusDensityDeltaPct: 30,
  covRateDropPp: 10,
  llmTokensCompactWorseningPp: 10,
  llmFixPassRateDropPp: 10,
};

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface RepoSummary {
  repo: string;
  success: boolean;
  loc?: number;
  fileCount?: number;
  fpEdge?: boolean;
  findings?: { total: number; densityPerKloc: number; parseErrors?: number };
  timing?: { msPerFile: number };
  peakRssMb?: number;
  pluginCoverage?: Record<string, { activationRate: number }>;
}

interface PluginRollupEntry {
  rulesEverFired: number;
  totalRules: number;
}

interface WildSummary {
  date: string;
  aggregate?: { avgDensityPerKloc?: number };
  repos: RepoSummary[];
  pluginRollup?: Record<string, PluginRollupEntry>;
}

interface LlmTokensResult {
  benchmark: 'ilb-llm-tokens';
  timestamp: string;
  headlineScore?: Record<string, number | null>;
  perCategoryScore?: Record<string, Record<string, number | null>>;
}

interface LlmFixResult {
  benchmark: 'ilb-llm-fix';
  timestamp: string;
  headlineScore?: number;
  passRateByVariant?: Record<string, number | null>;
}

interface LlmBaseline {
  llmTokens?: LlmTokensResult | null;
  llmFix?: LlmFixResult | null;
}

// ---------------------------------------------------------------------------
// LOAD CURRENT WILD SUMMARY
// ---------------------------------------------------------------------------

function loadLatestWildSummary(): { path: string; data: WildSummary } | null {
  if (!fs.existsSync(resultsDir)) return null;
  const dirs = fs
    .readdirSync(resultsDir)
    .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e))
    .filter((e) => fs.statSync(path.join(resultsDir, e)).isDirectory())
    .toSorted()
    .toReversed();
  for (const d of dirs) {
    const p = path.join(resultsDir, d, 'summary.json');
    if (fs.existsSync(p)) return { path: p, data: JSON.parse(fs.readFileSync(p, 'utf-8')) as WildSummary };
  }
  return null;
}

// ---------------------------------------------------------------------------
// PER-RULE BACKFIRE DETECTION (Gap H)
// ---------------------------------------------------------------------------
// Aggregate per-rule Wild hit counts from per-repo/<repo>/per-rule.json files.
// On --update-baseline this is recorded into baseline.json. On every other
// run we diff against it to surface "this PR shifted N hits on rule X" so
// reviewers can spot cross-bench tradeoffs (e.g. fewer Edge hits but more
// Juliet recall drops) that the per-bench gates don't catch individually.

function aggregatePerRuleHits(dateDir: string): Record<string, number> {
  const perRepoDir = path.join(dateDir, 'per-repo');
  if (!fs.existsSync(perRepoDir)) return {};
  const out: Record<string, number> = {};
  for (const repoDir of fs.readdirSync(perRepoDir)) {
    const f = path.join(perRepoDir, repoDir, 'per-rule.json');
    if (!fs.existsSync(f)) continue;
    let data: Record<string, { hits?: number }> = {};
    try {
      data = JSON.parse(fs.readFileSync(f, 'utf-8'));
    } catch {
      continue;
    }
    for (const [rule, entry] of Object.entries(data)) {
      out[rule] = (out[rule] ?? 0) + (entry?.hits ?? 0);
    }
  }
  return out;
}

interface RuleDelta {
  rule: string;
  baseline: number;
  current: number;
  delta: number;
}

function computeRuleDeltas(
  baselineHits: Record<string, number>,
  currentHits: Record<string, number>,
): RuleDelta[] {
  const all = new Set([...Object.keys(baselineHits), ...Object.keys(currentHits)]);
  const deltas: RuleDelta[] = [];
  for (const rule of all) {
    const b = baselineHits[rule] ?? 0;
    const c = currentHits[rule] ?? 0;
    if (b === c) continue;
    deltas.push({ rule, baseline: b, current: c, delta: c - b });
  }
  return deltas.toSorted((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function loadJson<T>(p: string): T | null {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
  } catch {
    return null;
  }
}

const current = loadLatestWildSummary();
if (!current) {
  console.error('❌ No ILB-Wild summary found under benchmark-results/<date>/.');
  console.error('   Run `npm run ilb:wild` first.');
  process.exit(2);
}

// Load current LLM bench results too — they may not exist yet.
const currentLlmTokens = loadJson<LlmTokensResult>(
  path.join(BENCH_RESULTS, 'ilb-llm-tokens', 'latest.json'),
);
const currentLlmFix = loadJson<LlmFixResult>(
  path.join(BENCH_RESULTS, 'ilb-llm-fix', 'latest.json'),
);

/*
 * "Latest dated directory" falls back to whatever summary is committed when
 * this run produced none. In CI that is exactly what happened from the Turbo
 * migration (2026-05-11) on: every `tsx scripts/ilb-wild.ts` died with
 * `tsx: command not found`, the loop swallowed it, and the check compared the
 * committed 2026-08-03 summary against the committed 2026-05-03 baseline —
 * the same two files every week, measuring nothing. --expect-repos is how a
 * caller says which run it is checking.
 */
if (EXPECT_REPOS.length > 0) {
  const succeeded = new Set(
    current.data.repos.filter((r) => r.success && !parseHealthProblem(r)).map((r) => r.repo),
  );
  const missing = EXPECT_REPOS.filter((r) => !succeeded.has(r));
  if (missing.length > 0) {
    console.error(
      `❌ ${path.relative(ROOT, current.path)} has no successful result for: ${missing.join(', ')}.`,
    );
    console.error('   Either ILB-Wild did not run for them or the summary is not from this run.');
    console.error('   Refusing to compare numbers that were not measured.');
    process.exit(2);
  }
}
if (SUMMARY_ONLY) {
  console.log(
    `✅ ${path.relative(ROOT, current.path)} holds a successful result for every expected repo (${EXPECT_REPOS.join(', ') || 'none named'}).`,
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// UPDATE BASELINE MODE
// ---------------------------------------------------------------------------

function writeBaseline(): void {
  if (!current) return;
  // Add per-rule snapshot for backfire detection (Gap H).
  const dataWithPerRule = current.data as WildSummary & { perRuleWildHits?: Record<string, number> };
  dataWithPerRule.perRuleWildHits = aggregatePerRuleHits(path.dirname(current.path));
  fs.writeFileSync(baselinePath, JSON.stringify(dataWithPerRule, null, 2));
  console.log(`✅ Wild baseline updated: ${path.relative(ROOT, baselinePath)}`);
  console.log(`   Source: ${path.relative(ROOT, current.path)}`);
  console.log(`   Per-rule snapshot: ${Object.keys(dataWithPerRule.perRuleWildHits).length} rules`);

  // Also baseline the LLM benches if their results exist.
  const llmBaseline: LlmBaseline = {};
  if (currentLlmTokens) llmBaseline.llmTokens = currentLlmTokens;
  if (currentLlmFix) llmBaseline.llmFix = currentLlmFix;
  if (Object.keys(llmBaseline).length > 0) {
    fs.writeFileSync(llmBaselinePath, JSON.stringify(llmBaseline, null, 2));
    console.log(`✅ LLM baseline updated: ${path.relative(ROOT, llmBaselinePath)}`);
  } else {
    console.log('   (no LLM bench results found — skipping LLM baseline)');
  }
}

// Nothing to ratchet against yet: the first baseline is a bootstrap.
if (UPDATE_BASELINE && !fs.existsSync(baselinePath)) {
  writeBaseline();
  process.exit(0);
}

if (!fs.existsSync(baselinePath)) {
  console.error(`❌ Baseline not found: ${path.relative(ROOT, baselinePath)}`);
  console.error('   Bootstrap with: tsx scripts/ilb-regression-check.ts --update-baseline');
  process.exit(2);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8')) as WildSummary;
const llmBaseline = loadJson<LlmBaseline>(llmBaselinePath);

// ---------------------------------------------------------------------------
// COMPARISON
// ---------------------------------------------------------------------------

const fails: string[] = [];
const warns: string[] = [];
const oks: string[] = [];

const cur = current.data;
const base = baseline;

const baseByRepo = Object.fromEntries(base.repos.map((r) => [r.repo, r]));
const unmeasured: string[] = [];
for (const r of cur.repos) {
  if (!r.success) continue;
  const parseProblem = parseHealthProblem(r);
  if (parseProblem) {
    unmeasured.push(`${r.repo}: ${parseProblem}`);
    fails.push(`${r.repo}: not a measurement — ${parseProblem}`);
    continue;
  }
  const b = baseByRepo[r.repo];
  if (!b || !b.success) {
    oks.push(`${r.repo}: new repo (no baseline) — recorded`);
    continue;
  }

  if (b.timing?.msPerFile && r.timing?.msPerFile) {
    const delta = ((r.timing.msPerFile - b.timing.msPerFile) / b.timing.msPerFile) * 100;
    if (delta > THRESHOLDS.msPerFileRegressionPct) {
      fails.push(
        `${r.repo}: ms/file regressed +${delta.toFixed(1)}% (${b.timing.msPerFile} → ${r.timing.msPerFile}); SLO ≤ ${THRESHOLDS.msPerFileRegressionPct}%`,
      );
    } else {
      oks.push(
        `${r.repo}: ms/file ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% (${b.timing.msPerFile} → ${r.timing.msPerFile})`,
      );
    }
  }

  if (b.findings?.densityPerKloc != null && r.findings?.densityPerKloc != null) {
    const denom = Math.max(b.findings.densityPerKloc, 0.01);
    const delta = ((r.findings.densityPerKloc - b.findings.densityPerKloc) / denom) * 100;
    if (Math.abs(delta) > THRESHOLDS.densityDeltaPct) {
      warns.push(
        `${r.repo}: findings density ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% (${b.findings.densityPerKloc} → ${r.findings.densityPerKloc}/kLoC) — investigate (new rule? FP fix? code change?)`,
      );
    }
  }

  if (b.peakRssMb && r.peakRssMb) {
    const delta = ((r.peakRssMb - b.peakRssMb) / b.peakRssMb) * 100;
    if (delta > THRESHOLDS.peakRssRegressionPct) {
      warns.push(`${r.repo}: peak RSS +${delta.toFixed(1)}% (${b.peakRssMb} → ${r.peakRssMb}MB)`);
    }
  }

  for (const [p, c] of Object.entries(r.pluginCoverage ?? {})) {
    const bc = b.pluginCoverage?.[p];
    if (!bc) continue;
    const drop = bc.activationRate - c.activationRate;
    if (drop > THRESHOLDS.pluginCoverageDropPp) {
      fails.push(
        `${r.repo} / ${p}: activation dropped ${drop.toFixed(1)}pp (${bc.activationRate}% → ${c.activationRate}%); SLO drop ≤ ${THRESHOLDS.pluginCoverageDropPp}pp`,
      );
    }
  }
}

// Aggregate corpus density.
if (base.aggregate?.avgDensityPerKloc != null && cur.aggregate?.avgDensityPerKloc != null) {
  const denom = Math.max(base.aggregate.avgDensityPerKloc, 0.01);
  const delta = ((cur.aggregate.avgDensityPerKloc - base.aggregate.avgDensityPerKloc) / denom) * 100;
  if (Math.abs(delta) > THRESHOLDS.corpusDensityDeltaPct) {
    warns.push(
      `corpus avg density ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% (${base.aggregate.avgDensityPerKloc} → ${cur.aggregate.avgDensityPerKloc}/kLoC)`,
    );
  } else {
    oks.push(
      `corpus avg density ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% (within ±${THRESHOLDS.corpusDensityDeltaPct}%)`,
    );
  }
}

// ILB-Cov drop.
const sumRollup = (rollup?: Record<string, PluginRollupEntry>): number => {
  const fired = Object.values(rollup ?? {}).reduce((s, p) => s + p.rulesEverFired, 0);
  const total = Object.values(rollup ?? {}).reduce((s, p) => s + p.totalRules, 0);
  return total ? (fired / total) * 100 : 0;
};
const baseCov = sumRollup(base.pluginRollup);
const curCov = sumRollup(cur.pluginRollup);
if (baseCov > 0) {
  const drop = baseCov - curCov;
  if (drop > THRESHOLDS.covRateDropPp) {
    fails.push(
      `ILB-Cov dropped ${drop.toFixed(1)}pp (${baseCov.toFixed(1)}% → ${curCov.toFixed(1)}%); SLO drop ≤ ${THRESHOLDS.covRateDropPp}pp`,
    );
  } else {
    oks.push(
      `ILB-Cov ${curCov - baseCov >= 0 ? '+' : ''}${(curCov - baseCov).toFixed(1)}pp (${baseCov.toFixed(1)}% → ${curCov.toFixed(1)}%)`,
    );
  }
}

// ---------------------------------------------------------------------------
// LLM BENCH GATES
// ---------------------------------------------------------------------------

if (llmBaseline?.llmTokens && currentLlmTokens) {
  // Gate on security/v2-compact specifically — that's the cell V2 is
  // designed to win on cost. Aggregate v2-compact mixes in quality + perf
  // fixtures that intentionally carry V2-only context, so an aggregate
  // gate would penalize V2 for delivering more in those categories.
  const baseSec = llmBaseline.llmTokens.perCategoryScore?.['security']?.['v2-compact'];
  const curSec = currentLlmTokens.perCategoryScore?.['security']?.['v2-compact'];
  if (typeof baseSec === 'number' && typeof curSec === 'number') {
    const worsenedPp = curSec - baseSec;
    if (worsenedPp > THRESHOLDS.llmTokensCompactWorseningPp) {
      fails.push(
        `ILB-LLM-Tokens security/v2-compact got ${worsenedPp.toFixed(1)}pp worse (${baseSec}% → ${curSec}% vs V1); SLO ≤ +${THRESHOLDS.llmTokensCompactWorseningPp}pp`,
      );
    } else {
      oks.push(
        `ILB-LLM-Tokens security/v2-compact ${worsenedPp >= 0 ? '+' : ''}${worsenedPp.toFixed(1)}pp (${baseSec}% → ${curSec}%)`,
      );
    }
  } else {
    // Fallback when baseline pre-dates the per-category split.
    const baseAgg = llmBaseline.llmTokens.headlineScore?.['v2-compact'];
    const curAgg = currentLlmTokens.headlineScore?.['v2-compact'];
    if (typeof baseAgg === 'number' && typeof curAgg === 'number') {
      const worsenedPp = curAgg - baseAgg;
      if (worsenedPp > THRESHOLDS.llmTokensCompactWorseningPp) {
        fails.push(
          `ILB-LLM-Tokens v2-compact (aggregate) got ${worsenedPp.toFixed(1)}pp worse (${baseAgg}% → ${curAgg}% vs V1); SLO ≤ +${THRESHOLDS.llmTokensCompactWorseningPp}pp — re-baseline once both runs have perCategoryScore for a tighter gate`,
        );
      } else {
        oks.push(
          `ILB-LLM-Tokens v2-compact (aggregate) ${worsenedPp >= 0 ? '+' : ''}${worsenedPp.toFixed(1)}pp (${baseAgg}% → ${curAgg}%) — re-baseline for security/compact gating`,
        );
      }
    }
  }
} else if (currentLlmTokens && !llmBaseline?.llmTokens) {
  oks.push('ILB-LLM-Tokens: no baseline yet — recorded');
}

if (llmBaseline?.llmFix && currentLlmFix) {
  const baseScore = llmBaseline.llmFix.headlineScore;
  const curScore = currentLlmFix.headlineScore;
  if (typeof baseScore === 'number' && typeof curScore === 'number') {
    const drop = baseScore - curScore;
    if (drop > THRESHOLDS.llmFixPassRateDropPp) {
      fails.push(
        `ILB-LLM-Fix headline pass rate dropped ${drop.toFixed(1)}pp (${baseScore}% → ${curScore}%); SLO drop ≤ ${THRESHOLDS.llmFixPassRateDropPp}pp`,
      );
    } else {
      oks.push(
        `ILB-LLM-Fix ${curScore - baseScore >= 0 ? '+' : ''}${(curScore - baseScore).toFixed(1)}pp (${baseScore}% → ${curScore}%)`,
      );
    }
  }
} else if (currentLlmFix && !llmBaseline?.llmFix) {
  oks.push('ILB-LLM-Fix: no baseline yet — recorded');
}

// ---------------------------------------------------------------------------
// PER-RULE BACKFIRE DETECTION REPORT (Gap H)
// ---------------------------------------------------------------------------

const baselineRulesSnapshot =
  (baseline as WildSummary & { perRuleWildHits?: Record<string, number> }).perRuleWildHits;
const currentRulesSnapshot = aggregatePerRuleHits(path.dirname(current.path));
let ruleDeltaSection = '';
if (baselineRulesSnapshot && Object.keys(baselineRulesSnapshot).length > 0) {
  const deltas = computeRuleDeltas(baselineRulesSnapshot, currentRulesSnapshot);
  const significant = deltas.filter((d) => Math.abs(d.delta) >= 25);

  if (significant.length === 0) {
    ruleDeltaSection = '\n🔄 Per-rule deltas: no rule shifted by ≥ 25 hits since baseline.\n';
  } else {
    const risers = significant.filter((d) => d.delta > 0).slice(0, 5);
    const fallers = significant.filter((d) => d.delta < 0).slice(0, 5);
    ruleDeltaSection = '\n🔄 Per-rule deltas (Wild corpus, ≥ 25 hits change):\n';
    if (fallers.length) {
      ruleDeltaSection += '   Rules firing LESS than baseline (FP fixes? recall drift?):\n';
      for (const d of fallers) {
        ruleDeltaSection += `     ${d.rule.padEnd(60)} ${d.baseline} → ${d.current} (${d.delta > 0 ? '+' : ''}${d.delta})\n`;
      }
    }
    if (risers.length) {
      ruleDeltaSection += '   Rules firing MORE than baseline (regression? new coverage?):\n';
      for (const d of risers) {
        ruleDeltaSection += `     ${d.rule.padEnd(60)} ${d.baseline} → ${d.current} (+${d.delta})\n`;
      }
    }
    ruleDeltaSection +=
      '\n   ℹ️  These are info-level. Cross-reference with Arena/Juliet F1 deltas to spot backfires:\n' +
      '      "Edge hits dropped 200 + Juliet F1 dropped 2pp" = the FP fix may have cost recall.\n';

    // Hard-fail backfire heuristic: a rule that gained ≥ 100 hits on Wild
    // AND has zero synthetic-bench coverage is shipping unmeasured noise.
    const arenaPath = latestFileInDir(path.join(BENCH_RESULTS, 'ilb-arena'));
    const julietPath = latestFileInDir(path.join(BENCH_RESULTS, 'ilb-cwe-corpus'));
    const measured = new Set<string>();
    for (const p of [arenaPath, julietPath]) {
      if (!p) continue;
      const raw = fs.readFileSync(p, 'utf-8');
      const m = raw.match(/"[a-z][a-z0-9-]*\/[a-z][a-z0-9-/]*"/gi) ?? [];
      for (const x of m) measured.add(x.slice(1, -1));
    }
    const unmeasuredRisers = significant.filter(
      (d) => d.delta >= 100 && !measured.has(d.rule),
    );
    if (unmeasuredRisers.length > 0) {
      for (const d of unmeasuredRisers) {
        warns.push(
          `Rule \`${d.rule}\` gained ${d.delta} Wild hits but has no Arena/Juliet fixture — unmeasured FP risk`,
        );
      }
    }
  }
}

function latestFileInDir(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const entries = fs
    .readdirSync(dir)
    .filter((e) => /^\d{4}-\d{2}-\d{2}\.json$/.test(e))
    .toSorted()
    .toReversed();
  return entries[0] ? path.join(dir, entries[0]) : null;
}

// ---------------------------------------------------------------------------
// REPORT
// ---------------------------------------------------------------------------

console.log('\n🏁 ILB Regression Check');
console.log(`   current  → ${path.relative(ROOT, current.path)} (${cur.date})`);
console.log(`   baseline → ${path.relative(ROOT, baselinePath)} (${base.date})\n`);

if (oks.length) {
  console.log('✅ OK:');
  for (const m of oks) console.log(`   ${m}`);
}
if (warns.length) {
  console.log('\n⚠️  Warnings:');
  for (const m of warns) console.log(`   ${m}`);
}
if (fails.length) {
  console.log('\n❌ Failures:');
  for (const m of fails) console.log(`   ${m}`);
}

if (ruleDeltaSection) console.log(ruleDeltaSection);

/*
 * The ratchet. --update-baseline used to overwrite unconditionally, so the
 * baseline could move backwards two ways: a run that regressed became the new
 * floor, and a smoke run over 3 repos replaced the 22-repo corpus — after
 * which the other 19 repos were "new repo (no baseline)" forever and never
 * compared again. Both are refused unless explicitly overridden.
 */
if (UPDATE_BASELINE) {
  // No override: a repo that was not linted cannot become anybody's floor.
  if (unmeasured.length > 0) {
    console.error(`\n🚫 Baseline NOT updated: ${unmeasured.length} repo result(s) did not measure their code:`);
    for (const m of unmeasured) console.error(`   ${m}`);
    console.error('   Fix the parser configuration in scripts/ilb-wild.ts and re-run those repos.');
    process.exit(2);
  }
  const covered = new Set(
    cur.repos.filter((r) => r.success && !parseHealthProblem(r)).map((r) => r.repo),
  );
  const dropped = base.repos.filter((r) => r.success && !covered.has(r.repo)).map((r) => r.repo);
  if (dropped.length > 0 && !ALLOW_SHRINK) {
    console.error(
      `\n🚫 Baseline NOT updated: this run has no successful result for ${dropped.length} repo(s) the baseline covers:`,
    );
    console.error(`   ${dropped.join(', ')}`);
    console.error('   Run the full corpus (`npm run ilb:wild`) first, or pass --allow-shrink if the');
    console.error('   corpus itself shrank on purpose.');
    process.exit(2);
  }
  if (fails.length > 0 && !ACCEPT_REGRESSIONS) {
    console.error(
      `\n🚫 Baseline NOT updated: ${fails.length} hard regression(s) above would become the new floor.`,
    );
    console.error('   Fix them, or pass --accept-regressions and justify the re-record in the PR.');
    process.exit(1);
  }
  console.log('');
  writeBaseline();
  process.exit(0);
}

const hardFail = fails.length > 0;
const softFail = STRICT && warns.length > 0;

console.log('');
if (hardFail || softFail) {
  console.log(
    `🚫 Regression check ${hardFail ? 'FAILED' : 'FAILED (strict mode)'}: ${fails.length} failure(s), ${warns.length} warning(s)`,
  );
  process.exit(1);
}

console.log(`✨ Regression check passed: ${warns.length} warning(s), ${fails.length} failure(s)`);
