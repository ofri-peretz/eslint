/**
 * recall-gate — fail when the ecosystem starts MISSING vulnerabilities.
 *
 * The sibling gate, `corpus-scan.ts`, measures precision: how much noise the
 * rules produce on 8 real published repositories. This one measures the other
 * half, against `benchmarks/corpus/`, where every fixture carries a label —
 * a file in a CWE's `vulnerable` directory must be reported, and one in its
 * `safe` directory must not.
 *
 * Both gates exist because a precision sweep in August 2026 cut false positives
 * from 10 to 3 on that corpus and, unnoticed, took recall from 73.9% to 50.7%:
 * 16 detections traded away for 7 non-findings, across 67 commits, with nothing
 * watching. Every individual narrowing looked like an improvement in isolation.
 * A precision number on its own cannot tell you that, which is the entire
 * argument for running the two together.
 *
 * Exit codes
 *   0  no CWE lost a detection, and no `safe/` fixture gained one
 *   1  a regression, or the budget file is stale
 *   2  the benchmark could not be run
 *
 * Usage
 *   tsx scripts/recall-gate.ts             # check against the budget
 *   tsx scripts/recall-gate.ts --update    # rewrite the budget from this run
 *   tsx scripts/recall-gate.ts --json      # machine-readable summary
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BENCH_DIR = path.join(ROOT, 'benchmarks');
const RESULTS_DIR = path.join(BENCH_DIR, 'results', 'ilb-cwe-corpus');
const BUDGET_FILE = path.join(ROOT, '.agent', 'recall-budget.json');

/** Per-CWE detection counts we refuse to fall below. */
interface Budget {
  $comment: string;
  /** CWE id -> minimum true positives that must still be detected. */
  detections: Record<string, number>;
  /** CWE id -> maximum false positives allowed on `safe/` fixtures. */
  falsePositives: Record<string, number>;
}

interface CweRow {
  cwe: string;
  name: string;
  TP: number;
  FP: number;
  FN: number;
}

function runBenchmark(): void {
  execFileSync('npm', ['run', 'ilb:cwe-corpus'], {
    cwd: BENCH_DIR,
    stdio: 'inherit',
    encoding: 'utf-8',
  });
}

