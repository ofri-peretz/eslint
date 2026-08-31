# Every way CI can decline to run something

> **Why this file exists.** A gate that passes while verifying nothing is worse
> than no gate. This repo skips work deliberately and often — affected
> filtering, task caching, lanes, cadence workflows — and every one of those is
> a place a check could silently stop running. This is the register of them:
> what may be skipped, what makes the skip legitimate, and what proves it.
>
> **Rule:** a new skip path is not shipped until it has a row here and a lock.
> "Verified" below means an experiment was run, not that the code was read.

Last verified 2026-08-31.

---

## 1. Skips inside the PR-blocking gate

### `quality.yml` — the fast loop

**No skips.** All eleven jobs are unconditional (`oxlint`, `markdown`,
`changelog`, `workflows`, `docs-integrity`, `publish-metadata`, `taxonomy`,
`recall`, `lockfile`, `supply-chain`, `bench-size`), and `quality-gate`
aggregates them with `always()`.

*Verified:* parsed the workflow and listed every job's `if:` — all absent.

### `quality-full.yml` — the heavy gate

| Skip | Condition | Legitimate because | Proof |
|---|---|---|---|
| Whole workflow | `gate.outputs.run == 'false'` | Draft PR without the `run-full-ci` label. It runs on `ready_for_review`, so it cannot be merged unrun. | Verified — required check is `Quality (Full) Gate`, which is `always()` and fails when `gate` fails or is cancelled. |
| Node-lane test shards | `any == 'false'` | No package source changed vs the base commit, so no shard owns anything. | Verified. Now **visible**: the `test-scope` job always runs and names the decision (`Unit tests SKIPPED — no package sources changed`). Locked by `visible-test-scope-lock.test.ts`. |
| Web-lane test shards | `web_any == 'false'` | Same, for `docs` / `@interlace/ui`. | Verified — the aggregate gate accepts a `test-web` skip only when `web_any` is false, and `WEB_ANY` is exported to that step (a missing export aborted the gate under `set -u`; locked by `workflow-env-declared-lock.test.ts`). |
| Build shards | `build_any == 'false'` | No buildable source changed. | Verified. |
| Typecheck, Portability | `heavy == 'false'` | The diff touches no package source at all — a README, a workflow comment. Markdown is still linted by `quality.yml`, which never skips. | Verified. |
| `Benchmark configs load` | `bench_configs == 'false'` | The diff touches no benchmark config, package manifest, package source, or size-metric input. | Read, **not** experimentally verified. |
| `Script & Repo-Config Locks` | never skips | `scripts/` is outside every workspace, so turbo cannot reach it and no affected filter applies. | Verified — the aggregate gate passes `false` for its skip authorisation, so any skip fails the gate. |

**The backstop:** `quality-full-gate` re-derives each skip's authorisation from
the gate's own outputs and fails on a skip the gate did not authorise. A
skipped required check reads as *passing* to GitHub, which is why this job is
`always()` rather than `needs`-gated.

### Hard failures rather than skips

These deliberately fail instead of quietly doing nothing:

- **No testable workspace found** — `ci-test-shard.mts` exits 1.
- **A shard bucket is empty** — shard total exceeds what the partition can fill.
- **Files changed under `packages/|apps/|tools/` but the affected set is empty** — treated as a bug in the affected logic, not a fast path.
- **The matrix step emitted no `shards` / `build_shards` / web `shards`** — every shard would skip while the gate went green.

*Verified:* all four paths are asserted in `scripts/__tests__/ci-test-shard.test.ts` and the gate's own guard step.

---

## 2. The turbo task cache — the one that was actually broken

Turbo replays a cached task instead of running it when the task hash is
unchanged. That is the point of the cache, and it is correct **only if the hash
covers everything that can change the result.**

**It did not.** `turbo.json` declared `test.dependsOn: []`, so a plugin's test
hash covered only that plugin's own files:

```
$ npx turbo run test --filter=eslint-plugin-jwt-security --dry=json
  hash=617b80a88f5b0023
$ echo '// probe' >> packages/eslint-devkit/src/index.ts
$ npx turbo run test --filter=eslint-plugin-jwt-security --dry=json
  hash=617b80a88f5b0023      # unchanged
```

Editing the devkit left every dependent plugin's tests a cache hit. Observed on
a real CI shard: **8 cache hits, 0 executions** — a job that reported success
having run no tests. The same shard takes ~80s when the work is actually done.

Two mechanisms, and the second undid the first: `ci-test-shard.mts` correctly
computes the dependent closure and *selects* those plugins, and turbo then
skipped them.

**Fixed** by `test.dependsOn: ["^build"]` (and `test:coverage`). Locked
behaviourally, not structurally, by
`scripts/__tests__/test-cache-sees-upstream-lock.test.ts`: it reads the task
hash via `--dry=json`, perturbs an upstream source file, and requires the hash
to move. Sabotage-proven — reverting the config fails it with the stale hash.

