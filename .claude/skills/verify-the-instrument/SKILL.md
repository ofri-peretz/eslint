---
name: verify-the-instrument
description: Use before trusting a green gate, baseline or metric, when a number looks stable, a check fails unseen, or a gate is added.
---

# Verify the instrument before you believe it

This repo is mostly instruments (CI gates, shrink-only baselines, a case ledger, a benchmark
corpus). Its characteristic bug is an instrument that reports health while measuring nothing.
On 2026-08-31 one session found nine; none announced itself.

## The four shapes, and the check for each

1. **It looked at nothing.** `check-markdown-links` passed over zero files: a 1MB `execSync`
   buffer overflowed and the `catch` returned `[]`. Check: does the output state the size of
   what it examined? A gate must refuse an empty population.
2. **The error reporter destroyed the error.** A retry handler threw `log is not defined`,
   replacing the npm `ETARGET` it existed to report; two "registry flake" diagnoses followed.
   Check: exercise the failure path. `--silent`, a swallowed `stderr` and a logging `catch` are
   where causes die.
3. **Right thing, wrong version.** `check:name-vocabulary` grepped two imports that 22 of 25
   offenders did not use, and reported 0 (honest: 32). A methodology hash stayed stable because
   it had stopped covering renamed files. Check: does what it inspects still exist and still
   decide? Assert population size and that paths resolve.
4. **A number that stopped looks like one that held.** Codecov `carryforward` re-served four
   days of failed uploads as stable coverage. Check: can it go stale silently? Stamp it with
   what produced it and fail on mismatch (`benchmarks/budgets/name-dependence.json`
   `probeStamp`).

## The discipline

1. **Sabotage it.** Break what the check exists to catch (`git show HEAD:<file> > <file>`),
   watch it fail by name, restore. A lock that has never failed has never been tested.
2. **Assert the population next to the result**: `expect(scanned.length).toBeGreaterThan(200)`
   beside `expect(offenders).toEqual([])`
   (`scripts/__tests__/name-vocabulary-spread.test.ts`).
3. **Make the cause speak before forming a theory.**
4. **Prefer a loud empty state**: exit 1 on "found nothing".
