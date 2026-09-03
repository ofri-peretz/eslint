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

**Fixed — but not by `dependsOn`, which is still `[]`.** Read `turbo.json`
before trusting this paragraph: `test.dependsOn` and `test:coverage.dependsOn`
are both `[]` on purpose. Vitest aliases workspace dependencies to their
*source*, not their build output, so `^build` would serialise every shard
behind a build that the tests never read — cost without a correctness gain, and
`turbo-cache-inputs-lock.test.ts` rejects it for exactly that reason.

The coupling is declared instead as `globalDependencies`, which folds those
sources into *every* task hash:

```jsonc
"globalDependencies": [
  "packages/eslint-devkit/src/**",
  "packages/ui/src/**",
  "tools/cwe-analytics-engine/src/**",
  // ... plus the shared build/lint config
]
```

Coarser than `dependsOn` — a devkit edit now invalidates every package's test
hash, not just its dependents' — and that is the accepted trade: over-running
tests is a cost, skipping them is a lie.

Locked behaviourally, not structurally, by
`scripts/__tests__/test-cache-sees-upstream-lock.test.ts`: it reads the task
hash via `--dry=json`, perturbs an upstream source file, and requires the hash
to move. Because it asserts the *behaviour*, it holds whichever mechanism
provides it. Sabotage-proven — removing the coupling fails it with the stale
hash.

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
| CodeQL analysis | `codeql.yml` | **schedule only** (daily `17 3 * * *`) + `workflow_dispatch` | No merge is scanned at merge time; a vulnerability introduced by a merge is found within 24h. See `docs/adr/0001-codeql-runs-post-merge-not-per-pr.md`. A failed scan files an issue. |
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
   moment. (§2 now records that the coupling comes from
   `globalDependencies`, not `dependsOn`.)

   What remains: it is a *sample*, not the full cross-product, and it rotates
   per run rather than covering everything each time. A pair outside the
   current window is unguarded until its turn comes, and the window advances
   only as often as the schedule fires. Probes it could not run are reported
   under `skipped` rather than dropped, so a pass never quietly stands in for
   a question that was not asked.

---

## 5. The release pipeline — how a publish declines to happen

Sections 1–4 cover checks that decline to *run*. This one covers a publish
that declines to *happen*, which is invisible in a different way: there is no
red run to notice, because nothing failed.

**Verified by experiment on 2026-08-31.** `scripts/check-release-liveness.ts`
was run against main and exited 1 on six packages. Tracing each one back
through `gh run view` produced the chain below — every link confirmed against
the live API, none inferred.

| Path | Mechanism | Detected by |
|---|---|---|
| Publish job parked on the `production` environment gate | `release.yml`'s publish jobs target the `production` environment, which requires a manual approval. Until someone approves, the job sits in `waiting` — **indefinitely**, and the run's status is `waiting`, never `failure`. | `check-release-liveness.ts` (version on main ≠ npm latest) |
| Surplus queued runs cancelled | `concurrency: {group: release-workflow, cancel-in-progress: false}` permits exactly **one** pending run per group. A third arrival cancels the one already waiting. A run cancelled this way did nothing wrong and publishes nothing. | same |
| Version PR never opened | The changesets action fails (e.g. a `GITHUB_TOKEN` env/input mismatch), so nothing is ever versioned and `release.yml` correctly publishes nothing. | `check-release-liveness.ts` (changesets queued, no Version PR) |

The observed instance: run `33346361671` (2026-08-31 01:02) built and passed
dist-integrity on all three ESLint majors, then parked six publish jobs on the
approval gate at 01:09. It held the concurrency group for **~4.5 hours**. The
runs at 01:11, 02:14 and 02:26 were cancelled as surplus pending runs; the
05:26 run was still `pending`. Six packages were versioned on main and absent
from npm the whole time, and **no workflow was red**.

Note the compounding shape: the gate is a deliberate control, and the
concurrency setting is a deliberate serialisation. Neither is a bug. The
failure is that together they can hold the pipeline indefinitely with no
signal, and every existing check answers "did a step fail" rather than "did a
release come out".

`release-liveness.yml` runs the check every six hours at :05 and after every
completed run of the `Changesets` workflow on a push to main (not on an
independent `push` trigger of its own — that raced `changesets-pr.yml`'s own
push-triggered job and produced a false `no-version-pr` finding, issue #849).
It gates nothing; it files an issue, which is the only thing that would have
surfaced this.
