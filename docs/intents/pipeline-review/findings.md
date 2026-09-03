# Pipeline review — 2026-09-03

Full audit of all 44 workflows against the constraints that actually bind.
Every number here was measured; none is estimated.

## The binding constraint is concurrency, not minutes and not wall clock

| constraint          | value                                           | verdict                    |
| :------------------ | :---------------------------------------------- | :------------------------- |
| Actions minutes     | free, unlimited (public repo, standard runners) | not binding                |
| **Concurrent jobs** | **20** (Free plan; no public-repo exemption)    | **BINDING**                |
| Actions cache       | 10 GB/repo, at 9.74 GB                          | binding, being worked      |
| Vercel Remote Cache | request RATE (Hobby 100/min, Pro 10k/min)       | binding if Hobby           |
| PR wall clock       | `review` is 88-99% of it, median 124s           | binding, addressed in #842 |

**PR-gate stage: 14 workflows, 45 jobs, 25 setup calls — into 20 slots.**
Observed peak 18 concurrent, 35 job starts in one minute. One full-gate PR
wants 22-30 distinct jobs.

Jobs therefore queue: **p50 25s, p90 69s, max 87s.** The longest waits go to the
smallest jobs — Supply-chain floor 87s, Results size guard 79s, oxlint (fast
pass) 61s. That last one then spends ~41s on setup to lint for ~9s.

> Correction to an earlier measurement in this work: "queue latency is 0s" was
> taken at RUN level. Runs start immediately; JOBS queue. At job level we are
> over the ceiling, and the earlier conclusion that this was not a capacity
> problem was wrong.

## What is already right — audited, not assumed

The PR gate is in better shape than the raw job count suggests:

- **8 of 14** PR-triggered workflows already carry `paths:` filters.
- `issue-sweep.yml` looks like 4 jobs on every PR; all four skip (`arm` needs
  `head_ref == chore/issue-sweep`, the rest need `event_name != pull_request`),
  and skipped jobs hold no slot.
- `quality.yml` / `quality-full.yml` cannot be path-filtered — they provide the
  required contexts, and a required check that never runs blocks a merge
  forever. Both gate internally instead, which is the correct shape.
- Shard counts come from measurement (`ci-shard-affected.mts`), not a guess.
- `weekly-corpus-scan.yml` is correctly path-scoped to rule logic.

## Rejected after measurement

| candidate                       | why not                                                                                                                                                                                                                     |
| :------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Path-filter `docs.yml`          | It validates README rule tables, so the filter must include `packages/*/src/rules/**` — which most PRs touch anyway. Gains ~1 slot on a minority of PRs and risks silently skipping validation when a path shape is missed. |
| Consolidate small jobs into one | Frees ~5 slots but serialises ~110s of work that currently runs in parallel at ~30s. Net effect ambiguous without simulation, and it would drop check names people read.                                                    |
| Merge queue                     | Right answer for amplification (3.2 cycles/branch), already unblocked by #827 — but it is a repository setting and stays with a human.                                                                                      |
| Spread `install: false`         | Every one of these jobs runs an npm script; none can skip install.                                                                                                                                                          |

## Executed

`deps: 'lean'` on the nine `quality.yml` jobs that only run scripts out of
`scripts/`. The lean archive omits `apps/*/node_modules` and nothing else;
verified that none of the twelve scripts those jobs run imports from `apps/`,
and that their dependencies are root-hoisted.

This uses the **existing** `node-modules-lean-v4-*` key rather than adding one —
an earlier draft of this review claimed it would add a second archive and
therefore cost cache budget. That was wrong: more users of one key means a
better hit rate on a single entry, not a new entry.
