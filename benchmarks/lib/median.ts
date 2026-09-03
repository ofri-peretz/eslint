/**
 * Median of a list of numbers. Returns `null` on empty input.
 *
 * Rounds for even-length lists (matches the ms-scale display in
 * benchmarks/suites/ilb-flagship/scorecard.ts and the /scorecard page —
 * sub-ms precision is below our noise floor). For odd-length lists,
 * returns the middle element unchanged.
 *
 * Lifted out of stats.ts so strict-tsconfig consumers (apps/docs) can
 * import it without pulling in the loosely-typed F1/Wilson/CVSS body.
 * Re-exported from stats.ts for back-compat.
 */
export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}
