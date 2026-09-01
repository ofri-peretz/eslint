# Design — `cron-failure-delivery`

> Stage 2 artifact for [`intent.md`](./intent.md). Requirements, then the
> design, then how the loop is proven closed.

**Status:** draft · **Opened:** `2026-09-01` · **Owner:** `@ofri-peretz`

---

## Requirements

Derived from the intent's success criteria. R-numbers are what verification
cites.

| # | Requirement |
| :--- | :--- |
| R1 | Every job in a `schedule:`-triggered workflow is *reachable by* a reporting step on failure — in-job, or via an aggregate job that `needs` it with `if: always()`. |
| R2 | No reporting condition reads `inputs.*` without a `github.event_name` guard. |
| R3 | A matrix job with `fail-fast: true` reports from an aggregate job, never from inside the legs. |
| R4 | A workflow may opt out of alerting only by declaring it, in-file and machine-readable. |
| R5 | The issue channel itself — composite, token, permissions — is proven live on a cadence, not assumed. |
| R6 | Each of the five causes in the intent fails a test when reintroduced. |
| R7 | No new required PR check that spends runner minutes per push. |

## Design

### The split: shape is static, delivery is live

The five causes divide cleanly, and that division is the design.

**Four are decidable from the job graph** (R1–R4). They are properties of the
YAML — which job reports, what its `if:` reads, whether legs can be cancelled.
A parser answers them in milliseconds with no runner time, satisfying R7.

**One is not** (R5). Whether `report-failure` still has a working token, the
right permissions, and a functioning API path cannot be read off the file. It
has to be exercised.

So: a lock test for the shapes, one live canary for the channel. Neither
substitutes for the other, and stating why is half the point — the existing
"does the file mention report-failure" intuition is exactly the check that
passes on four of the five causes.

### 1. `scripts/__tests__/cron-alerting-shape.lock.test.ts`

Parses every workflow with a `schedule:` trigger and builds the job graph.

For each workflow it computes the set of jobs that can fail, and the set of
jobs that report. A job is *covered* when it reports in-step, or when some
reporting job lists it in `needs` **and** that job's `if:` evaluates on failure
(`always()`, `failure()`, or a `contains(needs.*.result, 'failure')` form).
Uncovered jobs fail R1 and are named individually — `oxlint-parity`'s
`runtime-and-parity` is the worked example.

Then three targeted rules:

- **R2** — flag any reporting `if:` matching `inputs\.` that does not also
  mention `github.event_name`. This is the exact `integration-health` trap:
  `inputs.*` is empty on `schedule`, `''` coerces to false, the step never
  runs on the only trigger that matters.
- **R3** — for a job with `strategy.fail-fast` not `false`, reject a reporting
  step *inside* that job. Cancelled legs report nothing, and the leg that did
  fail would file one issue per leg if fail-fast were relaxed instead.
- **R4** — a workflow with no reporting anywhere passes only if it carries
  `# alerting: none — <reason>` near its `schedule:`. Silence becomes a
  declaration with an author and a reason, which is reviewable; omission is
  not.

Machine-readable opt-out rather than an allowlist in the test, so the reason
lives next to the thing it excuses and moves when the file moves.

### 2. `.github/workflows/alert-canary.yml`

One workflow. Fails on purpose, on a schedule, and asserts the issue appeared.

```
job fail-on-purpose   → exit 1
job assert-issue      → needs: [fail-on-purpose], if: always()
                        polls the API for the canary issue title,
                        then closes it
```

If `report-failure` breaks — revoked token, changed permission model, API shift
— the canary's `assert-issue` job goes red and files through the *same*
channel, which is circular by construction. So it also writes a heartbeat to
the job summary and fails loudly: a canary that cannot report its own death is
detected by the run's own red status on a workflow whose only job is to be
green.

Cadence: daily, ahead of the 6-hourly sweep, so a broken channel is known
before the sweep reads a backlog it can no longer trust.

