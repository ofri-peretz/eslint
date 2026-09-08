/**
 * Statistics helpers — operationalizes roadmap items 1.3 (severity-weighted F1)
 * and 1.4 (bootstrap CI on F1).
 *
 * Two headline functions:
 *
 *   weightedF1({ tp, fp, fn }, weights)
 *       — F1 where each TP/FP/FN is multiplied by a per-finding weight
 *         (typically a CVSS score or a CWE-Top-25 severity multiplier).
 *         Operationalizes principle #8 ("FPs weighted by bench severity") at
 *         the *finding* level, not just the bench level.
 *
 *   bootstrapF1CI(observations, { resamples = 1000, seed = 42, ci = 0.95 })
 *       — Wilson-Score CI is correct for proportions; bootstrap is correct
 *         for *derived statistics* like F1 (which is a function of three
 *         proportions). Returns { f1, low, high } using the percentile method.
 *
 * Determinism: the bootstrap uses a seeded splitmix32 PRNG so every run on
 * the same input produces the same CI. That's required for principle #9
 * (consistency over time) and principle #6 (reproducibility).
 */

// ─── seeded RNG ──────────────────────────────────────────────────────────

function splitmix32(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    z = (z ^ (z >>> 16)) >>> 0;
    return z / 0x100000000;
  };
}

// ─── core scoring ────────────────────────────────────────────────────────

/**
 * Plain F1 from raw counts. Returns 0 when both precision and recall are 0.
 *
 * @param {number} tp
 * @param {number} fp
 * @param {number} fn
 */
export function f1Score(tp, fp, fn) {
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  if (precision + recall === 0) return { precision, recall, f1: 0 };
  return { precision, recall, f1: (2 * precision * recall) / (precision + recall) };
}

/**
 * Weighted F1 — each observation contributes its weight (e.g. CVSS) to the
 * count instead of contributing 1. Weights default to 1 when missing, so this
 * collapses to plain F1 when no weights are passed.
 *
 * @param {Array<{ outcome: 'tp'|'fp'|'fn', weight?: number }>} observations
 */
export function weightedF1(observations) {
  let wTp = 0;
  let wFp = 0;
  let wFn = 0;
  for (const o of observations) {
    const w = typeof o.weight === 'number' && Number.isFinite(o.weight) ? o.weight : 1;
    if (o.outcome === 'tp') wTp += w;
    else if (o.outcome === 'fp') wFp += w;
    else if (o.outcome === 'fn') wFn += w;
  }
  return f1Score(wTp, wFp, wFn);
}

/**
 * CVSS → weight mapping. CRITICAL/HIGH dominate; LOW/INFO contribute fractional.
 * Used as the canonical severity-weighted-F1 mapping in the scorecard.
 */
export const CVSS_WEIGHT = Object.freeze({
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  INFO: 0.25,
});

/**
 * Build the observation list from a per-finding result array. Each finding
 * carries `outcome` ('tp' | 'fp' | 'fn') and `cvss` (one of the labels above
 * or a numeric score). Numeric CVSS scores 0–10 are bucketed: ≥9 CRITICAL,
 * ≥7 HIGH, ≥4 MEDIUM, ≥0.1 LOW, else INFO.
 *
 * @param {Array<object>} findings
 * @returns {Array<{outcome: string, weight: number}>}
 */
export function findingsToObservations(findings) {
  return findings.map((f) => ({ outcome: f.outcome, weight: cvssToWeight(f.cvss) }));
}

function cvssToWeight(cvss) {
  if (cvss === undefined || cvss === null) return 1;
  if (typeof cvss === 'string') return CVSS_WEIGHT[cvss.toUpperCase()] ?? 1;
  if (typeof cvss === 'number') {
    if (cvss >= 9) return CVSS_WEIGHT.CRITICAL;
    if (cvss >= 7) return CVSS_WEIGHT.HIGH;
    if (cvss >= 4) return CVSS_WEIGHT.MEDIUM;
    if (cvss > 0) return CVSS_WEIGHT.LOW;
    return CVSS_WEIGHT.INFO;
  }
  return 1;
}

// ─── bootstrap confidence interval ───────────────────────────────────────

/**
 * Percentile-method bootstrap CI on F1.
 *
 * Resampling is over the *observation list* — each resample draws N items
 * with replacement, recomputes F1, and we take the [α/2, 1-α/2] percentiles
 * across resamples for the CI bounds.
 *
 * @param {Array<{outcome: string, weight?: number}>} observations
 * @param {object} [opts]
 * @param {number} [opts.resamples=1000]
 * @param {number} [opts.ci=0.95]
 * @param {number} [opts.seed=42]
 * @returns {{ f1: number, low: number, high: number, resamples: number, ci: number, seed: number }}
 */
