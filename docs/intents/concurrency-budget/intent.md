# Intent — `concurrency-budget`

**Status:** draft · **Opened:** `2026-08-31` · **Owner:** `@ofri-peretz`

---

## What is wanted

`Quality (Full)` finishes in **≤ 60s on a push to `main`**, not only on a
narrowly-filtered PR. No check is removed and no assertion stops running.

## Why now

The previous three intents moved the filtered case and did not move this one.
Measured across the last twelve `Quality (Full)` runs:

| duration | trigger |
|---|---|
| 78s, 81s | PR, narrow diff |
| 102s | PR, narrow diff |
| 238s | **push → main** |
| 260s | PR, wide diff |
| 337s | dependabot (wide) |
| 340s | **push → main** |

```bash
gh run list --workflow=quality-full.yml --limit 12 \
  --json conclusion,createdAt,updatedAt,headBranch,event \
  --jq '.[] | select(.conclusion=="success") | "\(((.updatedAt|fromdate)-(.createdAt|fromdate)))s \(.event) \(.headBranch)"'
```

The gap is structural, not incidental. On a PR, `ci-test-shard.mts` and
`ci-build.mts` narrow the work to the affected closure. **A push to `main` has
no base to diff against**, so `CI_TEST_SHARD_ALL=1` — every shard, both lanes,
all four build shards, typecheck and portability run, and then contend for
runners. That is the intended backstop; it is also 4× the target.

Two further facts bound what is possible:

1. **Job count drives queueing, and queueing dominates.** On the one clean
   measurement (run 33345687707) the job start spread was 25s and the run was
   86s; on a contended one it was 186s and 261s. Compute barely moved.
2. **The critical path is no longer the tests.** All tests execute in ~22s.
   `Benchmark configs load` is 42s warm and, by its own comment, 153s cold with
   a 114s build. `Gate` is 13s before anything else can start.

## Affected users and systems

`quality-full.yml` and its required `Quality (Full) Gate`; every contributor
and agent waiting on a merge; the auto-deploy chain that fires after a main
push.

## Constraints

- **Nothing may stop being verified.** A faster gate that checks less is a
  regression, and `docs/ci/SKIP_PATHS.md` exists to make that visible.
- **`Quality (Full) Gate` stays required.** It is the only thing standing
  between a green PR and an unverified merge.
- The post-merge run exists because a PR gate can be skipped (draft merge,
  `--admin`). Whatever replaces it must still catch a broken `main`.
- Actions minutes are free (public repo). **Concurrent runners are not.**

## Success criteria

1. A push to `main` completes `Quality (Full)` in ≤ 60s, measured the same way
   as the table above.
2. Job count on a full run drops enough to start in one wave — at the observed
   ceiling that is roughly ≤ 12 jobs.
3. A deliberately broken `main` still goes red, proving the backstop survived.
4. The narrow-PR case does not regress past its current 78–102s.

## Open questions

- **Is a full re-verify on every main push the right shape at all?** Its
  purpose is catching what a skipped PR gate missed. That is rare, and it costs
  4× the target on every merge. A cheaper trigger — run it only when the PR
  gate did *not* run — may serve the same purpose. This is the decision that
  probably settles the intent, and it is not mine to make alone.
- Can `Benchmark configs load` consume the Build shards' artifacts instead of
  rebuilding? It duplicates work those jobs already did; they cannot share a
  filesystem, but the turbo remote cache already replays most of it (6s warm),
  so the 42s is mostly its four non-build checks plus setup.
- Should the four non-build steps in that job (severity consistency, artifact
  size, devkit metrics, configs load) move to a job that needs no `dist`?
