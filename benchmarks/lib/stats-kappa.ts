/**
 * Cohen's κ (kappa) inter-rater agreement (roadmap item 4.4).
 *
 * Two raters' classifications of the same N items into the same K categories.
 * κ = (Po − Pe) / (1 − Pe), where Po = observed agreement, Pe = expected by chance.
 *
 * Interpretation (Landis & Koch 1977):
 *   < 0.00  poor
 *   0.01–0.20  slight
 *   0.21–0.40  fair
 *   0.41–0.60  moderate
 *   0.61–0.80  substantial
 *   0.81–1.00  almost perfect
 *
 * Used by ilb-kappa.mjs to compare two SARIF outputs (Interlace's vs an
 * external reviewer's) on the same corpus.
 */

/**
 * Compute Cohen's κ from two parallel rater classification arrays.
 *
 * @param {Array<string>} raterA  classifications by rater A, one per item
 * @param {Array<string>} raterB  classifications by rater B, parallel to A
 * @returns {{ kappa: number, observedAgreement: number, expectedAgreement: number, n: number, categories: string[], confusionMatrix: Record<string, Record<string, number>>, interpretation: string }}
 */
export function cohensKappa(raterA, raterB) {
  if (raterA.length !== raterB.length) throw new Error(`raters disagree on length: ${raterA.length} vs ${raterB.length}`);
  const n = raterA.length;
  if (n === 0) return { kappa: 1, observedAgreement: 1, expectedAgreement: 1, n: 0, categories: [], confusionMatrix: {}, interpretation: 'N/A' };

  const categories = [...new Set([...raterA, ...raterB])].sort();

  // Confusion matrix
  const conf = {};
  for (const c of categories) {
    conf[c] = {};
    for (const c2 of categories) conf[c][c2] = 0;
  }
  let observed = 0;
  for (let i = 0; i < n; i++) {
    conf[raterA[i]][raterB[i]]++;
    if (raterA[i] === raterB[i]) observed++;
  }
  const observedAgreement = observed / n;

  // Expected agreement (random)
  let expected = 0;
  for (const c of categories) {
    const aMarginal = raterA.filter((x) => x === c).length / n;
    const bMarginal = raterB.filter((x) => x === c).length / n;
    expected += aMarginal * bMarginal;
  }

  const kappa = expected === 1 ? 1 : (observedAgreement - expected) / (1 - expected);

  return {
    kappa,
    observedAgreement,
    expectedAgreement: expected,
    n,
    categories,
    confusionMatrix: conf,
    interpretation: interpretKappa(kappa),
  };
}

function interpretKappa(k) {
  if (k < 0) return 'poor';
  if (k <= 0.20) return 'slight';
  if (k <= 0.40) return 'fair';
  if (k <= 0.60) return 'moderate';
  if (k <= 0.80) return 'substantial';
  return 'almost-perfect';
}

/**
 * Convert two SARIF runs over the same corpus into parallel rater arrays.
 * Each "item" is a (file, line) tuple. Each rater's classification is the
 * rule(s) they fired (joined as a set string), or 'no-finding' if neither.
 *
 * @param {object} sarifA   SARIF v2.1.0 run from rater A (e.g. Interlace)
 * @param {object} sarifB   SARIF v2.1.0 run from rater B (e.g. external reviewer)
 * @returns {{ raterA: string[], raterB: string[], items: Array<{file: string, line: number}> }}
 */
export function sarifToRaters(sarifA, sarifB) {
  const indexA = indexSarif(sarifA);
  const indexB = indexSarif(sarifB);
  const allKeys = new Set([...indexA.keys(), ...indexB.keys()]);
  const items = [];
  const raterA = [];
  const raterB = [];
  for (const key of [...allKeys].sort()) {
    const [file, line] = key.split('::');
    items.push({ file, line: Number(line) });
    raterA.push([...(indexA.get(key) ?? new Set(['no-finding']))].sort().join('+'));
    raterB.push([...(indexB.get(key) ?? new Set(['no-finding']))].sort().join('+'));
  }
  return { raterA, raterB, items };
}

function indexSarif(sarif) {
  const idx = new Map();
  for (const run of sarif?.runs ?? []) {
    for (const r of run.results ?? []) {
      const loc = r.locations?.[0]?.physicalLocation;
      const file = loc?.artifactLocation?.uri ?? '<unknown>';
      const line = loc?.region?.startLine ?? 0;
      const key = `${file}::${line}`;
      if (!idx.has(key)) idx.set(key, new Set());
      idx.get(key).add(r.ruleId ?? '<no-rule>');
    }
  }
  return idx;
}
