// -*- mode: Bluespec; -*-
/**
 * The oracle for `no-missing-client-release` and `prevent-double-release`.
 *
 * A shape is where `client.release()` sits around one `client.query()` that may
 * throw: end of the try (t), the catch (c), the finally (f), after the try (a),
 * with the catch absent, swallowing, or rethrowing — 40 shapes — each with and
 * without an early return after the query that releases first (e): 80. The defs below
 * are the truth from path semantics: how many releases the success path and the
 * error path each run. RULE is the rules' verdict on each shape, produced by
 * linting it. Model-checking `safety` against the 2.4.0 verdicts found no missed
 * leak and no missed double release, but five false reports (a swallowing catch
 * with the release after the try, a catch that releases and rethrows plus a
 * release after the try, and double releases also reported as leaks); RULE now
 * holds the fixed verdicts, so every shape agrees. The early-return half (e)
 * found 15 more, all false reports — 8 leaks, 7 double releases: both rules
 * counted every `return` in a try as skipping the release, so a release after
 * the try or in the catch was reported as not guaranteed, or as a second
 * release. RULE holds the fixed verdicts for those too. The CI gate is not this file:
 * `src/rules/release-paths.test.ts` renders the same 80 shapes and asserts the
 * same okPath/errPath defs as RuleTester cases. Change the defs here and there
 * together. Check with `quint run --invariant=safety spec/pg-release.qnt`.
 */
module pgRelease {
  type Shape = { e: bool, t: bool, c: bool, f: bool, a: bool, kind: str }
  type Verdict = { missing: bool, double: bool }

