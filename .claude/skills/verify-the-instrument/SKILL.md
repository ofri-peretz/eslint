---
name: verify-the-instrument
description: Before trusting any gate, check, baseline or metric in this repo, prove it is still measuring something. Use when a check is green and you are about to rely on it, when a number looks stable, when a check fails for a reason you cannot see, or when adding a new gate. Encodes the failure mode this repo produces most.
---

# Verify the instrument before you believe it

This repository is mostly instruments: ~30 CI gates, a dozen shrink-only
baselines, a case ledger, a benchmark corpus, a portability audit. Its
characteristic bug is not a broken rule. It is **an instrument that reports
health while measuring nothing**, and it is expensive because everyone
downstream believes it.

On 2026-08-31 a single session found nine of these. Not one announced itself.

## The four shapes

### 1. It passed because it looked at nothing

`check-markdown-links` printed `✅ All links are valid!` over **zero files**.
`find` wrote every path to stdout, `execSync` buffered it with a 1MB default,
a 9.7GB cache blew past it, and the `catch` returned `[]`. Green precisely
because it had failed to look.

> **Check:** does the output state the SIZE of what it examined? A gate that
> cannot say "1,194 files" cannot distinguish success from an empty scan.
> Every gate here should refuse an empty population rather than pass it.

### 2. The error reporter destroyed the error

`shWithRegistryRetry` called `log(...)`; `log` was a `const` inside `main()`.
The instant an install failed, the retry handler threw
`ReferenceError: log is not defined`, and that ReferenceError REPLACED the npm
error it existed to report. CI showed `status: 1, stdout: '', stderr: ''`.

Two wrong diagnoses followed — "transient registry flake", twice — before the
real cause (an `ETARGET` on an unpublished version) appeared, and it appeared
only after the reporting was fixed.

> **Check:** exercise the failure path. An error path that has never run is not
> code, it is a guess. `--silent`, a swallowed `stderr`, and a `catch` that
> logs are all places a cause goes to die.

### 3. It measured the right thing at the wrong version

`check:name-vocabulary` grepped for two helper imports; of the 25 rules that
actually decided from a name, **3 imported them and 22 did not**. It reported
0 offenders. The honest number was 32.

The name-dependence probe applied two edits over ONE range for shorthand
`export { x }`, corrupting the renamed source, and read the corruption as a
changed verdict — two rules were "name-dependent" only by that bug.

`DEFAULT_METHODOLOGY_PATHS` hashed three `.mjs` files a codemod had renamed.
`captureMethodology` hashes what it finds and skips what it cannot, so the
preregistration hash stayed stable *because* it had stopped covering the
scorer.

> **Check:** does the thing it inspects still exist, and is it still the thing
> that decides? Assert the population size, and assert paths resolve.

### 4. A number that stopped is indistinguishable from a number that did not move

Five packages sat bumped-but-unpublished on `main`; nothing said so. The daily
Codecov upload failed four days running; `carryforward: true` re-served the
previous numbers, so four days of no measurement looked like four days of
stable coverage — and got read as a coverage collapse when coverage had not
moved at all.

> **Check:** can this number go stale silently? If yes, stamp it with what
> produced it and when, and fail on a stamp mismatch. See
> `benchmarks/budgets/name-dependence.json`'s `probeStamp` for the pattern.

## The discipline

1. **Sabotage it.** Break the thing the check exists to catch and watch it
   fail *by name*. `git show HEAD:<file> > <file>`, run, restore. A lock that
   has never failed is a lock that has never been tested.
2. **Assert the population, not just the result.** `expect(scanned.length)
   .toBeGreaterThan(200)` next to `expect(offenders).toEqual([])`. Without the
   first, the second passes over nothing.
3. **Fix the reporting before forming a theory.** Two diagnoses were wrong
   today because a cause was suppressed. Making it speak took ten minutes and
   answered the question in one line.
4. **Prefer a loud empty state.** `process.exit(1)` on "found nothing" beats
   a cheerful pass, every time.

## Where this is already done well

- `benchmarks/budgets/name-dependence.json` — carries `probeStamp`, and the
  gate refuses to report when the stamp does not match the current probe.
- `scripts/__tests__/name-vocabulary-spread.test.ts` — asserts the gate still
  SEES the population, after the offender list was legitimately drained to 0.
- `benchmarks/__tests__/sealed-vs-open-lock.test.ts` — regenerates the ledger
  rather than reading the committed artifact, because reading it verified
  whatever was last generated.
