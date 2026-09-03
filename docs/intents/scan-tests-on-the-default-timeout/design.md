# Design — charge every package the timeout its tests actually need

> Stage 2 artifact. Accepts [intent.md](./intent.md).

**Status:** shipped · **Opened:** 2026-09-02 · **Owner:** @ofri-peretz

---

## Requirements

1. Every package that runs Vitest sets a timeout reflecting what its tests do.
2. Hook timeouts are set alongside, not left to inherit — they do not.
3. A genuine hang still fails; the change buys headroom, not silence.

## Design

One `testTimeout: 30_000` and one `hookTimeout: 30_000` in each package's
`test: {}` block, with the reason inline.

30s, not 60 or 120: the number is chosen against the failure being fixed. Pre-push
runs ~47 turbo tasks concurrently, and an I/O-bound suite starved by that
contention takes seconds longer, not minutes. A suite that needs more than 30s is
not contended, it is broken, and should fail.

`hookTimeout` is the part that is easy to miss. It does **not** inherit
`testTimeout` — it stays at Vitest's 10s default unless set. The same starvation
then surfaces as `Hook timed out in 10000ms`, which reads like a broken test
rather than a busy machine, and sends the reader looking in the wrong place.

## Verification

- 12 of 34 package configs set a timeout before; **34 of 34** after.
- Seventeen patched in one pass, each into its existing `test: {}` block.
- Full suite green afterwards: **56/56** turbo tasks.
- Spot-checked three of the patched packages individually — anthropic-security
  (67), sqlite-security (30), postgresql-security (1160) — to confirm the
  inserted block parses and the suites still run.

## Rejected alternatives

**A single root-level timeout.** Vitest does not inherit `test.testTimeout`
across independent package configs, and a root value would silently apply to
nothing. It would look like a fix and change no behaviour, which is worse than
the 5s default.

**Raise it only where a test has already timed out.** That is what produced the
12-of-34 state this intent was opened on: two packages hit the wall and were
fixed, and the other twenty-two were left on a budget nobody had checked against
what they do. Fixing the reported failure and not the class is how the same bug
gets found twice.

**A much larger timeout, 120s.** Rejected because it disarms the check. The
timeout is the only thing that distinguishes a slow suite from a hung one, and a
number large enough never to trip is a number that no longer measures anything.

## Out of scope

Making the tests faster. The intent is about charging a correct budget, not about
what the budget is spent on — `ci-speed` and `concurrency-budget` cover that, and
conflating them would let a genuine performance regression hide behind a raised
limit.