  pure val RULE: Shape -> Verdict = Map(
    { e: false, t: false, c: false, f: false, a: false, kind: "none" } -> { missing: true, double: false },
    { e: false, t: true, c: false, f: false, a: false, kind: "none" } -> { missing: true, double: false },
    { e: false, t: false, c: false, f: true, a: false, kind: "none" } -> { missing: false, double: false },
    { e: false, t: true, c: false, f: true, a: false, kind: "none" } -> { missing: false, double: true },
    { e: false, t: false, c: false, f: false, a: true, kind: "none" } -> { missing: true, double: false },
    { e: false, t: true, c: false, f: false, a: true, kind: "none" } -> { missing: true, double: true },
    { e: false, t: false, c: false, f: true, a: true, kind: "none" } -> { missing: false, double: true },
    { e: false, t: true, c: false, f: true, a: true, kind: "none" } -> { missing: false, double: true },
    { e: false, t: false, c: false, f: false, a: false, kind: "swallow" } -> { missing: true, double: false },
    { e: false, t: true, c: false, f: false, a: false, kind: "swallow" } -> { missing: true, double: false },
    { e: false, t: false, c: true, f: false, a: false, kind: "swallow" } -> { missing: true, double: false },
    { e: false, t: true, c: true, f: false, a: false, kind: "swallow" } -> { missing: false, double: false },
    { e: false, t: false, c: false, f: true, a: false, kind: "swallow" } -> { missing: false, double: false },
    { e: false, t: true, c: false, f: true, a: false, kind: "swallow" } -> { missing: false, double: true },
    { e: false, t: false, c: true, f: true, a: false, kind: "swallow" } -> { missing: false, double: true },
    { e: false, t: true, c: true, f: true, a: false, kind: "swallow" } -> { missing: false, double: true },
    { e: false, t: false, c: false, f: false, a: true, kind: "swallow" } -> { missing: false, double: false },
    { e: false, t: true, c: false, f: false, a: true, kind: "swallow" } -> { missing: false, double: true },
    { e: false, t: false, c: true, f: false, a: true, kind: "swallow" } -> { missing: false, double: true },
    { e: false, t: true, c: true, f: false, a: true, kind: "swallow" } -> { missing: false, double: true },
    { e: false, t: false, c: false, f: true, a: true, kind: "swallow" } -> { missing: false, double: true },
    { e: false, t: true, c: false, f: true, a: true, kind: "swallow" } -> { missing: false, double: true },
    { e: false, t: false, c: true, f: true, a: true, kind: "swallow" } -> { missing: false, double: true },
    { e: false, t: true, c: true, f: true, a: true, kind: "swallow" } -> { missing: false, double: true },
    { e: false, t: false, c: false, f: false, a: false, kind: "rethrow" } -> { missing: true, double: false },
    { e: false, t: true, c: false, f: false, a: false, kind: "rethrow" } -> { missing: true, double: false },
    { e: false, t: false, c: true, f: false, a: false, kind: "rethrow" } -> { missing: true, double: false },
    { e: false, t: true, c: true, f: false, a: false, kind: "rethrow" } -> { missing: false, double: false },
    { e: false, t: false, c: false, f: true, a: false, kind: "rethrow" } -> { missing: false, double: false },
    { e: false, t: true, c: false, f: true, a: false, kind: "rethrow" } -> { missing: false, double: true },
    { e: false, t: false, c: true, f: true, a: false, kind: "rethrow" } -> { missing: false, double: true },
    { e: false, t: true, c: true, f: true, a: false, kind: "rethrow" } -> { missing: false, double: true },
    { e: false, t: false, c: false, f: false, a: true, kind: "rethrow" } -> { missing: true, double: false },
    { e: false, t: true, c: false, f: false, a: true, kind: "rethrow" } -> { missing: true, double: true },
    { e: false, t: false, c: true, f: false, a: true, kind: "rethrow" } -> { missing: false, double: false },
    { e: false, t: true, c: true, f: false, a: true, kind: "rethrow" } -> { missing: false, double: true },
    { e: false, t: false, c: false, f: true, a: true, kind: "rethrow" } -> { missing: false, double: true },
    { e: false, t: true, c: false, f: true, a: true, kind: "rethrow" } -> { missing: false, double: true },
    { e: false, t: false, c: true, f: true, a: true, kind: "rethrow" } -> { missing: false, double: true },
    { e: false, t: true, c: true, f: true, a: true, kind: "rethrow" } -> { missing: false, double: true },
    { e: true, t: false, c: false, f: false, a: false, kind: "none" } -> { missing: true, double: false },
    { e: true, t: true, c: false, f: false, a: false, kind: "none" } -> { missing: true, double: false },
    { e: true, t: false, c: false, f: true, a: false, kind: "none" } -> { missing: false, double: true },
    { e: true, t: true, c: false, f: true, a: false, kind: "none" } -> { missing: false, double: true },
    { e: true, t: false, c: false, f: false, a: true, kind: "none" } -> { missing: true, double: false },
    { e: true, t: true, c: false, f: false, a: true, kind: "none" } -> { missing: true, double: true },
    { e: true, t: false, c: false, f: true, a: true, kind: "none" } -> { missing: false, double: true },
    { e: true, t: true, c: false, f: true, a: true, kind: "none" } -> { missing: false, double: true },
    { e: true, t: false, c: false, f: false, a: false, kind: "swallow" } -> { missing: true, double: false },
    { e: true, t: true, c: false, f: false, a: false, kind: "swallow" } -> { missing: true, double: false },
    { e: true, t: false, c: true, f: false, a: false, kind: "swallow" } -> { missing: true, double: false },
    { e: true, t: true, c: true, f: false, a: false, kind: "swallow" } -> { missing: false, double: false },
    { e: true, t: false, c: false, f: true, a: false, kind: "swallow" } -> { missing: false, double: true },
    { e: true, t: true, c: false, f: true, a: false, kind: "swallow" } -> { missing: false, double: true },
    { e: true, t: false, c: true, f: true, a: false, kind: "swallow" } -> { missing: false, double: true },
    { e: true, t: true, c: true, f: true, a: false, kind: "swallow" } -> { missing: false, double: true },
    { e: true, t: false, c: false, f: false, a: true, kind: "swallow" } -> { missing: false, double: false },
    { e: true, t: true, c: false, f: false, a: true, kind: "swallow" } -> { missing: false, double: true },
    { e: true, t: false, c: true, f: false, a: true, kind: "swallow" } -> { missing: false, double: true },
    { e: true, t: true, c: true, f: false, a: true, kind: "swallow" } -> { missing: false, double: true },
    { e: true, t: false, c: false, f: true, a: true, kind: "swallow" } -> { missing: false, double: true },
    { e: true, t: true, c: false, f: true, a: true, kind: "swallow" } -> { missing: false, double: true },
    { e: true, t: false, c: true, f: true, a: true, kind: "swallow" } -> { missing: false, double: true },
    { e: true, t: true, c: true, f: true, a: true, kind: "swallow" } -> { missing: false, double: true },
    { e: true, t: false, c: false, f: false, a: false, kind: "rethrow" } -> { missing: true, double: false },
    { e: true, t: true, c: false, f: false, a: false, kind: "rethrow" } -> { missing: true, double: false },
    { e: true, t: false, c: true, f: false, a: false, kind: "rethrow" } -> { missing: true, double: false },
    { e: true, t: true, c: true, f: false, a: false, kind: "rethrow" } -> { missing: false, double: false },
    { e: true, t: false, c: false, f: true, a: false, kind: "rethrow" } -> { missing: false, double: true },
    { e: true, t: true, c: false, f: true, a: false, kind: "rethrow" } -> { missing: false, double: true },
    { e: true, t: false, c: true, f: true, a: false, kind: "rethrow" } -> { missing: false, double: true },
    { e: true, t: true, c: true, f: true, a: false, kind: "rethrow" } -> { missing: false, double: true },
    { e: true, t: false, c: false, f: false, a: true, kind: "rethrow" } -> { missing: true, double: false },
    { e: true, t: true, c: false, f: false, a: true, kind: "rethrow" } -> { missing: true, double: true },
    { e: true, t: false, c: true, f: false, a: true, kind: "rethrow" } -> { missing: false, double: false },
    { e: true, t: true, c: true, f: false, a: true, kind: "rethrow" } -> { missing: false, double: true },
    { e: true, t: false, c: false, f: true, a: true, kind: "rethrow" } -> { missing: false, double: true },
    { e: true, t: true, c: false, f: true, a: true, kind: "rethrow" } -> { missing: false, double: true },
    { e: true, t: false, c: true, f: true, a: true, kind: "rethrow" } -> { missing: false, double: true },
    { e: true, t: true, c: true, f: true, a: true, kind: "rethrow" } -> { missing: false, double: true }
  )