### Still-trusted cache behaviour

| Cache | Covers | Status |
|---|---|---|
| `build` | `dependsOn: ["^build"]`, `inputs: src/**, tsconfig*, package.json, README, LICENSE, .npmignore` | Read, not experimentally verified. |
| `test` / `test:coverage` | `dependsOn: ["^build"]`, `inputs: $TURBO_DEFAULT$` | **Verified** by the lock above. |
| `globalDependencies` | `.oxlintrc.json`, `.markdownlint.json`, `scripts/build-package.ts`, `scripts/lib/**`, `tsconfig.base.json` | Read, not verified. A change to any other root-level input does not invalidate anything. |

---

## 3. Dependency archives — what a job can be missing

The node lane restores a `node_modules` with the web tree deleted (~739 MB
removed, archive 451 MB → 280 MB). A package trimmed but still needed is a
`MODULE_NOT_FOUND`.

- **Lane membership is derived, not listed** — a workspace is `web` because its
  manifest declares something `.github/lean-node-modules.txt` trims, or depends
  on a workspace that does.
- `date-fns` is the standing counter-example: root-declared and web-looking, but
  imported by four node-lane packages, so it is never trimmed.
- *Verified:* `lane-deps-lock.test.ts` computes the expected web set
  independently from manifests and compares it against the script's real plan
  output; sabotage-proven.
- *Verified:* the trim step reports `before → after` and fails if packages were
  present and the tree did not shrink; on a cache hit it reports "already lean"
  and exits 0.
- *Verified:* `Install dependencies` must consult **every** `node-modules-cache-*`
  step — a rewrite once deleted `npm ci` and a missed key produced
  `vitest: not found`.

---

## 4. What the PR gate does NOT run, and what covers it

Anything moved off the PR path must be caught by a cadence workflow **that files
an issue**, or it is not covered — a red cron notifies nobody by default.

| Not on the PR path | Covered by | Cadence | Files an issue |
|---|---|---|---|
| CodeQL analysis | `codeql.yml` | post-merge + schedule | — |
| Coverage thresholds (`CI_TEST_SHARD_COVERAGE=1`) | `codecov.yml` | daily 08:45 | ✅ |
| Full drift re-run of the heavy gate | `quality-full.yml` | Sun 04:00 | ✅ |
| Link integrity | `check-links.yml` | Fri 04:25 | ✅ |
| Control-band breaches | `control-bands.yml` | Mon 05:10 | ✅ |
| Agent evals | `evals.yml` | Thu 05:20 | ✅ |
| Lighthouse | `lighthouse.yml` | Wed 04:05 | ✅ |
| Peer-dependency health | `peer-health.yml` | Mon 08:00 | ✅ |
| Release tag/version drift | `release-hygiene.yml` | Wed 05:13 | ✅ |
| Runner resource profile | `resource-profile.yml` | monthly | ✅ |
| Corpus scan | `weekly-corpus-scan.yml` | Mon 06:00 | ✅ |
| OSSF Scorecard | `scorecard.yml` | Tue 04:23 + push to main | ✅ |
| Benchmark suite | `weekly-benchmark.yml` | Mon 09:00 | ✅ |

The last two had no failure channel at all until this file was written, which
is the argument for writing it down: nobody decided they should be silent, they
just were.

- **`scorecard.yml`** reports on `failure()` with no `event_name` filter,
  unlike the crons that already report. It also runs on push to `main`, and a
  post-merge failure is exactly as unwatched as a scheduled one.
- **`weekly-benchmark.yml`** reports on
  `always() && (failure() || steps.flagship.outcome == 'failure' || …)`. Its
  flagship steps are `continue-on-error`, so the job can finish **green having
  published half of what it measures** — a partial refresh has to reach the
  channel too, not just a red run.

`.github/actions/report-failure` dedupes by title — one issue, commented on —
so a persistent failure cannot turn the channel into noise and get muted.

### Known gaps

1. **Cadence is weekly, not 6-hourly.** A regression only a cron catches can
   sit for up to seven days.
2. `bench_configs` gating and the `build` cache inputs are **read, not
   experimentally verified** — the two rows above marked as such.
3. **The cache-invalidation audit checks a sample, on a schedule.**
   `scripts/audit-cache-invalidation.ts` now perturbs rotating
   upstream/dependent pairs and declared `globalDependencies`, and exits
   non-zero when a hash fails to move — so the `test.dependsOn` hole in §2
   would no longer depend on someone asking the right question at the right
   moment.

   What remains: it is a *sample*, not the full cross-product, and it rotates
   per run rather than covering everything each time. A pair outside the
   current window is unguarded until its turn comes, and the window advances
   only as often as the schedule fires. Probes it could not run are reported
   under `skipped` rather than dropped, so a pass never quietly stands in for
   a question that was not asked.
