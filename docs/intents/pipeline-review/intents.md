# Pipeline intents — 3 per stage, hole-checked

Companion to [`findings.md`](./findings.md). Five stages, three intents each,
three holes found and fixed in every one. Every number is measured; where an
intent was rejected the measurement that killed it is recorded, because "we
looked and it did not pay" is a result worth keeping.

Binding constraint throughout: **20 concurrent jobs** (GitHub Free, no
public-repo exemption). Minutes are free; slots are not.

---

## Stage 1 — PR gate

### I1.1 Stop paying the review tail on diffs that cannot benefit

`review` is 88-99% of PR wall clock, median 124s. 13% of PRs are documentation
only. **Shipped in #842.**

Holes found and fixed:

1. _A `paths:` filter would have blocked every merge forever._ `review` is a
   required context; a workflow filtered out by `paths` never reports, and
   branch protection waits on a check that will never arrive. Fixed by gating at
   JOB level — a skipped job still reports, and a skipped required check
   satisfies protection.
2. _The gate failed closed._ First draft skipped the review when the file list
   could not be read. That disables the reviewer precisely when something is
   already wrong, and reports success. Fixed: every unexpected state ends in a
   review running.
3. _`.github/`-only was in the skip list._ It is 3% of PRs and tempting. Both CI
   outages on 2026-09-02 were workflow diffs. Removed from the skip set.

### I1.2 Shrink the per-job setup that every queued job pays twice for

Setup is 31% of all step time; `Run ./.github/actions/setup` is 16.1 min across
73 invocations. **Shipped in #845** — `deps: 'lean'` on nine script-only jobs.

Holes found and fixed:

1. _"lean adds a second cache archive."_ It does not — `node-modules-lean-v4-*`
   already exists with two users. More users is a better hit rate on ONE entry.
   This error had already caused the change to be rejected once.
2. _No check that the nine jobs survive without `apps/*/node_modules`._ Fixed by
   grepping all twelve scripts they run for `apps/` imports before shipping —
   none — and confirming their dependencies are root-hoisted.
3. _`install: false` was proposed for the same jobs._ Wrong: every one runs an
   npm script and needs a tree. Downgraded to `lean`.

### I1.3 Keep one PR under the 20-slot ceiling

One full-gate PR wants 22-30 jobs. Queueing is p50 25s / p90 69s / max 87s.

Holes found and fixed:

1. _"Consolidate the small jobs" was costed as a pure win._ It is not: merging
   six jobs frees five slots but serialises ~110s of work that today runs in
   parallel at ~30s. **Rejected** — ambiguous without simulating the queue.
2. _It would have deleted required check names._ `oxlint (fast pass)` is a
   required context; folding it into a combined job renames it and blocks every
   merge. Any future consolidation must preserve that name exactly.
3. _The measurement behind it was taken at the wrong level._ Run-level queue
   latency is 0s and says nothing; job-level is where the ceiling shows. Recorded
   in findings.md so the next reader does not repeat it.

**Status: rejected, deliberately.** The ceiling is real but every cure measured
worse than the disease. Revisit only with a queue simulation.

---

## Stage 2 — merge / push

### I2.1 Do not re-prove on `push` what the PR already proved

`quality.yml` and `quality-full.yml` both carry `push: branches: [main]`.

Holes found and fixed:

1. _"The push run is redundant."_ It is not. A PR can merge while BEHIND, and an
   `--admin` or draft-merged PR skips the heavy gate entirely; the push run is
   the only thing that catches a broken main. **Rejected** — this is the control
   that makes `main-cannot-be-silently-red` true.
2. _A merge queue would make it redundant._ Only once the queue is enabled, and
   that is a repo setting held by a human. Not actionable here.
3. _Cost was assumed, not measured._ It is one run per merge, off the critical
   path of any PR. Nobody waits on it.

### I2.2 Stagger the release-adjacent crons off the PR-gate peak

Deferred to I4.2 — same root cause, recorded once.

### I2.3 Auto-deploy already filters well

308 deploys / 422 merges = 0.73 per merge; turbo-affected filtering works.

Holes found and fixed:

1. _"10.3 deploys/day is too many."_ Against a Vercel deployment allowance this
   is comfortable, and each is turbo-affected. **Rejected** — no defect.
2. _Batching multiple merges into one deploy was proposed._ It would delay
   publishing docs for no measured benefit and contradicts the one-commit
   one-deploy rule in CLAUDE.md.
3. _The 308 figure was first read as capped at 100._ Re-measured with
   pagination before being used.

---

