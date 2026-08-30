# Design — `shard-count-from-measurement`

Intent: [`intent.md`](./intent.md). **Status:** draft.

---

## Requirements

- **R1** The test matrix dispatches at most **4** shards, down from 10.
- **R2** The shard total is stated in exactly one place per script. A shard job
  that computes its slice with a different `M` than the matrix was built with
  silently skips packages, and the gate reports success.
- **R3** `SPLIT_ACROSS_SHARDS` slice counts stay ≥ the shard total for the one
  package big enough to need slicing (`docs`), so the largest single unit
  cannot exceed a shard's fair share. LPT cannot beat the largest item.
- **R4** Coverage runs are untouched: `wantCoverage` still forces `slices = 1`.
- **R5** `timeout-minutes` on the test job accounts for a cold shard now
  carrying ~2.5× the packages it did at 10 shards.
- **R6** The `test-scope` job's name reports the new total, not a stale literal.

## Design

One number changes; the work is making sure it is one number.

1. `scripts/ci-test-shard.mts` — introduce `SHARD_TOTAL` as the single source
   of truth, and have `--matrix` default to it. The workflow stops passing a
   literal (R2).
2. `.github/workflows/quality-full.yml` — `Unit Tests + Coverage (n/4)`, the
   matrix step, and the `test-scope` name all read from the same place (R1, R6).
3. `SPLIT_ACROSS_SHARDS: { docs: 6 }` stays. Six slices over four shards is
   still a finer grain than four, and `docs` is the one package that dominates
   a shard on its own (R3).
4. Raise the test job's `timeout-minutes` in proportion (R5).

Order matters: the script change lands first and is provable locally
(`--matrix` output is a pure function of the tree), then the workflow follows.

## Verification

```bash
npx vitest run scripts/__tests__/ci-shard-affected.test.ts \
                scripts/__tests__/visible-test-scope-lock.test.ts
```

The lock that must exist and does not yet: **every package the discovery step
finds is assigned to exactly one shard in `1..SHARD_TOTAL`**. Today nothing
proves partition — a bug that dropped packages off the end of the range would
shrink the matrix, every dispatched shard would pass, and the gate would be
green having tested less. That test is the one that fails if R2 is violated,
and it must be written against a fixed fixture tree rather than the live repo,
so it does not go vacuous the day the package list changes.

The success criteria in the intent are measured from the run itself, not from
a test: re-run the `gh api .../jobs` command on the first wide PR after merge
and compare the three numbers.

## Rejected alternatives

- **Drop to 1 shard.** Sums to ~43s of tests + ~20s overhead ≈ 63s in one job —
  over target on its own, with no headroom for a cold cache, and it makes the
  test step the critical path with nothing to overlap it.
- **Keep 10 shards and shrink `setup`.** The 133s is `npm ci` plus toolchain;
  even halving it leaves 10 × ~10s of tax to save 4s of work each. The tax is
  per-job, so the fix is fewer jobs, not cheaper ones. (Worth doing anyway —
  separate intent, it also speeds the jobs that remain.)
- **Duration-weighted bin-packing instead of file counts.** Better balance
  within a wave, but it does not reduce job count, which is what the queue
  charges for. Revisit only after the count is right, and only with a results
  database — the current cost proxy has no state to drift.
- **Raise the concurrency ceiling.** Not ours to raise; the repo is public and
  already on free unlimited minutes. Minutes were never the constraint —
  simultaneous slots are.

## Out of scope

- The build matrix (`--matrix 4`) — already at four, already within budget.
- `setup` cost reduction (its own intent, per the rejected alternative above).
- The merge queue, which attacks run *amplification* across PRs rather than
  latency within one. Blocked separately on
  [`../merge-latency/design.md`](../merge-latency/design.md).