  pure def n(b: bool): int = if (b) 1 else 0
  /** Releases on the path where the query succeeds. */
  pure def okPath(s: Shape): int = n(s.t) + n(s.f) + n(s.a)
  /** Releases on the path where the query throws. */
  pure def errPath(s: Shape): int =
    if (s.kind == "none") n(s.f)
    else n(s.c) + n(s.f) + (if (s.kind == "swallow") n(s.a) else 0)

  /** Releases on the early return after the query; 0 when there is none. */
  pure def earlyPath(s: Shape): int = if (s.e) 1 + n(s.f) else 0

  pure def leaks(s: Shape): bool = okPath(s) == 0 or errPath(s) == 0
  pure def doubles(s: Shape): bool = okPath(s) > 1 or errPath(s) > 1 or earlyPath(s) > 1

  pure val missedLeaks = RULE.keys().filter(s => leaks(s) and not(RULE.get(s).missing))
  pure val falseLeaks = RULE.keys().filter(s => not(leaks(s)) and RULE.get(s).missing)
  pure val missedDoubles = RULE.keys().filter(s => doubles(s) and not(RULE.get(s).double))
  pure val falseDoubles = RULE.keys().filter(s => not(doubles(s)) and RULE.get(s).double)

  var shape: Shape
  /** Every disagreement at once, carried as state so a trace prints it. */
  var disagreements: { missedLeaks: Set[Shape], falseLeaks: Set[Shape], missedDoubles: Set[Shape], falseDoubles: Set[Shape] }
  action init = all {
    nondet s = RULE.keys().oneOf() shape' = s,
    disagreements' = { missedLeaks: missedLeaks, falseLeaks: falseLeaks, missedDoubles: missedDoubles, falseDoubles: falseDoubles },
  }
  action step = all { shape' = shape, disagreements' = disagreements }
  val showAll = false

  val safety = and {
    leaks(shape) == RULE.get(shape).missing,
    doubles(shape) == RULE.get(shape).double,
  }
}