## Stage 3 — deploy

### I3.1 `deploy.yml` has not run in 30 days

0 runs. Either dead or a rollback path.

Holes found and fixed:

1. _"Unused, delete it."_ It is dispatched by `auto-deploy.yml` for storybook and
   registry, which simply were not affected in the window. **Rejected** —
   deleting it would break two apps' deploy path.
2. _A 30-day window is too short to call anything dead._ Corrected to check the
   dispatcher, not the run history.
3. _No lock asserts the dispatcher's targets still exist._ Recorded as a gap;
   not built, because a broken dispatch already fails loudly.

### I3.2 The docs deploy carries a Playwright smoke gate

Holes found and fixed:

1. _"Move the smoke test off the deploy path to speed it up."_ Nobody waits on a
   deploy; it is not on any critical path. **Rejected.**
2. _It would remove the only post-deploy verification._ That is the whole point
   of it.
3. _"Speed" here was never measured against a number anyone experiences._

### I3.3 Deploy verification is manual in CLAUDE.md

Three shell steps a human runs. Recorded as a candidate for automation; not
executed, because the failure mode (a human forgets) has not been observed.

---

## Stage 4 — scheduled

### I4.1 Nine scheduled jobs still have no failure reporting

The `cron-alerting-debt.json` ratchet from #812 records nine uncovered jobs
across eight workflows.

Holes found and fixed:

1. _The ratchet could be satisfied by deleting entries._ It cannot — the lock
   recomputes uncovered jobs from the workflow graph.
2. _"21 of 22 declare reporting" was a loose grep._ A file mentioning
   `report-failure` passes a grep while the failing JOB has none.
3. _A live canary was proposed and deferred._ Correct call: it needs its
   `issues: write` revoked to prove anything, which is a permissions change.

**Status: open, tracked by the ratchet.**

### I4.2 Crons collide on the same 20 slots

Measured: `metrics-freshness` and `weekly-benchmark` fire at **exactly 09:00
Monday**; `benchmark.yml` (8 jobs) shares the 09:00 hour. Five workflows land in
hour 9 and five in hour 4.

Holes found and fixed:

1. _"Collisions per hour" is the wrong unit._ Two jobs 30 minutes apart do not
   contend. Re-measured for exact minute+dow; exactly one true collision.
2. _Staggering could push a job past a downstream dependency._ Checked: none of
   the three has a `needs` relationship to another workflow.
3. _A stagger is invisible if nothing records why._ The new minute carries a
   comment naming the workflow it was moved away from.

**Status: executing.**

### I4.3 `benchmark.yml` is the heaviest scheduled workflow

8 jobs. Runs weekly.

Holes found and fixed:

1. _"Shard it further for speed."_ It is scheduled; no human waits. **Rejected.**
2. _More shards would worsen the ceiling it already strains._
3. _Its real defect was silence, not slowness_ — fixed in #812.

---

## Stage 5 — shared setup and cache

### I5.1 Actions cache sits at 9.74 GB of 10 GB

**Partly shipped in #828** (npm registry cache dropped, -2.36 GB, ages out via
LRU).

Holes found and fixed:

1. _"Dropping a cache frees space immediately."_ It does not; GitHub keeps
   entries until LRU evicts them. Stated in the PR so the number is not read as
   a failed fix.
2. _The npm cache looked free._ Under eviction no cache is free — it bids
   against every other cache.
3. _`nextjs-*` (2.68 GB across 7 entries) is untouched._ Recorded as the next
   candidate; its key rotates on every source change, which is the actual cause.

### I5.2 Vercel Remote Cache is rate-limited, not size-limited

**Shipped in #832** — bound at 7 opted-in jobs.

Holes found and fixed:

1. _Storage was assumed to be the cap._ Artifacts expire after 7 days; the cap
   is requests/minute.
2. _The budget was checked against the wrong plan._ Hobby is 100/min and we
   would send 259-798. The plan is still unknown — recorded as the open input.
3. _A merge queue makes it worse_, because a queue run executes all shards.

### I5.3 The setup composite runs 73 times per ~40 runs

13s median each. **Partly addressed in #845.**

Holes found and fixed:

1. _"31% overhead" implied a 31% win._ It does not — the jobs paying it are not
   on the critical path, and minutes are free. The real gain is slot pressure.
2. _tsbuildinfo caching was tried and reverted_ (ADR 0003): caching it without
   `dist` let tsgo skip work it reported as done.
3. _Any further trimming needs the lane-deps lock extended_, or a job will fail
   on a dependency the archive silently omits.
