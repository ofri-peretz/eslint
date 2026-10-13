/**
 * Whether an ILB-Wild repo result measured the code it claims to.
 *
 * A file the parser rejects produces one fatal message and is never linted. The
 * harness used to count those as `parseErrors` and carry on, so a repo whose
 * every TypeScript file failed under espree still "succeeded" — with 0
 * findings, ~1 s wall-clock, and a density that looked like a clean codebase.
 * The 2026-05-03 baseline holds twentyhq at 4,787 parse errors of 4,978 files,
 * supabase 1,819 / 2,042, vercel-ai 1,327 / 1,431.
 *
 * Shared by `scripts/ilb-wild.ts` (fails the repo) and
 * `scripts/ilb-regression-check.ts` (refuses to compare or baseline it), so a
 * summary written by an older harness cannot slip through either.
 */

/**
 * Above this share of unparseable files a repo result is not a measurement.
 *
 * A real corpus has a handful of files no parser accepts (generated code, a
 * syntax proposal); 2% leaves room for that and nothing like the 90%+ of the
 * failure mode.
 */
export const MAX_PARSE_ERROR_RATE = 0.02;

export interface ParseHealthInput {
  fileCount?: number;
  findings?: { parseErrors?: number };
}

export function parseErrorRate(r: ParseHealthInput): number {
  const files = r.fileCount ?? 0;
  const errors = r.findings?.parseErrors ?? 0;
  return files > 0 ? errors / files : 0;
}

/** `null` when healthy, otherwise why the result does not count. */
export function parseHealthProblem(r: ParseHealthInput): string | null {
  const rate = parseErrorRate(r);
  if (rate <= MAX_PARSE_ERROR_RATE) return null;
  return (
    `${r.findings?.parseErrors} of ${r.fileCount} files (${(rate * 100).toFixed(1)}%) failed to parse — ` +
    `over the ${(MAX_PARSE_ERROR_RATE * 100).toFixed(0)}% ceiling, so most of this repo was never linted`
  );
}