export function bootstrapF1CI(observations: any[], opts: any = {}) {
  const resamples = opts.resamples ?? 1000;
  const ci = opts.ci ?? 0.95;
  const seed = opts.seed ?? 42;

  const point = weightedF1(observations).f1;
  if (observations.length === 0) {
    return { f1: 0, low: 0, high: 0, resamples, ci, seed };
  }

  const rand = splitmix32(seed);
  const f1s = new Array(resamples);
  const N = observations.length;
  for (let r = 0; r < resamples; r++) {
    const sample = new Array(N);
    for (let i = 0; i < N; i++) sample[i] = observations[Math.floor(rand() * N)];
    f1s[r] = weightedF1(sample).f1;
  }
  f1s.sort((a, b) => a - b);

  const alpha = 1 - ci;
  const lowIdx = Math.floor((alpha / 2) * resamples);
  const highIdx = Math.ceil((1 - alpha / 2) * resamples) - 1;

  return {
    f1: point,
    low: f1s[lowIdx],
    high: f1s[highIdx],
    resamples,
    ci,
    seed,
  };
}

// ─── Wilson Score CI (kept for parity with existing benches) ─────────────

/**
 * Wilson Score CI for a binomial proportion (the right tool for precision /
 * recall on a single bench). Bootstrap is the right tool for F1 because F1
 * is a function of two correlated proportions — Wilson alone over-narrows.
 *
 * @param {number} successes
 * @param {number} trials
 * @param {number} [z=1.96]   95% CI
 */
export function wilsonScoreCI(successes, trials, z = 1.96) {
  if (trials === 0) return { low: 0, high: 0, p: 0 };
  const p = successes / trials;
  const denom = 1 + (z * z) / trials;
  const center = p + (z * z) / (2 * trials);
  const margin = z * Math.sqrt((p * (1 - p)) / trials + (z * z) / (4 * trials * trials));
  return {
    p,
    low: Math.max(0, (center - margin) / denom),
    high: Math.min(1, (center + margin) / denom),
  };
}

/**
 * Combined accuracy report — single function the runner calls per-bench.
 * Emits both Wilson (on the proportions) and bootstrap (on F1) so consumers
 * can pick the appropriate interval per principle #6.
 *
 * @param {Array<{outcome: string, weight?: number, cvss?: any}>} observations
 * @param {object} [opts]
 */
export function accuracyReport(observations, opts = {}) {
  const counts = { tp: 0, fp: 0, fn: 0 };
  for (const o of observations) counts[o.outcome] = (counts[o.outcome] ?? 0) + 1;

  const plain = f1Score(counts.tp, counts.fp, counts.fn);
  const weighted = weightedF1(observations);
  const boot = bootstrapF1CI(observations, opts);
  const precisionCI = wilsonScoreCI(counts.tp, counts.tp + counts.fp);
  const recallCI = wilsonScoreCI(counts.tp, counts.tp + counts.fn);

  return {
    counts,
    f1: plain.f1,
    precision: plain.precision,
    recall: plain.recall,
    weightedF1: weighted.f1,
    weightedPrecision: weighted.precision,
    weightedRecall: weighted.recall,
    ciLow: boot.low,
    ciHigh: boot.high,
    ciMethod: 'wilson+bootstrap',
    bootstrap: { ...boot },
    wilson: { precision: precisionCI, recall: recallCI },
  };
}

// Lifted to its own file so strict-tsconfig consumers (apps/docs) can
// import it without pulling in this whole loosely-typed module.
export { median } from './median.ts';

// ─── significance ────────────────────────────────────────────────────────

/** Lanczos g=7 log-gamma. ~15 significant figures for x > 0. */
function gammaLn(x) {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - gammaLn(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/**
 * Regularized upper incomplete gamma Q(a, x) = Gamma(a, x) / Gamma(a).
 * Series below x < a+1, continued fraction above — each converges quickly only
 * on its own side. Capped at 300 iterations; neither needs ~30 in this range.
 */
function upperGamma(a, x) {
  if (x <= 0) return 1;
  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 0; n < 300; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
    }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - gammaLn(a));
  }
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return h * Math.exp(-x + a * Math.log(x) - gammaLn(a));
}

/**
 * p-value for a chi-squared statistic — COMPUTED, never looked up.
 *
 * Replaces a `criticalValues = {1,2,3}` table whose lookup miss fell back to
 * the df=2 value (5.991). Any run with 5+ groups (df >= 4) was tested against
 * a threshold below its own, and 5.991 sits under the true critical value for
 * every df >= 4, so the error only ever manufactured significance. A table has
 * a silent edge; a computed tail does not.
 *
 * @param {number} chiSq  the test statistic (>= 0)
 * @param {number} df     degrees of freedom (>= 1)
 * @returns {number} P(X >= chiSq) under the null
 */
export function chiSquaredPValue(chiSq, df) {
  if (!(chiSq >= 0) || !(df >= 1)) return 1;
  return upperGamma(df / 2, chiSq / 2);
}
