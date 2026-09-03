#!/usr/bin/env -S npx tsx
/**
 * check-per-rule-budget — enforce the per-rule p50/p95 latency budgets
 * defined in `benchmarks/budgets/per-rule-p95.json` against the latest
 * ILB-Flagship measurement.
 *
 * Closes the §3 "Per-rule p95 budget enforcement" top-priority gap in
 * `distribution/EVALUATION_METRICS.md`.
 *
 * Behavior:
 *   - Loads the budget file.
 *   - Finds the latest `benchmarks/results/ilb-flagship/<date>.json`.
 *   - For each rule in the budget, looks up the measured p50/p95.
 *   - Fails (exit 1) if any rule exceeds budget × (1 + tolerance%).
 *   - Renders a report at `benchmark-results/per-rule-budget-check.md`.
 *
 * Designed to be run in CI on PR + nightly. Local invocation:
 *   npm run check:per-rule-budget
 *   npm run check:per-rule-budget -- --soft   # report but don't fail
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { callout, howToRead, kvSummary, reportHeader, table } from './lib/report-format.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const BUDGET_PATH = path.join(REPO_ROOT, 'benchmarks', 'budgets', 'per-rule-p95.json');
const FLAGSHIP_DIR = path.join(REPO_ROOT, 'benchmarks', 'results', 'ilb-flagship');
const REPORT_PATH = path.join(REPO_ROOT, 'benchmark-results', 'per-rule-budget-check.md');

interface RuleBudget {
  p50_ms: number;
  p95_ms: number;
  note?: string;
}

interface Budget {
  policy: {
    p50_default_ms: number;
    p95_default_ms: number;
    p95_hard_ceiling_ms: number;
    tolerance_pct: number;
  };
  rules: Record<string, RuleBudget>;
  lastValidated: string;
  source: string;
}

/**
 * A row from the latest flagship JSON. We accept a permissive shape so the
 * downstream JSON schema can evolve without breaking the gate immediately;
 * unknown shapes degrade gracefully (the rule shows as "no measurement").
 */
interface FlagshipMeasurement {
  ruleId: string;
  p50_ms?: number;
  p95_ms?: number;
}

interface RuleResult {
  ruleId: string;
  budgetP50: number;
  budgetP95: number;
  measuredP50: number | null;
  measuredP95: number | null;
  status: 'ok' | 'over_p50' | 'over_p95' | 'over_hard_ceiling' | 'no_measurement';
  details: string;
}

export function findLatestFlagshipResult(dir: string): { path: string; date: string } | null {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  if (files.length === 0) return null;
  const latest = files[files.length - 1];
  return { path: path.join(dir, latest), date: latest.replace(/\.json$/, '') };
}

/**
 * Walk an arbitrary JSON shape and extract any object that looks like a
 * rule measurement. ILB-Flagship's schema has gone through several
 * versions; this function bridges them with conservative heuristics:
 *
 *   - v1 (flat) — `{ ruleId, p50_ms, p95_ms }` per row.
 *   - v2 (current, `ilb-flagship/v2`) — `{ rule, repo, runs: { oursEslint: { cold: { ms }, warm: { ms } } } }`.
 *
 * For v2 we group samples by rule, then compute p50 / p95 across the
 * available samples. When there's only one sample per rule (current
 * corpus state), p50 and p95 both equal that sample — which is the
 * honest answer the bench can give until we run multiple repos per rule.
 *
 * We use the `oursEslint.cold` series for the headline measurement; the
 * budget gates correctness of our rule, not the engine. `warm` is
 * available in the JSON but only relevant to cache-aware metrics.
 */
function percentile(samples: number[], q: number): number {
  if (samples.length === 0) return NaN;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q));
  return sorted[idx];
}

export function extractMeasurements(json: unknown): FlagshipMeasurement[] {
  // Detect the v2 schema and route to a dedicated extractor.
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const root = json as Record<string, unknown>;
    if (typeof root.schema === 'string' && root.schema.startsWith('ilb-flagship/')) {
      return extractFromFlagshipV2(root);
    }
  }
  return extractFromFlatShape(json);
}