Cost: one short run per day. Compare with proving all 22 callers live — 22 runs
per cycle, most of them re-proving the same composite.

### 3. Fixing the eight

Mechanical once the lock exists, and each is a separate commit so a bisect can
tell them apart:

| workflow | fix |
| :--- | :--- |
| `oxlint-parity` | aggregate reporting job with `needs: [static-audit, runtime-and-parity, deep-parity]`, `if: always()` |
| `integration-health` | already fixed in #754 — land it |
| `eslint-version-matrix` | move reporting out of the matrix into an aggregate job |
| `benchmark` | decide: add reporting, or declare `# alerting: none` with a reason |
| `resource-profile` | no code change; confirm the next monthly run reports |
| `peer-health`, `weekly-corpus-scan` | already reporting (#784, #782) — fix the underlying failures |
| `evals` | diagnose the missing conclusion first; may not belong here |

## Verification

The rule from CLAUDE.md: a fix is not done until a check would have caught it,
and the check is proven to fail on the unfixed state.

| Requirement | Proof |
| :--- | :--- |
| R1 | Point the lock at `oxlint-parity` as it stands today → must name `runtime-and-parity` as uncovered. |
| R2 | Restore the pre-#754 `integration-health` condition → must fail. |
| R3 | Move `eslint-version-matrix`'s report step back inside the matrix → must fail. |
| R4 | Delete the reason comment from an opted-out workflow → must fail. |
| R5 | Revoke the canary's `issues: write` in a scratch branch → `assert-issue` must go red rather than pass quietly. |
| R6 | All five above, run as a sabotage pass and recorded in the PR body with pass/fail counts. |
| R7 | The lock runs inside an existing vitest job; no new workflow, no new runner minutes on PRs. |

The one that matters most is R5, because it is the only check on the checker.
A green lock with a dead token reproduces this intent's own bug one level up.

## Rejected alternatives

**Add `if: always()` reporting to all 22 and call it done.** This is the
reactive fix applied four times already — `integration-health` carries a
comment describing its own instance. It fixes today's five and leaves the sixth
shape to be discovered the same way: by noticing, months later, that something
did not happen.

**One structural lock: "every scheduled workflow mentions `report-failure`."**
Passes on four of the five causes. `oxlint-parity` mentions it, `integration-
health` mentioned it, `eslint-version-matrix` mentions it. It would have caught
`benchmark` alone and given false confidence about the rest — worse than no
lock, because it reads as coverage.

**Prove delivery live for all 22 workflows.** Highest confidence, and rejected
on R7: 22 synthetic failure runs per cycle, most re-proving the same composite,
against a concurrency budget that is already this repo's binding constraint.
One canary plus static shape rules gets the same coverage at 1/22 the cost.

**Route alerts somewhere other than issues (email, Slack).** Larger change,
new external dependency in the alert path, and it does not address the actual
defect: the condition never evaluated true. A different destination behind the
same dead `if:` is equally silent.

**Set `fail-fast: false` everywhere instead of aggregating.** Makes every leg
run to completion so each can report — and files N issues for one broken
matrix. Dedupe-by-title collapses them, but the runner cost is real and the
failure is still reported per-leg rather than per-cause.

## Out of scope

- **Fixing why the eight are failing.** This intent makes failure *visible*;
  the underlying breakages are their own work, and several (`benchmark`,
  `oxlint-parity`) are likely external-dependency failures belonging to the
  `external-dependency-degradation-policy` intent.
- **Raising cron cadence.** Recorded as a gap in `docs/ci/SKIP_PATHS.md` and
  deliberately sequenced after this: raising cadence on a fleet where 8 are
  broken and alerting does not fire multiplies noise 4× and buys nothing.
- **`issue-sweep` consuming the backlog.** Blocked on this intent, tracked as
  `issue-to-fix-loop`.
- **PR-triggered workflows.** Their failures are visible on the PR. This is
  about runs nobody is looking at.
- **`evals`' missing conclusion.** Flagged as an open question; likely a
  different defect.
