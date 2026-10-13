/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Pure grading logic for scripts/mutation.mts, kept out of the runner so the
 * ratchet can be asserted without running Stryker (see
 * scripts/__tests__/mutation-ratchet.test.ts).
 */

/** The subset of mutation-testing-report-schema the ratchet reads. */
export interface MutationReport {
  files: Record<
    string,
    { mutants: { status: string; testsCompleted?: number }[] }
  >;
}

export interface RuleScore {
  /** Killed + Timeout over Killed + Timeout + Survived + NoCoverage, 1 decimal. */
  score: number;
  killed: number;
  survived: number;
  noCoverage: number;
  timeout: number;
}

export interface Baseline {
  $comment?: string | string[];
  plugins: Record<string, { rules: Record<string, RuleScore> }>;
}

export type Verdict =
  | { rule: string; kind: 'ok'; current: number; baseline: number }
  | { rule: string; kind: 'improved'; current: number; baseline: number }
  | { rule: string; kind: 'regressed'; current: number; baseline: number }
  | { rule: string; kind: 'unbaselined'; current: number };

// `src/rules/<rule>/<any>.ts` (most plugins) or `src/rules/<rule>.ts` (the
// flat layout import-next and react-a11y use; its `index.ts` is a barrel).
const RULE_FILE = /(?:^|\/)src\/rules\/(?:([^/]+)\/[^/]+|([^/]+))\.ts$/;

/**
 * `src/rules/<rule>/index.ts` or `src/rules/<rule>.ts` → `<rule>`. Test files are never mutated, but a
 * caller can pass any path (e.g. a git diff) so they are filtered here too.
 */
export function ruleOf(file: string): string | undefined {
  if (/\.(test|spec)\.ts$/.test(file) || file.includes('/__tests__/'))
    return undefined;
  const m = RULE_FILE.exec(file.replaceAll('\\', '/'));
  const rule = m?.[1] ?? m?.[2];
  return rule === 'index' ? undefined : rule;
}

/**
 * Per-rule scores from a Stryker JSON report.
 *
 * CompileError / RuntimeError / Ignored mutants are excluded, as Stryker's
 * own score excludes them: they never ran against a working rule, so they say
 * nothing about the tests. NoCoverage COUNTS AGAINST the rule — a branch no
 * fixture reaches is the purest form of "this could change unnoticed".
 *
 * A `Survived` mutant that completed ZERO tests is excluded too. It is how the
 * vitest runner reports a mutant that crashed the test FILE at import time
 * (e.g. `createRule({})` — RuleCreator throws before any `it` registers): no
 * test ran, so nothing survived anything. Counting it would charge every rule
 * one phantom survivor for its own definition object.
 */
export function scoreReport(report: MutationReport): Record<string, RuleScore> {
  const tally = new Map<string, Omit<RuleScore, 'score'>>();
  for (const [file, { mutants }] of Object.entries(report.files)) {
    const rule = ruleOf(file);
    if (!rule) continue;
    const t = tally.get(rule) ?? {
      killed: 0,
      survived: 0,
      noCoverage: 0,
      timeout: 0,
    };
    for (const { status, testsCompleted } of mutants) {
      if (status === 'Killed') t.killed++;
      else if (status === 'Survived' && testsCompleted === 0) continue;
      else if (status === 'Survived') t.survived++;
      else if (status === 'NoCoverage') t.noCoverage++;
      else if (status === 'Timeout') t.timeout++;
    }
    tally.set(rule, t);
  }
  const out: Record<string, RuleScore> = {};
  for (const [rule, t] of [...tally].toSorted(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const detected = t.killed + t.timeout;
    const valid = detected + t.survived + t.noCoverage;
    // A rule with no valid mutants (all ignored) has nothing to grade; 100
    // keeps it from reading as a regression the day one mutant appears.
    const score =
      valid === 0 ? 100 : Math.floor((detected / valid) * 1000) / 10;
    out[rule] = { score, ...t };
  }
  return out;
}

/**
 * Grade a run against the banked baseline. Only rules present in the run are
 * graded — a `--since` run that mutated two rules says nothing about the rest.
 *
 * The tolerance is zero on purpose: scores are deterministic for a given
 * source + test set, so any drop means a mutant that used to die now lives.
 */
export function grade(
  current: Record<string, RuleScore>,
  banked: Record<string, RuleScore> | undefined,
): Verdict[] {
  return Object.entries(current).map(([rule, { score }]) => {
    const prior = banked?.[rule];
    if (!prior) return { rule, kind: 'unbaselined', current: score };
    if (score < prior.score)
      return { rule, kind: 'regressed', current: score, baseline: prior.score };
    if (score > prior.score)
      return { rule, kind: 'improved', current: score, baseline: prior.score };
    return { rule, kind: 'ok', current: score, baseline: prior.score };
  });
}

export const failing = (v: Verdict[]) =>
  v.filter((x) => x.kind === 'regressed' || x.kind === 'unbaselined');

/**
 * Merge a run into the baseline. Refuses to LOWER a banked score unless
 * `allowRegression` — lowering the bar has to be a decision visible in the
 * diff, not a side effect of re-running with --update-baseline.
 */
export function bank(
  baseline: Baseline,
  plugin: string,
  current: Record<string, RuleScore>,
  allowRegression: boolean,
): { baseline: Baseline; refused: string[] } {
  const prior = baseline.plugins[plugin]?.rules ?? {};
  const refused: string[] = [];
  const rules: Record<string, RuleScore> = { ...prior };
  for (const [rule, s] of Object.entries(current)) {
    if (prior[rule] && s.score < prior[rule].score && !allowRegression) {
      refused.push(rule);
      continue;
    }
    rules[rule] = s;
  }
  const sorted = Object.fromEntries(
    Object.entries(rules).toSorted(([a], [b]) => a.localeCompare(b)),
  );
  return {
    baseline: {
      ...baseline,
      plugins: { ...baseline.plugins, [plugin]: { rules: sorted } },
    },
    refused,
  };
}
