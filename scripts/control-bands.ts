/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Stage 6 (Maintain) — the deterministic control-band watcher.
 *
 * Reads a metric's recent history, computes a mean and standard deviation over a
 * rolling window, applies Western Electric rules, and reports breaches by tier.
 *
 * **No model runs in the detection path.** That is the whole point of this file: the
 * decision that something is wrong has to be reproducible, reviewable and unit-tested,
 * or it cannot be trusted to invoke an agent unattended. Claude is what happens
 * *after* a breach, never what decides there was one.
 *
 * Why bands rather than thresholds. Every watcher this repo had before was pass/fail,
 * so it could only see a hard break. A rule that quietly loses two points of recall a
 * week, or a CI failure rate that drifts from 4% to 11% over a month, never trips a
 * boolean — and those are the failures that actually cost something, because nobody
 * is looking by the time they matter.
 *
 *   Rule 1  one point beyond 3σ                    → tier 3σ, act
 *   Rule 2  2 of 3 consecutive beyond 2σ, one side → tier 2σ, diagnose
 *   Rule 3  4 of 5 consecutive beyond 1σ, one side → tier 1σ, log
 *   Rule 4  8 consecutive on one side of the mean  → tier 1σ, log (drift)
 *
 * Tiers map to what may happen next, per AI_NATIVE_SDLC.md:
 *   1σ  log only
 *   2σ  Claude diagnoses in read-only mode
 *   3σ  Claude may act, via PR or a pre-approved runbook
 *
 * Usage:
 *   tsx scripts/control-bands.ts                 # report
 *   tsx scripts/control-bands.ts --check         # exit 1 on a 2σ+ breach
 *   tsx scripts/control-bands.ts --write-intent  # draft intent/<slug>/intent.md per breach
 *   tsx scripts/control-bands.ts --record        # append today's observations to the series
 *   tsx scripts/control-bands.ts --backfill-git  # also recover pruned runs from git history
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO_ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(REPO_ROOT, '.agent/control-bands.json');
const SERIES = path.join(REPO_ROOT, 'benchmark-results/control-band-series.json');
const INTENT_DIR = path.join(REPO_ROOT, 'intent');

export type Tier = '1σ' | '2σ' | '3σ';

export interface Observation {
  date: string;
  value: number;
}

export interface BandConfig {
  /** Stable identifier, also the intent slug prefix. */
  id: string;
  /** What the number means, in a sentence a stranger can act on. */
  description: string;
  /** How the observation is produced. */
  collector: 'benchmark-json' | 'manual';
  /** Rolling window length. Western Electric assumes a stable baseline. */
  window: number;
  /** Which direction is bad. `lower` = a drop is a breach; `both` = either. */
  worse: 'lower' | 'higher' | 'both';
  /** Minimum points before any band is computed. Below this we report, never gate. */
  minPoints?: number;
  /** collector-specific */
  suite?: string;
  jsonPath?: string;
}

export interface Breach {
  id: string;
  tier: Tier;
  rule: string;
  latest: number;
  mean: number;
  sigma: number;
  window: number;
  direction: 'above' | 'below';
}

// ---------------------------------------------------------------------------
// Statistics. Pure, so `scripts/__tests__/control-bands.test.ts` can pin them.
// ---------------------------------------------------------------------------

export function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Population standard deviation.
 *
 * Population, not sample: the window IS the reference period, not a sample drawn
 * from a larger one, and with a short window the n-1 correction widens the bands
 * enough to swallow exactly the small drift this is built to see.
 */
