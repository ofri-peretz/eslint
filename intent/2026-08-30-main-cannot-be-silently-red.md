---
slug: main-cannot-be-silently-red
opened: 2026-08-30
packages: []
cases: []
---

## What

Make a broken `main` visible within one merge instead of within one week.

The heavy gate — `Quality (Full) Gate`, one of the two contexts branch
protection requires — runs on `pull_request: [ready_for_review, labeled,
synchronize]` and on a **weekly** Sunday cron. A merge that breaks something
the cheap loop does not cover therefore sits red on `main` until Sunday, and
nothing tells anybody.

## Why

This is not hypothetical. PR #745 landed on `main` having edited two rule `.md`
sources without re-running the generator, so `rule-docs-sync-drift` failed on
main's tip. It was found four days later, by accident, while merging main into
an unrelated branch. `Changesets` is red on `main` right now.

The cost is not the red itself — it is that every branch cut afterwards
inherits the failure and its author spends the first hour deciding whether they
caused it. I lost that hour today, twice.

The weekly cron exists for cost, and that trade was right when it was made. The
question is whether post-merge verification has to be the same heavy job, or
whether the cheap subset that would have caught #745 can run on every push to
main.

## Constraints

- **Actions minutes are the reason the gate is PR-scoped.** Any post-merge run
  must be measurably cheaper than the full gate, or it recreates the cost the
  cron was avoiding.
- No new required context on branch protection. Adding one blocks merges on a
  job that has never run before, which is how a repo acquires a permanently red
  gate.
- The signal has to reach a human. A workflow that goes red where nobody looks
  is the same failure with more YAML — an issue, a notification, or nothing.
- Do not weaken the draft-PR behaviour to fix this. Drafts skipping the heavy
  gate is deliberate and cheap; the fix belongs after the merge, not before it.

## Done when

- A push to `main` runs the checks that would have caught #745 —
  `rule-docs-sync-drift` and the repo-config locks at minimum.
- A red `main` produces a notification a human receives, not just a red square
  in a tab nobody has open.
- `CLAUDE.md` states the post-merge behaviour beside the branch-protection
  contexts, and `claude-md-contract.test.ts` asserts it still says so.
- Median time from a bad merge to somebody knowing: **under one merge cycle**,
  measured against the four days #745 took.

## Outcome — 2026-08-30

**Mostly delivered by someone else, concurrently.** #754 landed on this branch
while the intent was being written and added `push: branches: [main]` to
`quality-full.yml`, plus a shared `.github/actions/report-failure` that six
scheduled workflows now call. Two of the four Done-when conditions were already
met by the time this was picked up.

One gap remained, and it was the half that mattered. The failure report fired
on `github.event_name == 'schedule'` only, so the **push** trigger — the thing
that turns "broken until Sunday" into "broken for one merge" — had no channel
to a human. Immediate detection producing a red square in a tab nobody has open
is the weekly cron's outcome with extra Actions minutes spent.

Closed with a second report, under a SEPARATE title because the title is the
deduplication key and the two situations are different: a push failure names
the merge that caused it and is actionable now; a schedule failure means main
has been broken for up to a week. Sharing one issue would let the second hide
inside the first.

`CLAUDE.md` gained an "After the merge" section, and
`claude-md-contract.test.ts` asserts three things — that the section says the
gate runs on push to main, that it names the issue title a reader would search
for, and that **the workflow actually reports on push**. The last is the one
that matters: documentation of a channel that does not exist is worse than
silence. Verified by sabotage.

Not done, and deliberately: no measurement of median time-to-detection. It
needs a broken main to measure and manufacturing one to produce a number would
be absurd. The next real occurrence is the measurement.
