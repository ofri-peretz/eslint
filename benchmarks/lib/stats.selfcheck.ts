/**
 * Self-check for the significance helpers. Run: npm run -w @interlace/benchmarks stats:check
 *
 * The first block is the REGRESSION: ilb-ai tested every run against a
 * three-entry critical-value table, `criticalValues[df] || 5.991`, so df >= 4
 * silently borrowed the df=2 threshold. df=4 / chiSq=7.0 is inside that gap —
 * the old code called it significant, the true tail probability is ~0.136.
 * Asserts the RULE (a computed tail), not the absence of one bad number.
 */
import assert from 'node:assert/strict';
import { chiSquaredPValue } from './stats.ts';

let n = 0;
const ok = (c: boolean, m: string) => {
  assert.ok(c, `FAIL: ${m}`);
  n++;
  console.log(`  ok  ${m}`);
};
const near = (a: number, b: number, tol: number, m: string) =>
  ok(Math.abs(a - b) < tol, `${m}  (got ${a.toFixed(5)}, want ~${b})`);

// ── the regression the lookup table hid ──────────────────────────────────
// The OLD predicate, verbatim, so the disagreement is committed evidence rather
// than a throwaway script. Every pair below sits in the fallback gap (df >= 4),
// where the table handed out the df=2 threshold.
const OLD_TABLE: Record<number, number> = { 1: 3.841, 2: 5.991, 3: 7.815 };
const oldSignificant = (chiSq: number, df: number) =>
  chiSq > (OLD_TABLE[df] ?? 5.991);

const GAP: Array<[number, number, number]> = [
  // chiSq, df, true p
  [7.0, 4, 0.1359],
  [8.0, 4, 0.0916],
  [9.0, 4, 0.0611],
  [7.0, 5, 0.2206],
  [10.0, 5, 0.0752],
  [12.0, 6, 0.062],
];
let disagreements = 0;
for (const [chiSq, df, want] of GAP) {
  const p = chiSquaredPValue(chiSq, df);
  near(p, want, 1e-3, `p(${chiSq}, df=${df})`);
  if (oldSignificant(chiSq, df) !== p < 0.05) disagreements++;
}
ok(
  disagreements === GAP.length,
  `old lookup disagrees with the computed tail on all ${GAP.length} probes ` +
    `(got ${disagreements}) — and always by calling noise significant`,
);
ok(
  GAP.every(([c, d]) => oldSignificant(c, d) && chiSquaredPValue(c, d) > 0.05),
  'every disagreement is a FALSE POSITIVE — the error has one direction',
);

// The one real firing on stored output: results/ilb-ai/
// overnight-multi-model-treatment-7iter-2026-02-09.json recorded chiSq=18.43,
// df=4 — inside the gap, so judged against 5.991 instead of 9.488. The verdict
// happened to be right anyway. Pinned so that stays a fact, not a memory.
near(
  chiSquaredPValue(18.43, 4),
  1.017e-3,
  1e-5,
  'the one stored df>=4 run: p=0.001017',
);
ok(
  18.43 > 5.991 && chiSquaredPValue(18.43, 4) < 0.05,
  "that run's verdict was correct despite the wrong threshold — right answer, wrong instrument",
);

// The table's own entries must still reproduce, or the replacement is wrong.
near(
  chiSquaredPValue(3.841, 1),
  0.05,
  1e-3,
  'df=1 critical value 3.841 -> p=0.05',
);
near(
  chiSquaredPValue(5.991, 2),
  0.05,
  1e-3,
  'df=2 critical value 5.991 -> p=0.05',
);
near(
  chiSquaredPValue(7.815, 3),
  0.05,
  1e-3,
  'df=3 critical value 7.815 -> p=0.05',
);
// And the entries the table never had.
near(
  chiSquaredPValue(9.488, 4),
  0.05,
  1e-3,
  'df=4 critical value 9.488 -> p=0.05',
);
near(
  chiSquaredPValue(11.07, 5),
  0.05,
  1e-3,
  'df=5 critical value 11.07 -> p=0.05',
);
// df=6 is past every entry the table ever had; the boundary is only covered if
// it is asserted here.
near(
  chiSquaredPValue(12.592, 6),
  0.05,
  1e-3,
  'df=6 critical value 12.592 -> p=0.05',
);

// ── tail behaviour ───────────────────────────────────────────────────────
near(chiSquaredPValue(0, 3), 1, 1e-9, 'zero statistic is p=1');
ok(chiSquaredPValue(100, 1) < 1e-15, 'a huge statistic drives p to ~0');
ok(
  chiSquaredPValue(6, 4) > chiSquaredPValue(6, 2),
  'for a fixed statistic, more df means a larger p — the direction the table inverted',
);
ok(
  chiSquaredPValue(-1, 2) === 1 && chiSquaredPValue(5, 0) === 1,
  'invalid input is inert, not significant',
);
// `Infinity >= 0` is true, so the old guard let it through and the continued
// fraction returned NaN — which compares false against every threshold, turning
// the most significant statistic there is into "not significant".
ok(
  chiSquaredPValue(Infinity, 4) === 0 &&
    Number.isNaN(chiSquaredPValue(NaN, 4)) === false,
  'an infinite statistic is p=0, not NaN',
);

console.log(`\nself-check passed — ${n} assertions`);

/** How many assertions actually ran. Exported so a test can refuse an empty run. */
export const assertions = n;
