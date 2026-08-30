# Design — PR CI/CD under two minutes

> Stage 2 artifact. Three levers, ranked by measured impact per unit of risk.
> Lever 1 alone meets the target; 2 and 3 are refinement.

---

## Lever 1 — build only what the gate needs (zero risk, no infra)

`quality.yml`'s `recall` job runs:

```
npx turbo build --filter='./packages/*'      # 32 packages, 159s
npx tsx scripts/recall-gate.ts               # 6s
```

The corpus config it serves — `benchmarks/suites/ilb-arena/configs/interlace.config.js`
— imports **10 plugins**:

`browser-security`, `express-security`, `jwt-security`, `lambda-security`,
`mongodb-security`, `nestjs-security`, `node-security`, `postgresql-security`,
`secure-coding`, `vercel-ai-security`

We build 32 to serve 10. Turbo resolves each one's dependency graph, so
`@interlace/eslint-devkit` still builds — as a dependency, which is correct.

```
npx turbo build --filter=eslint-plugin-browser-security... (×10)
```

**Risk:** a plugin added to the corpus config but not the filter would go
unbuilt, and the gate already refuses to score an unresolvable config rather
than reporting zero findings — it fails loudly, which is the behaviour we want.
Add a lock test asserting the filter list equals the config's plugin list, so
the two cannot drift.

**Expected:** 159s → roughly 60s cold, ~10s warm.

## Lever 2 — make the Turbo cache actually hit (the real fix)

Measured: the same 32-package build is **7.2s `FULL TURBO`** with a warm cache
and **159s** in CI, where all 32 tasks miss despite a successful restore.

Two structural causes, from `.github/actions/setup/action.yml`:

```yaml
key: turbo-${{ runner.os }}-${{ inputs.turbo-cache-scope }}-${{ github.sha }}
restore-keys: |
  turbo-${{ runner.os }}-${{ inputs.turbo-cache-scope }}-
  turbo-${{ runner.os }}-build-
  turbo-${{ runner.os }}-shared-
```

1. **SHA-keyed, main-only writes.** A PR can only fall back by prefix to
   whatever main SHA last saved. The further main has moved, the more task
   hashes differ — "restored something, hit nothing" is the observed outcome.
2. **The store is thrashing.** 36.89 GB across 210 entries against a 10 GB
   budget. Each main push writes ~14 lineages (`shared`, `typecheck`,
   `build-1..4`, `test-shard-1..10`) at ~65 MB — ~900 MB per push, all
   competing for the same LRU budget. Entries are evicted before PRs can use them.

**Option A — Turborepo Remote Cache (recommended).** Content-addressed by task
hash, not by commit SHA; no 10 GB GitHub budget; PRs read _and_ write, so the
first PR to build a package warms it for every later one. The org already
deploys on Vercel, which hosts this natively (`TURBO_TOKEN` / `TURBO_TEAM`).
This removes the whole failure mode rather than tuning around it.

**Option B — if remote cache is not wanted:** collapse the 14 lineages to two
(`shared`, `test`) and let PRs save on their own branch key. Cuts per-push
churn ~7x and stops the eviction spiral. Strictly worse than A: still SHA-keyed,
so cross-branch reuse stays luck.

**Expected:** build step ~10s on a typical PR. This is the change that makes
the target routine rather than occasional.

## Lever 3 — stop paying setup overhead eight times (minutes, not wall-clock)

Nine jobs each pay checkout + setup (~11-15s) to run a check of 13-36s. That
does not hurt wall-clock — they are parallel — but it multiplies **billed
runner minutes**, which the repo watches.

Consolidate the pure static checks that share a setup and need no build:
`Markdown Lint` (29s), `CHANGELOG Check` (16s), `Plugin Taxonomy` (19s),
`Lockfile Sync` (13s), `Publish Metadata` (36s) → one job, ~90s serial but ~60s
of setup saved per run.

**Do not merge `Detection Recall` or `Supply-chain floor` in** — both are
genuinely slow and would become the critical path.

**Trade-off, stated honestly:** this raises the _slowest job_ from 36s to ~90s,
which would become the new wall-clock floor once lever 1 or 2 lands. So it is
worth doing only for the minutes, and only if 90s still clears the 120s bar.
If the target is 60s, **skip lever 3** — keep the jobs parallel and pay the
setup. Wall-clock is what the user waits on; minutes are what the bill counts.

## Sequencing

| #   | Change                                                  | Wall-clock effect    | Risk               |
| --- | ------------------------------------------------------- | -------------------- | ------------------ |
| 1   | Filter the recall build to the 10 corpus plugins + lock | 194s → ~95s          | Low                |
| 2   | Turborepo Remote Cache                                  | ~95s → ~40s          | Low, needs a token |
| 3   | Consolidate static jobs                                 | none (worsens floor) | Low, minutes only  |

Land 1 first — it needs nothing but a filter and a test. Then 2, which needs a
`TURBO_TOKEN` secret and is the durable fix. Treat 3 as optional and only after
measuring where the floor actually sits.

## Explicit non-goals

- Touching weekly/background workflows (benchmarks, corpus scans, CVE latency,
  health probes). Nobody waits on them.
- Removing any check, lowering any threshold, or moving a gate out of the
  blocking path to make a number look better.
- Reducing `quality-full.yml`'s coverage. It runs on `ready_for_review`, once
  per PR, and is the deep gate — slow is acceptable there in a way it is not
  on every push.
