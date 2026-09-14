# CLAUDE.md — agent contract for this repo

Release flow, branch protection, plugin scope and CI gates live in [AGENTS.md](./AGENTS.md).
The full PR walkthrough is the `ship-a-pr` skill — it loads on demand, so it is not here.

## Lock everything you fix

A fix is **not done** until a test would have caught the bug pre-deploy. Humans and agents ship
here in parallel; an unlocked invariant regresses the next time someone refactors nearby.

The test for every change: _if I revert the fix, does CI go red?_ If no, it is half-done.

- Structural/visual regressions → a vitest lock in `apps/docs/src/__tests__/*-lock.test.ts(x)`.
- Cached-data or external-contract drift → a shape lock **and** a live check in the sync script.
- New homepage section, external-data dependency or visual primitive → add its lock in the same PR.

## Commands

- `npm run ci:local` — mirrors the pre-push gate. The closest local check to CI.
- Reproduce visual bugs at **~390px** before claiming a fix. Mobile is the most regression-prone
  surface here and desktop scroll never touches it.

## Workflow

- Branch `<type>/<slug>` (`feat|fix|chore|ci|docs|refactor`). Commit `<type>(<scope>): <subject>`
  — scope required, from `packages apps tools ci deps release docs workspace`.
- `git commit` and `git push` run lefthook and can take minutes. That is not a hang. If one is
  killed mid-flight, check `git log origin/<branch> -1` before retrying — a timed-out push may
  still have landed.
- Waiting on CI? `gh pr checks <PR> --watch`. **Never hand-roll `until … gh pr view … sleep`** —
  those loops get killed by the harness timeout and end knowing nothing.
- IMPORTANT: never `--no-verify`. The hooks are the gate.

## Gotchas

- **Only `main` deploys.** Don't add `push:`/`pull_request:` deploy triggers or enable Vercel
  preview deploys on branches. Cancel stray non-main builds rather than merging past them.
- **Dev hits live APIs; prod serves cached JSON.** Broken-in-prod / fine-in-dev is the _expected_
  failure mode, not an exotic one.
- **Don't loosen CSP headers** in `next.config.mjs` to make a feature work. New image host → add
  it to `images.remotePatterns` explicitly; never a wildcard, never bypass `next/image`.