function extractFromFlagshipV2(root: Record<string, unknown>): FlagshipMeasurement[] {
  // The v2 schema records `runs.<engine>.cold.ms` as the total wall time
  // for one (rule × repo) cell, plus `filesProcessed`. To compare against
  // per-rule budgets (which are per-evaluation, not per-corpus), we
  // normalize: meanPerFileMs = ms / filesProcessed. Until we instrument
  // per-call timing, mean-per-file is our best single-number estimate of
  // per-call cost. We report this for both p50 (it's the mean, a
  // defensible center-of-distribution estimate) and treat the single
  // sample as the p95 ceiling (no distribution data available).
  const results = Array.isArray(root.results) ? (root.results as unknown[]) : [];
  const buckets = new Map<string, number[]>();
  for (const cell of results) {
    if (!cell || typeof cell !== 'object') continue;
    const c = cell as Record<string, unknown>;
    const ruleId = typeof c.rule === 'string' ? c.rule : null;
    if (!ruleId) continue;
    const runs = c.runs as Record<string, unknown> | undefined;
    const ours = runs?.oursEslint as { cold?: { ms?: unknown; filesProcessed?: unknown } } | undefined;
    const ms = ours?.cold?.ms;
    const fp = ours?.cold?.filesProcessed;
    if (typeof ms !== 'number' || Number.isNaN(ms) || ms <= 0) continue;
    if (typeof fp !== 'number' || fp <= 0) continue;
    const perFileMs = ms / fp;
    let arr = buckets.get(ruleId);
    if (!arr) {
      arr = [];
      buckets.set(ruleId, arr);
    }
    arr.push(perFileMs);
  }
  const out: FlagshipMeasurement[] = [];
  for (const [ruleId, samples] of buckets) {
    out.push({
      ruleId,
      p50_ms: Math.round(percentile(samples, 0.5)),
      p95_ms: Math.round(percentile(samples, 0.95)),
    });
  }
  return out;
}

function extractFromFlatShape(json: unknown): FlagshipMeasurement[] {
  const out: FlagshipMeasurement[] = [];
  const seen = new Set<string>();
  const visit = (node: unknown) => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const x of node) visit(x);
      return;
    }
    const obj = node as Record<string, unknown>;
    const ruleId =
      typeof obj.ruleId === 'string'
        ? obj.ruleId
        : typeof obj.rule === 'string'
          ? obj.rule
          : typeof obj.id === 'string'
            ? obj.id
            : null;
    if (ruleId && !seen.has(ruleId)) {
      const p50 =
        typeof obj.p50_ms === 'number'
          ? obj.p50_ms
          : typeof obj.p50 === 'number'
            ? obj.p50
            : typeof obj.median_ms === 'number'
              ? obj.median_ms
              : undefined;
      const p95 =
        typeof obj.p95_ms === 'number'
          ? obj.p95_ms
          : typeof obj.p95 === 'number'
            ? obj.p95
            : undefined;
      if (typeof p50 === 'number' || typeof p95 === 'number') {
        out.push({ ruleId, p50_ms: p50, p95_ms: p95 });
        seen.add(ruleId);
      }
    }
    for (const v of Object.values(obj)) visit(v);
  };
  visit(json);
  return out;
}

export function evaluateBudget(
  budget: Budget,
  measurements: FlagshipMeasurement[],
): RuleResult[] {
  const byRule = new Map<string, FlagshipMeasurement>();
  for (const m of measurements) byRule.set(m.ruleId, m);
  const tolerance = 1 + budget.policy.tolerance_pct / 100;
  const results: RuleResult[] = [];
  for (const [ruleId, b] of Object.entries(budget.rules)) {
    const m = byRule.get(ruleId);
    if (!m || (m.p50_ms === undefined && m.p95_ms === undefined)) {
      results.push({
        ruleId,
        budgetP50: b.p50_ms,
        budgetP95: b.p95_ms,
        measuredP50: null,
        measuredP95: null,
        status: 'no_measurement',
        details: 'No matching rule in the latest ILB-Flagship JSON.',
      });
      continue;
    }
    const p50 = m.p50_ms ?? null;
    const p95 = m.p95_ms ?? null;
    let status: RuleResult['status'] = 'ok';
    const reasons: string[] = [];
    if (p95 !== null && p95 > budget.policy.p95_hard_ceiling_ms) {
      status = 'over_hard_ceiling';
      reasons.push(`p95=${p95}ms > hard ceiling ${budget.policy.p95_hard_ceiling_ms}ms`);
    } else if (p95 !== null && p95 > b.p95_ms * tolerance) {
      status = 'over_p95';
      reasons.push(`p95=${p95}ms > budget ${b.p95_ms}ms (×${tolerance.toFixed(2)})`);
    } else if (p50 !== null && p50 > b.p50_ms * tolerance) {
      status = 'over_p50';
      reasons.push(`p50=${p50}ms > budget ${b.p50_ms}ms (×${tolerance.toFixed(2)})`);
    }
    results.push({
      ruleId,
      budgetP50: b.p50_ms,
      budgetP95: b.p95_ms,
      measuredP50: p50,
      measuredP95: p95,
      status,
      details: reasons.join('; ') || 'within budget',
    });
  }
  return results;
}

