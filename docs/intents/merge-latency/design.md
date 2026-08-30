# Design — Merge queue, sequenced so a merge can never hang

> Stage 2 artifact. One chosen approach, one rejected, and an ordering that is
> itself the safety property.

---

## Chosen: GitHub merge queue

The queue tests the **projected merge result** — your PR on top of everything
ahead of it — once, in order, and merges it. A PR no longer has to be
individually up to date at merge time, because the queue constructs and tests
that state for it.

This preserves the guarantee `strict: true` exists for (code is tested against
the main it lands on) while removing the O(N x M) re-run cost of enforcing it
per-PR. Amplification goes from ~7 runs per merged PR toward 1.

It also removes the merge race entirely: there is no slot to win.

## Rejected: drop `strict: true`

Cuts runs immediately and reintroduces exactly the breakage the setting
prevents — a PR green against a stale main, merged into a main it was never
tested against. The queue gives the same run reduction _and_ keeps the
guarantee, so this is strictly worse.

## Rejected: prioritise some authors' PRs

Reorders a queue without reducing any duration. Recorded in `intent.md`.

## The failure mode that dictates the order

A merge queue builds `refs/heads/gh-readonly-queue/main/...` and waits for the
**required checks** to report on a `merge_group` event. If the workflows
providing those checks do not trigger on `merge_group`, they never report, and
**every merge blocks forever with no error message**. That is worse than the
problem being solved.

Neither required check listens for it today:

| required check        | workflow           | `merge_group`? |
| --------------------- | ------------------ | -------------- |
| `oxlint (fast pass)`  | `quality.yml`      | **NO**         |
| `Quality (Full) Gate` | `quality-full.yml` | **NO**         |

So the triggers ship **first, in their own PR, and land on main**, and the queue
is enabled only afterwards. Enabling both together risks wedging the repo.

## What `merge_group` does to the existing conditionals

Audited rather than assumed — most already behave correctly because they treat
"not a pull_request" as "run everything":

| logic                                                        | on `merge_group`               | verdict                                                                            |
| ------------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------- |
| `gate.decide`: `EVENT_NAME != 'pull_request'` → `run=true`   | runs                           | correct                                                                            |
| `CI_TEST_SHARD_ALL: event == 'pull_request' && '0' \|\| '1'` | `'1'` — all shards             | correct, and deliberately conservative: the queue run is the last gate before main |
| `bench_configs`: `BASE_SHA` empty → `run=true`               | runs                           | correct                                                                            |
| `concurrency: quality-full-${{ github.ref }}`                | ref is the unique queue branch | correct — queue entries cannot cancel each other                                   |
| `CI_TEST_SHARD_BASE: ...base.sha \|\| 'origin/main'`         | falls back to `origin/main`    | unused when `SHARD_ALL=1`, but the fallback must stay valid                        |

The cost note is honest: a queue run executes **all** shards where a PR run
executes only affected ones. That is more expensive per run, and still a large
net win against paying a partial run seven times.

## Sequence

| #   | Step                                                                               | Gate before proceeding                      |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | Add `merge_group:` to `quality.yml` and `quality-full.yml`; commit intent + design | Normal PR flow still green                  |
| 2   | Land step 1 on main                                                                | Required checks confirmed passing from main |
| 3   | Enable the merge queue on `main`                                                   | —                                           |
| 4   | Route one real PR through the queue                                                | Check reports on `merge_group`; PR merges   |
| 5   | Re-measure runs-per-merged-PR over 24h                                             | Compare against the 84/12 baseline          |

Step 3 is a repository setting, not code, and is reversible in one click — the
risk is concentrated entirely in step 1 being wrong, which step 4 catches on a
single PR rather than repo-wide.

## Rollback

Disable the merge queue rule. PRs immediately revert to direct merge with
`strict: true`. The `merge_group` triggers are inert without a queue — they cost
nothing and can stay.

## How we will know it worked

Re-run the amplification measurement:

```bash
gh -R ofri-peretz/eslint run list --workflow=quality-full.yml --limit 100 \
  --json headBranch,createdAt \
  --jq '[.[]|select((now-(.createdAt|fromdate))<86400)]|length'
```

Baseline: **84 runs / ~12 merges in 24h**. Target: at or near one gate run per
merged PR, with no check removed.
