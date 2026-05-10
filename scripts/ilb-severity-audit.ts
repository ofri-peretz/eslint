#!/usr/bin/env -S npx tsx

/**
 * ILB Severity Calibration Audit (Gap I) — checks every rule's emitted
 * severity ('error' vs 'warn') against the policy in benchmarks/README.md
 * §1 ("Severity classification policy"):
 *
 *   error: requires precision ≥ 95% on Wild + Arena, ≥ 4 fixtures, ≥ 90 days
 *   warn:  requires precision ≥ 70% on Wild
 *
 * Hard precision can only be computed with ground-truth labels (we don't
 * have them on Wild yet — see FP_FN_REMEDIATION_TRACKER.md §4 P2 #7).
 * What this script CAN compute today, from existing JSONs:
 *
 *   - **Edge-error risk**: rule emitted as `error` AND the majority of its
 *     Wild hits are on `fpEdge: true` repos. Edge repos are adversarial-
 *     real — high FP probability. An `error` here trains devs to ignore
 *     CI failures.
 *   - **Volume-error risk**: rule emitted as `error` AND fires > 100 times
 *     on Wild without Arena/Juliet fixture coverage. Cannot meet the
 *     promotion gate (≥ 4 fixtures requirement) — should be demoted to
 *     `warn` until coverage is added.
 *   - **Promotion-eligible**: rule at `warn` with high Arena+Juliet TP
 *     density and zero Edge hits. Candidate for human review for `error`
 *     promotion.
 *
 * Inputs:
 *   benchmark-results/<latest>/per-repo/<repo>/per-rule.json (per-rule samples with severity)
 *   benchmark-results/<latest>/summary.json (fpEdge flags per repo)
 *   benchmarks/results/ilb-arena/<latest>.json (rule names appearing in Arena)
 *   benchmarks/results/ilb-juliet/<latest>.json (rule names appearing in Juliet)
 *
 * Output: benchmark-results/severity-audit.json + a printed summary.
 * Exit non-zero only if an `error`-level rule has a high-risk indicator.
 *
 * Usage:
 *   node scripts/ilb-severity-audit.mjs
 *   node scripts/ilb-severity-audit.mjs --print
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS_DIR = path.join(ROOT, 'benchmark-results');
const BENCH_RESULTS = path.join(ROOT, 'benchmarks', 'results');
const REPORT_PATH = path.join(RESULTS_DIR, 'severity-audit.json');

const args = process.argv.slice(2);
const PRINT = args.includes('--print');

function latestWildDir() {
  if (!fs.existsSync(RESULTS_DIR)) return null;
  const dirs = fs
    .readdirSync(RESULTS_DIR)
    .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e))
    .filter((e) => fs.statSync(path.join(RESULTS_DIR, e)).isDirectory())
    .sort()
    .reverse();
  for (const d of dirs) {
    if (fs.existsSync(path.join(RESULTS_DIR, d, 'summary.json'))) return path.join(RESULTS_DIR, d);
  }
  return null;
}

function latestBenchFile(name) {
  const dir = path.join(BENCH_RESULTS, name);
  if (!fs.existsSync(dir)) return null;
  const entries = fs
    .readdirSync(dir)
    .filter((e) => /^\d{4}-\d{2}-\d{2}\.json$/.test(e))
    .sort()
    .reverse();
  return entries[0] ? path.join(dir, entries[0]) : null;
}

function extractRuleNames(filePath) {
  if (!filePath) return new Set();
  const raw = fs.readFileSync(filePath, 'utf-8');
  const matches = raw.match(/"[a-z][a-z0-9-]*\/[a-z][a-z0-9-/]*"/gi) ?? [];
  return new Set(matches.map((m) => m.slice(1, -1)));
}

const dateDir = latestWildDir();
if (!dateDir) {
  console.error('No Wild summary found — run `npm run ilb:wild` first.');
  process.exit(2);
}
const summary = JSON.parse(fs.readFileSync(path.join(dateDir, 'summary.json'), 'utf-8'));
const fpEdgeRepos = new Set(
  (summary.repos ?? []).filter((r) => r.fpEdge).map((r) => r.repo),
);

const arenaRules = extractRuleNames(latestBenchFile('ilb-arena'));
const julietRules = extractRuleNames(latestBenchFile('ilb-juliet'));

// Aggregate per-rule across Wild repos
const perRule = new Map();
const perRepoDir = path.join(dateDir, 'per-repo');
for (const repoDir of fs.readdirSync(perRepoDir)) {
  const isEdge = fpEdgeRepos.has(repoDir);
  const f = path.join(perRepoDir, repoDir, 'per-rule.json');
  if (!fs.existsSync(f)) continue;
  let data: Record<string, any> = {};
  try { data = JSON.parse(fs.readFileSync(f, 'utf-8')); } catch { continue; }
  for (const [rule, entry] of Object.entries(data) as Array<[string, any]>) {
    if (!perRule.has(rule)) {
      perRule.set(rule, { totalHits: 0, errorHits: 0, warnHits: 0, edgeHits: 0, nonEdgeHits: 0, repos: new Set() });
    }
    const a = perRule.get(rule);
    a.totalHits += entry.hits ?? 0;
    a.repos.add(repoDir);
    for (const s of entry.samples ?? []) {
      if (s.severity === 'error') a.errorHits++;
      else if (s.severity === 'warn' || s.severity === 'warning') a.warnHits++;
      if (isEdge) a.edgeHits++;
      else a.nonEdgeHits++;
    }
    if (isEdge) a.edgeHits += Math.max(0, (entry.hits ?? 0) - (entry.samples?.length ?? 0));
    else a.nonEdgeHits += Math.max(0, (entry.hits ?? 0) - (entry.samples?.length ?? 0));
  }
}

// Classify each rule
const findings = {
  edgeErrorRisk: [], // error-level rule, mostly Edge hits → suspect FP
  volumeErrorRisk: [], // error-level rule, high volume, no fixture coverage
  promotionEligible: [], // warn-level rule, fixture-covered, no Edge hits
  unmeasuredErrorLevel: [], // error-level rule, no Arena/Juliet coverage at all
};

for (const [rule, a] of perRule.entries()) {
  const dominantSeverity = a.errorHits > a.warnHits ? 'error' : a.warnHits > a.errorHits ? 'warn' : 'mixed';
  const measured = arenaRules.has(rule) || julietRules.has(rule);
  const edgeRatio = a.totalHits > 0 ? a.edgeHits / a.totalHits : 0;

  // (A) Edge-dominated error-level rule
  if (dominantSeverity === 'error' && a.totalHits >= 20 && edgeRatio >= 0.5) {
    findings.edgeErrorRisk.push({ rule, totalHits: a.totalHits, edgeHits: a.edgeHits, edgeRatio: +edgeRatio.toFixed(2) });
  }
  // (B) High-volume error-level rule with no fixture coverage
  if (dominantSeverity === 'error' && a.totalHits >= 100 && !measured) {
    findings.volumeErrorRisk.push({ rule, totalHits: a.totalHits, repos: a.repos.size });
  }
  // (C) Error-level rule with no fixture coverage at all
  if (dominantSeverity === 'error' && !measured) {
    findings.unmeasuredErrorLevel.push({ rule, totalHits: a.totalHits });
  }
  // (D) Warn-level rule that is well-measured and never fires on Edge → promotion candidate
  if (dominantSeverity === 'warn' && measured && a.edgeHits === 0 && a.totalHits >= 5) {
    findings.promotionEligible.push({ rule, totalHits: a.totalHits, repos: a.repos.size });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  policy: {
    errorPrecisionFloor: 0.95,
    warnPrecisionFloor: 0.7,
    note: 'Hard precision needs ground-truth labels on Wild; this audit uses indirect indicators (Edge ratio, fixture coverage, volume).',
  },
  totals: {
    rulesAnalyzed: perRule.size,
    edgeErrorRisk: findings.edgeErrorRisk.length,
    volumeErrorRisk: findings.volumeErrorRisk.length,
    unmeasuredErrorLevel: findings.unmeasuredErrorLevel.length,
    promotionEligible: findings.promotionEligible.length,
  },
  findings,
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

console.log(`✅ ${path.relative(ROOT, REPORT_PATH)}`);
console.log(
  `   ${perRule.size} rules · ${findings.edgeErrorRisk.length} edge-error risks · ${findings.volumeErrorRisk.length} volume-error risks · ${findings.unmeasuredErrorLevel.length} unmeasured @ error · ${findings.promotionEligible.length} promotion-eligible`,
);

if (PRINT) {
  for (const [name, list] of Object.entries(findings)) {
    if (list.length === 0) continue;
    console.log(`\n--- ${name} ---`);
    for (const item of list.slice(0, 10)) {
      console.log(`  ${JSON.stringify(item)}`);
    }
  }
}

const hardFail = findings.edgeErrorRisk.length + findings.volumeErrorRisk.length > 0;
process.exit(hardFail ? 1 : 0);