function renderMarkdown(
  budget: Budget,
  resultsDate: string | null,
  results: RuleResult[],
): string {
  const overs = results.filter(
    (r) =>
      r.status === 'over_p50' ||
      r.status === 'over_p95' ||
      r.status === 'over_hard_ceiling',
  );
  const noMeasurement = results.filter((r) => r.status === 'no_measurement');
  const ok = results.length - overs.length - noMeasurement.length;
  const allPass = overs.length === 0;
  const asOf = new Date().toISOString().slice(0, 10);

  const sections: string[] = [];

  sections.push(
    reportHeader({
      title: 'Per-rule budget check',
      status: allPass ? 'pass' : 'fail',
      statusLabel: allPass
        ? `${ok}/${results.length} within budget`
        : `${overs.length}/${results.length} over budget`,
      headlineSentence: allPass
        ? `${ok}/${results.length} rules within budget · ${noMeasurement.length} unmeasured · tolerance **${budget.policy.tolerance_pct}%**.`
        : `${overs.length}/${results.length} rules over budget · ${noMeasurement.length} unmeasured · tolerance ${budget.policy.tolerance_pct}%.`,
      headlineMetric: { label: 'ok', value: `${ok}/${results.length}` },
      asOf,
      generatedBy: 'npm run check:per-rule-budget',
      sourceFile: 'benchmarks/budgets/per-rule-p95.json',
      extraMeta: `Measurements: ${resultsDate ? `ILB-Flagship ${resultsDate}` : '**NOT FOUND** — gate exits without measuring'}. Tolerance: ${budget.policy.tolerance_pct}% slack; p95 hard ceiling: ${budget.policy.p95_hard_ceiling_ms}ms.`,
    }),
  );

  sections.push('## Headline');
  sections.push('');
  sections.push(
    kvSummary([
      { key: 'Within budget', value: `${ok} / ${results.length}` },
      { key: 'Over budget', value: String(overs.length) },
      { key: 'No measurement', value: String(noMeasurement.length) },
      { key: 'Budget last validated', value: budget.lastValidated },
    ]),
  );
  sections.push('');

  if (!allPass) {
    const body = [
      `${overs.length} rule(s) exceeded budget:`,
      '',
      ...overs.map((r) => `- \`${r.ruleId}\` — ${r.details}`),
    ].join('\n');
    sections.push(callout('WARNING', body));
  }

  if (noMeasurement.length > 0) {
    const body = [
      `${noMeasurement.length} rule(s) have no measurement in the latest ILB-Flagship JSON — add a corpus cell for each before they can gate:`,
      '',
      ...noMeasurement.map((r) => `- \`${r.ruleId}\``),
    ].join('\n');
    sections.push(callout('NOTE', body));
  }

  sections.push('## Per-rule budget vs measurement');
  sections.push('');
  sections.push(
    table({
      head: ['Rule', 'Budget p50', 'Measured p50', 'Budget p95', 'Measured p95', 'Status'],
      align: ['left', 'right', 'right', 'right', 'right', 'left'],
      rows: results.map((r) => {
        const icon =
          r.status === 'ok' ? '✅' : r.status === 'no_measurement' ? '⚪️' : '❌';
        return [
          `\`${r.ruleId}\``,
          `${r.budgetP50}ms`,
          r.measuredP50 ?? '—',
          `${r.budgetP95}ms`,
          r.measuredP95 ?? '—',
          `${icon} ${r.status}`,
        ];
      }),
    }),
  );
  sections.push('');

  sections.push(
    howToRead(
      '- **Per-rule median cost (p50)** + **Per-rule p95 cost** (`distribution/EVALUATION_METRICS.md` §3) — the `Measured p50` / `Measured p95` columns vs `Budget p50` / `Budget p95`.\n- **Per-rule p95 budget enforcement** (§3 gap-closure) — this gate.\n- **Status legend:** ✅ within budget · ⚪️ no measurement (rule listed in budget but not yet in the latest flagship corpus) · ❌ over budget or over the hard ceiling.\n- **Tolerance** in `benchmarks/budgets/per-rule-p95.json` policy block lets noise-level regressions through; only persistent regressions beyond `(1 + tolerance_pct)` fail the gate.',
    ),
  );

  return sections.join('\n') + '\n';
}

function main() {
  const soft = process.argv.includes('--soft');
  const budget = JSON.parse(fs.readFileSync(BUDGET_PATH, 'utf8')) as Budget;
  const latest = findLatestFlagshipResult(FLAGSHIP_DIR);

  let measurements: FlagshipMeasurement[] = [];
  let resultsDate: string | null = null;
  if (latest) {
    const raw = JSON.parse(fs.readFileSync(latest.path, 'utf8'));
    measurements = extractMeasurements(raw);
    resultsDate = latest.date;
  }

  const results = evaluateBudget(budget, measurements);
  fs.writeFileSync(REPORT_PATH, renderMarkdown(budget, resultsDate, results));

  const overs = results.filter(
    (r) =>
      r.status === 'over_p50' ||
      r.status === 'over_p95' ||
      r.status === 'over_hard_ceiling',
  );
  const noMeasurement = results.filter((r) => r.status === 'no_measurement');

  // eslint-disable-next-line no-console
  console.log(
    `Per-rule budget: ${results.length - overs.length - noMeasurement.length}/${results.length} ok; ` +
      `${overs.length} over budget; ${noMeasurement.length} unmeasured.`,
  );
  // eslint-disable-next-line no-console
  console.log(`Wrote ${path.relative(REPO_ROOT, REPORT_PATH)}.`);
  for (const r of overs) {
    // eslint-disable-next-line no-console
    console.error(`  ❌ ${r.ruleId}: ${r.details}`);
  }
  if (overs.length > 0 && !soft) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('check-per-rule-budget.ts')) {
  main();
}
