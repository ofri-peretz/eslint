# Intent — PR CI/CD under two minutes, without lowering the gate

> Stage 1 artifact of the AI-native SDLC. Opened from a control observation
> while shipping `infra-metrics`: the fast-loop gate takes 3.2 minutes and 82%
> of it is one build.

**Status:** draft · **Opened:** 2026-08-30 · **Owner:** @ofri-peretz

---

## What is wanted

**A PR-blocking CI pass in under two minutes, with quality held at or above
today's level.** Not fewer checks — the same checks, arriving sooner.

Scope is the **PR-blocking path only**: `quality.yml` (every push) and
`quality-full.yml` (on `ready_for_review`). Weekly and background workflows —
benchmarks, corpus scans, health probes, CVE latency — are explicitly out of
scope. They cost wall-clock nobody waits on.

## Why now

Slow CI is not a cost per run, it is a tax on every iteration. At 3.2 minutes
a developer context-switches; under a minute they wait and keep going. The
difference compounds across every PR, and this ecosystem ships through a lot
of PRs.

## Measured today (run 33324089803, `quality.yml`, 2026-08-30)

Jobs run in parallel, so wall-clock is the slowest single job:

| job                               | duration                 |
| --------------------------------- | ------------------------ |
| **Detection Recall (CWE corpus)** | **194s** ← critical path |
| Publish Metadata                  | 36s                      |
| Workflow + CI Script Locks        | 29s                      |
| Markdown Lint                     | 29s                      |
| Supply-chain floor                | 26s                      |
| oxlint (fast pass)                | 22s                      |
| Results size guard                | 20s                      |
| Plugin Taxonomy                   | 19s                      |
| CHANGELOG Check                   | 16s                      |
| Lockfile Sync                     | 13s                      |
| Quality Gate (aggregator)         | 3s                       |

**Wall-clock 194s = 3.2 min.** One job is 5.4x the next.

Inside that job:

| step                                      | duration | share   |
| ----------------------------------------- | -------- | ------- |
| **`turbo build --filter='./packages/*'`** | **159s** | **82%** |
| setup (npm + cache restore)               | 11s      | 6%      |
| artifact size report                      | 11s      | 6%      |
| **the actual gate — `recall-gate.ts`**    | **6s**   | **3%**  |
| devkit infra metrics                      | 1s       | <1%     |

**The gate this job exists for is 6 seconds. It waits 159 seconds for a build.**

## The finding

The same build, with a warm Turborepo cache, is **7.2 seconds — `FULL TURBO`**
(measured locally, 32/32 tasks cached). In CI it takes 159 seconds because
**every task misses**, even though the cache was restored:

```
Cache restored from key: turbo-Linux-shared-554be80a06296887dfad214cf647efb0bd476d0c
cache miss, executing 5f04d1c1f3344518
cache miss, executing 21bc7c9b7b2baa49
... (32 of 32)
```

Why the restore is useless:

1. **The key is a commit SHA** — `turbo-<os>-<scope>-<github.sha>`, written
   **only on pushes to main**. A PR restores by prefix fallback, landing on
   whatever main SHA last wrote. The further main has moved, the more task
   hashes differ, and the fallback degrades to "restored something, hit
   nothing."
2. **The store is thrashing.** The repo holds **36.89 GB across 210 cache
   entries** — GitHub's per-repo budget is 10 GB, so eviction is continuous
   and LRU. Each main push writes ~14 lineages (`shared`, `typecheck`,
   `build-1..4`, `test-shard-1..10`) at ~65 MB each — roughly **900 MB per
   main push**, competing with every other lineage for the same budget.
3. A ruled-out hypothesis, recorded so nobody re-tests it: editing the ROOT
   `package.json` does **not** invalidate the graph. Measured — 31 of 32 tasks
   still cached. `turbo.json`'s `globalDependencies` and per-task `inputs` are
   well scoped; they are not the problem.

## Constraints

1. **Quality does not move.** Same checks, same gates, same coverage
   thresholds. A faster pipeline that catches less is a failure of this intent.
2. **Actions minutes matter.** Consolidation must not trade wall-clock for a
   large increase in billed runner time.
3. **No new required-check names without updating branch protection** —
   an orphaned required check blocks every merge (see `release_infra_gaps`).
4. **Weekly/background workflows are out of scope.**

## Success criteria

- `quality.yml` wall-clock **under 120s**, target **under 60s**.
- Turbo cache hit rate on a typical PR **above 90%** for `build`.
- Cache store back **under the 10 GB budget**.
- No check removed, no threshold lowered.

## Sizing the prize

If the build step goes from 159s to ~10s (a warm-cache hit), Detection Recall
falls from 194s to roughly **40s**, and the whole fast loop lands at **~40s
wall-clock** — the next slowest job is 36s. That single fix meets the target;
everything else is refinement.