export function stdev(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/**
 * Western Electric rules over a window, evaluated at its most recent point.
 *
 * Returns the highest-severity rule that fires, or null. Rules are checked in
 * severity order and the first hit wins — reporting four rules for one excursion is
 * noise, and noise is what makes a watcher get switched off.
 */
export function detect(
  values: number[],
  worse: BandConfig['worse'],
): { tier: Tier; rule: string; direction: 'above' | 'below' } | null {
  if (values.length < 3) return null;
  const m = mean(values);
  const s = stdev(values);

  // A flat series has σ=0, where every point is "infinitely" far from the mean.
  // Treat it as stable: nothing has moved, so nothing has drifted.
  if (s === 0) return null;

  const z = values.map((v) => (v - m) / s);
  const dirOf = (i: number) => (z[i] > 0 ? 'above' : 'below') as 'above' | 'below';
  const bad = (d: 'above' | 'below') =>
    worse === 'both' || (worse === 'lower' ? d === 'below' : d === 'above');

  const last = z.length - 1;
  const tail = (n: number) => z.slice(Math.max(0, z.length - n));

  // Rule 1 — one point beyond 3σ.
  if (Math.abs(z[last]) > 3 && bad(dirOf(last))) {
    return { tier: '3σ', rule: 'one point beyond 3σ', direction: dirOf(last) };
  }

  // Rule 2 — 2 of the last 3 beyond 2σ on the same side.
  const t3 = tail(3);
  if (t3.length === 3) {
    for (const sign of [1, -1]) {
      const hits = t3.filter((v) => v * sign > 2).length;
      const d = sign > 0 ? 'above' : 'below';
      if (hits >= 2 && bad(d)) {
        return { tier: '2σ', rule: '2 of 3 beyond 2σ', direction: d };
      }
    }
  }

  // Rule 3 — 4 of the last 5 beyond 1σ on the same side.
  const t5 = tail(5);
  if (t5.length === 5) {
    for (const sign of [1, -1]) {
      const hits = t5.filter((v) => v * sign > 1).length;
      const d = sign > 0 ? 'above' : 'below';
      if (hits >= 4 && bad(d)) {
        return { tier: '1σ', rule: '4 of 5 beyond 1σ', direction: d };
      }
    }
  }

  // Rule 4 — 8 consecutive on one side of the mean. This is the drift rule, and the
  // only one that fires on a series where no single point looks unusual.
  const t8 = tail(8);
  if (t8.length === 8) {
    for (const sign of [1, -1]) {
      const d = sign > 0 ? 'above' : 'below';
      if (t8.every((v) => v * sign > 0) && bad(d)) {
        return { tier: '1σ', rule: '8 consecutive on one side of the mean', direction: d };
      }
    }
  }

  return null;
}

export function evaluate(cfg: BandConfig, series: Observation[]): Breach | null {
  const minPoints = cfg.minPoints ?? 8;
  const window = series.slice(-cfg.window);
  if (window.length < minPoints) return null;

  const values = window.map((o) => o.value);
  const hit = detect(values, cfg.worse);
  if (!hit) return null;

  return {
    id: cfg.id,
    tier: hit.tier,
    rule: hit.rule,
    latest: values[values.length - 1],
    mean: mean(values),
    sigma: stdev(values),
    window: window.length,
    direction: hit.direction,
  };
}

// ---------------------------------------------------------------------------
// Collectors — turn repo state into one observation.
// ---------------------------------------------------------------------------

function pick(obj: unknown, dotted: string): number | null {
  let cur: unknown = obj;
  for (const key of dotted.split('.')) {
    if (cur === null || typeof cur !== 'object') return null;
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === 'number' ? cur : null;
}

/**
 * Every dated result file in a benchmark suite, and the metric read out of each.
 *
 * All of them, not just the newest: a band needs history before it can say anything,
 * and the suites already hold months of dated runs. Reading the whole directory means
 * a new band is useful on the run that adds it rather than eight runs later.
 */
function collectBenchmark(cfg: BandConfig): Observation[] {
  const dir = path.join(REPO_ROOT, 'benchmarks/results', cfg.suite ?? '');
  let files: string[];
  try {
    files = fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  } catch {
    return [];
  }
  if (!cfg.jsonPath) return [];
  const out: Observation[] = [];
  for (const file of files) {
    let value: number | null;
    try {
      value = pick(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8')), cfg.jsonPath);
    } catch {
      continue; // a malformed historical run is not a reason to lose the rest
    }
    if (value !== null) out.push({ date: file.replace('.json', ''), value });
  }
  return out;
}

/**
 * Every dated result file that has EVER existed for a suite, read out of git.
 *
 * The suites keep only the last few runs on disk — `check:benchmark-results-size`
 * prunes them — so the tree holds three observations per suite while git holds
 * twelve. A band needs eight before it can say anything, so without this the loop
 * would sit silent for two months waiting to relearn history it already has.
 *
 * Deleted files are the point, which is why this walks `--diff-filter=A` over
 * `--all` rather than the current tree.
 */
function collectFromGit(cfg: BandConfig): Observation[] {
  if (!cfg.suite || !cfg.jsonPath) return [];
  const glob = `benchmarks/results/${cfg.suite}/????-??-??.json`;
  let paths: string[];
  try {
    paths = execFileSync(
      'git',
      ['log', '--all', '--diff-filter=A', '--name-only', '--format=', '--', glob],
      { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    )
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.endsWith('.json'));
  } catch {
    return [];
  }

  const out: Observation[] = [];
  for (const rel of new Set(paths)) {
    // The commit that introduced the file — `rev-list` is newest-first, so the
    // introducing commit is the last line.
    let sha: string;
    try {
      const revs = execFileSync('git', ['rev-list', '--all', '--', rel], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
      })
        .trim()
        .split('\n')
        .filter(Boolean);
      if (revs.length === 0) continue;
      sha = revs[revs.length - 1];
    } catch {
      continue;
    }
    try {
      const blob = execFileSync('git', ['show', `${sha}:${rel}`], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      });
      const value = pick(JSON.parse(blob), cfg.jsonPath);
      const date = path.basename(rel).replace('.json', '');
      if (value !== null) out.push({ date, value });
    } catch {
      continue; // a historical run in a different shape is not a reason to lose the rest
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Series store — the accumulated history, committed so bands survive a fresh clone.
// ---------------------------------------------------------------------------

type SeriesFile = Record<string, Observation[]>;

function loadSeries(): SeriesFile {
  try {
    return JSON.parse(fs.readFileSync(SERIES, 'utf-8')) as SeriesFile;
  } catch {
    return {};
  }
}

function loadConfig(): BandConfig[] {
  return JSON.parse(fs.readFileSync(CONFIG, 'utf-8')).bands as BandConfig[];
}

/** Append observations per band, de-duplicated by date. Idempotent. */
function record(fromGit = false): void {
  const series = loadSeries();
  for (const cfg of loadConfig()) {
    if (cfg.collector !== 'benchmark-json') continue;
    const collected = [...collectBenchmark(cfg), ...(fromGit ? collectFromGit(cfg) : [])];
    if (collected.length === 0) {
      console.warn(`  ⚠️  ${cfg.id}: collector produced nothing`);
      continue;
    }
    const existing = (series[cfg.id] ??= []);
    const known = new Set(existing.map((o) => o.date));
    let added = 0;
    for (const obs of collected) {
      if (known.has(obs.date)) continue;
      existing.push(obs);
      added++;
    }
    existing.sort((a, b) => a.date.localeCompare(b.date));
    console.log(`  + ${cfg.id}: ${added} new, ${existing.length} total`);
  }
  fs.mkdirSync(path.dirname(SERIES), { recursive: true });
  fs.writeFileSync(SERIES, JSON.stringify(series, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Write-back — a breach becomes a Stage 1 artifact, not a ticket.
// ---------------------------------------------------------------------------

function writeIntent(breach: Breach, cfg: BandConfig, series: Observation[]): string {
  const slug = `control-band-${breach.id}`;
  const dir = path.join(INTENT_DIR, slug);
  const file = path.join(dir, 'intent.md');
  // `wx` fails if the path exists, so the "already open" case is the write itself
  // refusing rather than a prior check that could go stale between the two calls
  // (CodeQL `js/file-system-race`). One open intent per band, not one per run.

  const recent = series
    .slice(-cfg.window)
    .map((o) => `| ${o.date} | ${o.value} |`)
    .join('\n');

  const body = `# Intent: ${cfg.description} breached its control band

Author: control-bands watcher. Status: draft.

## Problem

\`${breach.id}\` tripped the **${breach.rule}** rule and is sitting **${breach.direction}**
its control band.

| | |
| :--- | :--- |
| Latest | ${breach.latest} |
| Window mean | ${breach.mean.toFixed(4)} |
| σ | ${breach.sigma.toFixed(4)} |
| Window | ${breach.window} points |
| Tier | ${breach.tier} |

${cfg.description}

Observations in the window:

| Date | Value |
| :--- | ---: |
${recent}

## Proposed outcome

The metric is back inside its band, and the cause is understood well enough that a
check would have caught it — or the band is wrong and this file says why, in which
case \`.agent/control-bands.json\` changes and this intent records the reasoning.

## Affected users and systems

Whatever \`${breach.id}\` measures. Start from its entry in
\`.agent/control-bands.json\` and \`docs/DOCS_QUALITY.md\`.

## Constraints

Do not widen the band to make this go away. A band widened to fit an excursion
measures nothing afterwards. If the band is genuinely wrong, say so here and change
it deliberately.

## Open questions

- Is this a real regression, a change in what we measure, or a change in the corpus?
- Which commit is the first one outside the band?
`;
  fs.mkdirSync(dir, { recursive: true });
  try {
    fs.writeFileSync(file, body, { flag: 'wx' });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
  }
  return file;
}

// ---------------------------------------------------------------------------

function main(): void {
  const args = new Set(process.argv.slice(2));
  if (args.has('--record') || args.has('--backfill-git')) {
    const fromGit = args.has('--backfill-git');
    console.log(fromGit ? '📈 Recording + backfilling from git history' : '📈 Recording observations');
    record(fromGit);
  }

  const series = loadSeries();
  const bands = loadConfig();
  const breaches: { breach: Breach; cfg: BandConfig }[] = [];

  console.log('\n🎛️  Control bands\n');
  for (const cfg of bands) {
    const obs = series[cfg.id] ?? [];
    const minPoints = cfg.minPoints ?? 8;
    if (obs.length < minPoints) {
      console.log(
        `  ·  ${cfg.id}: ${obs.length}/${minPoints} points — band not computed yet`,
      );
      continue;
    }
    const breach = evaluate(cfg, obs);
    if (!breach) {
      console.log(`  ✓  ${cfg.id}: inside band (${obs.length} points)`);
      continue;
    }
    console.log(
      `  ✗  ${cfg.id}: ${breach.tier} — ${breach.rule}, ${breach.direction} the mean ` +
        `(latest ${breach.latest}, mean ${breach.mean.toFixed(4)}, σ ${breach.sigma.toFixed(4)})`,
    );
    breaches.push({ breach, cfg });
  }

  if (args.has('--write-intent')) {
    for (const { breach, cfg } of breaches) {
      const file = writeIntent(breach, cfg, series[breach.id] ?? []);
      console.log(`  📝 ${path.relative(REPO_ROOT, file)}`);
    }
  }

  // 1σ is a log tier by contract — it must never gate. Only 2σ and 3σ escalate.
  const actionable = breaches.filter((b) => b.breach.tier !== '1σ');
  console.log(
    `\n${breaches.length} breach(es), ${actionable.length} at 2σ or above.\n`,
  );
  if (args.has('--check') && actionable.length > 0) process.exit(1);
}

if (require.main === module) main();