/** The suite writes `results/ilb-cwe-corpus/<date>.json`; take the newest. */
function latestResult(): CweRow[] {
  if (!existsSync(RESULTS_DIR)) {
    throw new Error(`no results directory at ${RESULTS_DIR}`);
  }
  const files = readdirSync(RESULTS_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();
  const newest = files.at(-1);
  if (newest === undefined) {
    throw new Error('benchmark produced no result file');
  }
  const parsed = JSON.parse(
    readFileSync(path.join(RESULTS_DIR, newest), 'utf-8'),
  ) as { plugins: Record<string, { perCwe: unknown }> };

  const ours = parsed.plugins.interlace;
  if (ours === undefined) {
    throw new Error('result file has no `interlace` plugin entry');
  }
  const perCwe = ours.perCwe;
  return Array.isArray(perCwe)
    ? (perCwe as CweRow[])
    : Object.entries(perCwe as Record<string, Omit<CweRow, 'cwe'>>).map(
        ([cwe, row]) => ({ cwe, ...row }),
      );
}

function main(): number {
  const update = process.argv.includes('--update');
  const asJson = process.argv.includes('--json');
  const log = (line: string) => {
    if (!asJson) console.log(line);
  };

  let rows: CweRow[];
  try {
    runBenchmark();
    rows = latestResult();
  } catch (error) {
    console.error(`::error::recall gate could not run: ${String(error)}`);
    return 2;
  }

  const totals = rows.reduce(
    (acc, row) => ({
      tp: acc.tp + row.TP,
      fp: acc.fp + row.FP,
      fn: acc.fn + row.FN,
    }),
    { tp: 0, fp: 0, fn: 0 },
  );
  // A broken harness and a perfect score must not look alike.
  //
  // The scan rig installs the plugins with `file:`, so `_rig/node_modules/
  // eslint-plugin-*` are symlinks into `packages/*`. A concurrent `turbo build`
  // that wipes `dist/` mid-run makes the config unresolvable, the per-fixture
  // lint throws, and the error is swallowed into a missing `findings` field —
  // which scores as zero. One run during this sweep reported `TP=0 FP=0 FN=69`
  // and another lost 4 of 8 targets, both silently.
  //
  // The corpus has a known floor: every CWE ships at least one `vulnerable`
  // fixture, so a run where NOTHING was detected anywhere has measured nothing.
  if (totals.tp === 0) {
    console.error(
      '::error::0 detections across the entire corpus — the harness did not ' +
        'run, it did not find a clean codebase. Check that every plugin has a ' +
        'built `dist/` and that no `turbo build` ran concurrently.',
    );
    return 2;
  }

  const recall =
    totals.tp + totals.fn === 0 ? 0 : (100 * totals.tp) / (totals.tp + totals.fn);

  if (update) {
    const next: Budget = {
      $comment:
        'Minimum detections per CWE on benchmarks/corpus. Lowering an entry ' +
        'means the ecosystem stopped detecting a labelled vulnerability — do ' +
        'that only with a written reason. Regenerate with ' +
        '`tsx scripts/recall-gate.ts --update`.',
      detections: Object.fromEntries(
        [...rows].sort((a, b) => a.cwe.localeCompare(b.cwe)).map((r) => [r.cwe, r.TP]),
      ),
      falsePositives: Object.fromEntries(
        [...rows].sort((a, b) => a.cwe.localeCompare(b.cwe)).map((r) => [r.cwe, r.FP]),
      ),
    };
    writeFileSync(BUDGET_FILE, `${JSON.stringify(next, null, 2)}\n`);
    log(
      `Wrote ${rows.length} CWE budgets. TP=${totals.tp} FP=${totals.fp} ` +
        `FN=${totals.fn} recall=${recall.toFixed(1)}%`,
    );
    return 0;
  }

  if (!existsSync(BUDGET_FILE)) {
    console.error(
      `::error::no budget at ${path.relative(ROOT, BUDGET_FILE)} — run with --update`,
    );
    return 1;
  }
  const budget: Budget = JSON.parse(readFileSync(BUDGET_FILE, 'utf-8')) as Budget;

  const lostDetections: string[] = [];
  const newFalsePositives: string[] = [];
  for (const row of rows) {
    // A CWE with no entry is new to the corpus; require it to hold whatever it
    // currently detects rather than silently accepting zero.
    const floor = budget.detections[row.cwe] ?? row.TP;
    if (row.TP < floor) {
      lostDetections.push(
        `${row.cwe} (${row.name}): detects ${row.TP}, must detect ${floor}`,
      );
    }
    const ceiling = budget.falsePositives[row.cwe] ?? 0;
    if (row.FP > ceiling) {
      newFalsePositives.push(
        `${row.cwe} (${row.name}): ${row.FP} false positives, budget ${ceiling}`,
      );
    }
  }

  if (asJson) {
    console.log(
      JSON.stringify(
        { totals, recall, lostDetections, newFalsePositives }, null, 2,
      ),
    );
  } else {
    log(`\nTP=${totals.tp} FP=${totals.fp} FN=${totals.fn} recall=${recall.toFixed(1)}%`);
    for (const line of lostDetections) console.error(`::error::${line}`);
    for (const line of newFalsePositives) console.error(`::error::${line}`);
  }

  if (lostDetections.length > 0 || newFalsePositives.length > 0) {
    console.error(
      `\n${lostDetections.length} CWE(s) lost a detection, ` +
        `${newFalsePositives.length} gained a false positive. ` +
        'Fix the rule. Run with --update only when a change is a deliberate, ' +
        'written-down trade.',
    );
    return 1;
  }
  log('\nNo CWE lost a detection.');
  return 0;
}

process.exit(main());
