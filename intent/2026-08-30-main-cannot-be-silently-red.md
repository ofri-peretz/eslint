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
