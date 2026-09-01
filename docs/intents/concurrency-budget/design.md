# Design — `concurrency-budget`

Intent: [`intent.md`](./intent.md). **Status:** draft.

---

## Requirements

- **R1** A push to `main` completes `Quality (Full)` in ≤ 60s.
- **R2** A broken `main` still goes red. Whatever changes, the backstop that
  catches a PR gate which never ran must survive.
- **R3** No check stops running, and no assertion is weakened. A faster gate
  that verifies less is a regression, and `docs/ci/SKIP_PATHS.md` is where that
  would have to be declared.
- **R4** The narrow-PR case does not regress past its current 78–102s.

## The shape of the problem

On a PR, `ci-test-shard.mts` and `ci-build.mts` narrow work to the affected
closure. A push to `main` has no base to diff against, so `CI_TEST_SHARD_ALL=1`
and everything runs: 4 node shards, 3 web shards, 4 build shards, typecheck,
portability, scripts locks, bench-configs. Those contend, and queueing — not
compute — is what the clock measures.

The critical path on a full run, from the one clean measurement:

| | |
|---|---|
| `Gate` | 13s, before anything else can start |
| `Benchmark configs load` | 42s warm; 153s cold, 114s of it build |
| everything else | starts behind those, in waves |

## Design

Three candidates, in the order they should be tried. Only the first needs a
human decision; the others are mechanical.

### 1. Stop re-verifying what was already verified (needs a decision)

The post-merge run exists to catch a PR gate that never ran — a draft merge, an
`--admin` bypass. That is rare, and paying 4× the target on *every* merge to
cover it is the single largest cost in the budget.

Trigger it only when the PR gate did not report on the merged commit: query the
check runs for `Quality (Full) Gate` on the PR's head SHA, and skip if it
passed. The backstop stays for the case it exists for, and the common case
becomes free.

**This weakens a safety net, so it is the user's call, not the agent's.** R2 is
the acceptance test: deliberately break `main` behind a skipped PR gate and
confirm it still goes red.

### 2. Make `Benchmark configs load` stop being the critical path

It is one job doing five things, and only one of them needs `dist`:

| step | needs a build? |
|---|---|
| Build plugins | — it *is* the build |
| Load every benchmark config | yes |
| Severity labels vs CVSS band | yes |
| Artifact size report | yes |
| Devkit infra metrics | no |

Splitting the non-build work out does not help while any of it needs `dist`.
The real lever is that it rebuilds what `Build (1..4)` already built moments
earlier; jobs cannot share a filesystem, but the turbo remote cache already
replays most of it (6s warm). So the 42s is mostly its *four checks plus
setup*, not the build — and `deps: lean` (already landed) takes the setup down.
Re-measure before doing more here.

### 3. Lean deps for the build lane

Build shards 1 and 4 hold `docs` and `@interlace/ui`; shards 2 and 3 are pure
plugins and still restore the full archive. Fixing it means `ci-build.mts`
emitting per-shard lane info, which turns `matrix.shard` from a number into an
object and ripples through every reference.

**Deliberately last.** It is ~26s of machine time and near-zero wall clock,
because those shards are not the critical path. Cheap wins that do not move the
number are how a budget gets spent without the target moving.

## Verification

```bash
gh run list --workflow=quality-full.yml --limit 20 \
  --json conclusion,createdAt,updatedAt,event \
  --jq '.[] | select(.conclusion=="success" and .event=="push") |
        "\(((.updatedAt|fromdate)-(.createdAt|fromdate)))s"'
```

`push` events only — the number this intent is about. Filtering to PRs is what
made the previous intent's result look better than it was.

For R2 there is no command, only an experiment: merge a knowingly-broken commit
past a skipped PR gate and confirm `main` goes red. Until that is run, option 1
is not done, however green the clock looks.

## Rejected alternatives

- **Drop `Quality (Full)` from main pushes entirely.** Meets R1 by abandoning
  R2. The backstop exists because a PR gate *can* be skipped.
- **Cut shards further.** Already at 4 node / 3 web; the tests total ~22s of
  execution. There is nothing left there.
- **More runners.** Not purchasable — the repo is public and minutes are
  already free. Concurrent slots are the constraint, and they are not for sale.
- **Cache the whole gate on a tree hash.** Precisely the "green because we
  decided not to look" failure that `test.dependsOn: []` produced, and that
  `SKIP_PATHS.md` exists to enumerate.

## Out of scope

- The merge queue — it attacks run *amplification* across PRs, not latency
  within one, and is blocked separately on the `review` required context
  (`../merge-latency/design.md`).
- `setup` cost itself. It is ~12–16s even lean; halving it would need a
  different dependency strategy, not a scheduling change.
