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

---

## Root cause, 2026-08-30 — `setup` is one 451 MB download, ten times

"Setup 133s" is not a serial wait. It is **13.3s × 10 jobs**, and that 13.3s is
almost entirely a single operation. From the shard-5 job log:

```
21:43:41.28  Cache hit for: node-modules-Linux-ab918328…
21:43:42.84  Received 0 of 451051181 (0.0%)
21:43:49.72  Received 451051181 of 451051181 (100.0%), 54.6 MBs/sec
21:43:55.63  Cache restored successfully
```

**7s to download 451 MB, 6s to unpack it.** Nothing else in `setup` is
measurable — `npm ci` is skipped on the cache hit, and `package-manager-cache`
is already off.

So the gate moves **~4.5 GB of `node_modules` per run to execute 43 seconds of
tests.** There are exactly two levers: fewer restores, or a smaller archive.

### The archive has no fat to cut

Root `node_modules` is 1732 MB unpacked. The top entries are the docs site's:
`next` 200 MB, `@next` 86, `mermaid` 84, `@posthog` + `posthog-js` 86,
`gpt-tokenizer` 55, `lucide-react` 40, `fumadocs-*` 36, `@base-ui` 19,
`date-fns` 27, `storybook` 23 — roughly 650 MB that a plugin unit test never
loads.

Checked for genuinely dead weight; there is none. `mermaid`, `shiki`,
`recharts`, `storybook` and `gpt-tokenizer` have zero matches for a direct
`from '<pkg>'` import, but all five are really used — through `apps/docs`
components, `next.config.mjs`, a vitest config, or a benchmark runner. Deleting
any of them breaks the docs build. (One genuine defect surfaced and is
unrelated to size: `packages/eslint-devkit` declares `gpt-tokenizer` as a
devDependency and imports it nowhere — the two runners that use it live in the
`benchmarks` workspace.)

### Why every shard carries Next.js

`SPLIT_ACROSS_SHARDS = { docs: 6 }` puts `apps/docs`'s tests **inside the
plugin shard matrix**. Any shard may be a docs slice, so every shard has to be
able to build and run the docs app — which means every shard restores the docs
app's entire dependency tree, including on the eight runs where it holds only
`eslint-plugin-*` packages.

That is the root cause of both symptoms. It also explains the shard-count
problem: `docs` is the single largest item (144s cold, per this file's own
earlier note), so it sets the partition floor that ten shards exist to work
around.

### The fix, and why it is not "just use fewer shards"

Separate the two populations:

1. Move `docs` out of the plugin shard matrix into its own job, restoring the
   full `node_modules`.
2. Give the plugin shards a **lean** dependency restore — the app tree is not
   in their closure once `docs` is gone.
3. *Then* reduce the shard count. With the 144s item removed, the remaining
   work is uniform and small, and the LPT floor is no longer set by one package.

Order matters: step 3 alone is unsafe. Every timing in this document is from a
**warm** turbo cache, where the ten `Run shard N of 10` steps summed to 43s. The
`SPLIT_ACROSS_SHARDS` comment records `docs` at 144s and total test work at
~375s under colder conditions. Cutting 10 → 4 against the warm number, while
`docs` is still the largest indivisible item, risks a cold shard far worse than
today's. Step 1 is what makes step 3 safe, which is why it goes first.

---

## Outcome, 2026-08-31

**Wall clock 261s → 86s** on the widest possible PR (every node and web shard
selected). Run [33345687707](https://github.com/ofri-peretz/eslint/actions/runs/33345687707):
`00:49:00 → 00:50:26`.

The job start spread — the queueing that was ~80% of the original 261s —
collapsed from **186s to 25s**. Every job now starts in one wave.

Three changes got there, in the order the design required:

1. **Lanes.** `docs` and `@interlace/ui` moved to their own 3-shard matrix, so
   the node lane stopped carrying the React tree and `docs` stopped setting the
   partition floor.
2. **Lean archive.** The node lane restores 279,862,807 B against the full
   451,051,181 — 38% less, restore 13.0s → 5.6s. Produced by deleting the web
   packages before the cache save, because `actions/cache` path exclusions
   provably cannot express it (three archives measured at ~451 MB first).
3. **Four shards, not ten.** With the lanes in place the ten node shards did
   **24s of test work between them and paid 141s of checkout+setup** — 5.9:1.
   The shards were never the critical path; the slots they held were.

### What the remaining 86s is

| | |
|---|---|
| `Gate` | 13s |
| queue before the last job starts | 25s |
| `Benchmark configs load` | **42s** — the new critical path |
| aggregate gate | 3s |

`Benchmark configs load` could not start until `00:49:40` because ten shards
were ahead of it. Returning six slots should let it start in the first wave,
which is what the ≤60s success criterion now rests on.

### Open questions answered

- **Was the ~6-slot ceiling real, or our own contention?** Our own. The same
  repo, same account, 25s spread instead of 186s once job count dropped.
- **Cold-cache cost per shard?** Still not measured directly, but bounded
  differently now: `docs` — the 144s indivisible item — is no longer in this
  lane, so no single node-lane shard can inherit that profile.

### Not done

The ≤60s criterion is **not yet met**, and the next lever is no longer this
intent's. `Benchmark configs load` at 42s and `Gate` at 13s are now the run,
and the job count that delays them spans every workflow a PR fires, not just
this one. That belongs to a `concurrency-budget` intent.
