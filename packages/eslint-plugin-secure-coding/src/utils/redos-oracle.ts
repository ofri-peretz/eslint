/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * An optional oracle for ReDoS, used to DROP findings rather than to make them.
 *
 * ## Why an oracle at all
 *
 * This rule decides from pattern structure. Structure correlates with
 * catastrophic backtracking and does not determine it, so the rule's own
 * precision figure was an estimate — and when a hand-rolled timing classifier
 * graded it, that estimate came out at 28.6%. `recheck` analyses the automaton
 * for exponential and polynomial ambiguity and answered, for the SAME 106
 * patterns: 102 vulnerable, 4 safe, 0 unknown. The rule was right and the
 * grader was wrong.
 *
 * The reason is structural. Searching for an attack string can only ever fail
 * to find one, so it has no `safe` verdict at all — every negative is silently
 * an "I don't know". An automaton analysis has both verdicts, which is the
 * entire reason to reach for one.
 *
 * ## Why optional, and why only on findings
 *
 * `recheck` costs **14.3 ms per pattern**, and its platform binary and JAR come
 * to roughly 50 MB installed. Running it on every regex literal would make this
 * the slowest rule in the ecosystem by orders of magnitude, and depending on it
 * outright would put 50 MB on every consumer of this package for one rule.
 *
 * So it is a SECOND STAGE. The structural heuristic runs first as a cheap,
 * high-recall pre-filter; the oracle is consulted only for patterns that filter
 * has already flagged. Cost becomes proportional to findings rather than to
 * regexes — 126 findings across 21,394 files is under two seconds — and a
 * consumer who has not installed it is exactly where they were.
 *
 * The asymmetry is deliberate: the oracle may only ever REMOVE a finding. A
 * rule whose behaviour depends on whether an optional package happens to be
 * present must never report something it would otherwise miss, or two installs
 * of the same version disagree about whether a build passes.
 */

/** `recheck`'s answer for one pattern, narrowed to what this rule uses. */
type Diagnostics = {
  status: 'safe' | 'vulnerable' | 'unknown';
  complexity?: { type?: string };
};
type Recheck = {
  checkSync: (source: string, flags: string, opts?: Record<string, unknown>) => Diagnostics;
};

let loaded: Recheck | null | undefined;

/**
 * The module id to resolve. A parameter only so a test can point it at a name
 * that genuinely does not resolve — the absence path is the one most consumers
 * take, and asserting on it requires actually taking it, not simulating it.
 */
let moduleId = 'recheck';

/**
 * Resolve `recheck` once, and remember its absence as firmly as its presence.
 *
 * `undefined` means "not yet attempted"; `null` means "attempted and absent".
 * Without that distinction a missing peer dependency costs a failed module
 * resolution on every single finding.
 */
function oracle(): Recheck | null {
  if (loaded !== undefined) return loaded;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional peer: resolved at runtime, or not at all
    loaded = require(moduleId) as Recheck;
  } catch {
    loaded = null;
  }
  return loaded;
}

/** Per-process memo. A codebase repeats its patterns far more than it invents them. */
const decided = new Map<string, boolean>();

/**
 * Should this finding survive?
 *
 * Returns `true` whenever the oracle is absent, times out, or cannot decide —
 * the rule's own judgement stands unless the oracle actively contradicts it.
 * Only a definite `safe` retracts a finding.
 */
export function confirmsRedos(source: string, flags: string, timeoutMs = 1000): boolean {
  const recheck = oracle();
  if (recheck === null) return true;

  const key = `${flags} ${source}`;
  const memo = decided.get(key);
  if (memo !== undefined) return memo;

  let survives = true;
  try {
    const result = recheck.checkSync(source, flags, { timeout: timeoutMs });
    survives = result.status !== 'safe';
  } catch {
    // A pattern recheck cannot parse is not thereby safe.
    survives = true;
  }
  decided.set(key, survives);
  return survives;
}

/** Whether the oracle is available — for tests, and for reporting what graded a run. */
export function oracleAvailable(): boolean {
  return oracle() !== null;
}

/**
 * Test seam: forget the resolution and the memo, optionally forcing a state.
 *
 * `forceAbsent` sets exactly the value a failed `require` produces, which is the
 * only way to exercise the consumer-default path from inside a repo where the
 * package IS installed. Mocking the module does not work here — the resolution
 * is a runtime `require`, and a module mock never reaches it — so the seam sets
 * the resolved state directly rather than pretending to intercept the load.
 */
export function resetOracleForTests(forceAbsent = false): void {
  loaded = forceAbsent ? null : undefined;
  moduleId = 'recheck';
  decided.clear();
}

/** Test seam: resolve a different module id, or install a stub outright. */
export function __setOracleForTests(next: string | Recheck): void {
  decided.clear();
  if (typeof next === 'string') {
    moduleId = next;
    loaded = undefined;
    return;
  }
  loaded = next;
}
