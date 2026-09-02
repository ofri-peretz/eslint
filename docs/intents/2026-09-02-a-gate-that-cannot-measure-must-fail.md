---
slug: a-gate-that-cannot-measure-must-fail
opened: 2026-09-02
packages: []
cases: []
---

## What

Make every gate distinguish **"I measured, and it is fine"** from **"I could not
measure"**, and refuse the second rather than reporting it as the first.

## Why

This is the single most repeated defect in this repo, and it is not a coincidence
— it is a shape. Seven instances, all found in the last four days, every one of
them a gate that returned a passing or reassuring answer while measuring nothing:

| Gate                        | What it reported                           | What was true                                                                   |
| --------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| `corpus-scan`               | "every target failed to scan" for two days | ESLint had returned 3,474 findings from one repository; `sh()` dropped `stdout` |
| `weekly-corpus-scan.yml`    | a PR's findings, against its budget        | it measured the last RELEASE, not the branch — its own comment said otherwise   |
| `check:name-vocabulary`     | `0 offenders`                              | it inspected 3 of the 25 most name-dependent rules                              |
| `check:audit-freshness`     | ✅ fresh, for five days                    | the artifact's instrument had been replaced                                     |
| `freshness-has-a-refresher` | every refresher present                    | it reduced each command to the string `"npx"`                                   |
| a shard of `turbo run test` | success                                    | it ran **zero** tests — a cache replay                                          |
| `name-vocabulary-spread`    | non-vacuity guarded                        | the guard was keyed to a number that reached zero                               |

Every one was found by hand, days late, by someone who happened to look. Not one
was caught by the gate itself, because **none of them could tell the difference
between a clean measurement and no measurement at all.**

That is the failure mode this repo already names everywhere else: a vacuous pass
is worse than a red, because a red gets investigated and a green gets quoted.
`AI_SDLC.md` says it about tests, `CASE_PHILOSOPHY.md` says it about cases, and
five separate gates were doing it anyway.

## Constraints

- **Refusing is the default.** A gate that cannot establish its own inputs exits
  non-zero and says which input it could not establish. It does not warn and
  continue: a warning in a green run is a green run.
- **Every gate declares what it measured**, not just what it found. A count of
  files linted, rules inspected, targets scanned — the denominator. `0` inspected
  is a failure regardless of how many offenders it found.
- **The stamp is part of the artifact.** Anything a gate reads must record the
  hash of the instrument that produced it, and the reader must refuse a mismatch.
  `real-source-inventory.ts` is the reference implementation.
- Sabotage-verify each: break the input, confirm the gate refuses **by name**.
  This intent is worthless if its own gates can pass while measuring nothing.
- No gate is exempted for being slow or awkward. The corpus scan is 113 clones
  and manual; it still records its stamp and still refuses on mismatch.

## Done when

- Every gate under `scripts/check-*` and every CI job that consumes a committed
  artifact reports a denominator, and exits non-zero when that denominator is
  zero or unverifiable.
- A single test asserts the property across all of them, so a NEW gate inherits
  it rather than having to remember it — the thing that failed seven times here
  is that each gate had to remember separately.
- Each of the seven rows above has a regression test that fails on the pre-fix
  behaviour.
