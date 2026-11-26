---
slug: a-commit-fails-in-seconds
opened: 2026-11-25
packages: []
cases: []
---

# Intent — a commit that will fail, fails in seconds, not minutes

> Stage 1 artifact. Opened from the AI-SDLC alignment work on eslint#1795 and
> [interlace#219](https://github.com/ofri-peretz/interlace/pull/219) (`AI_SDLC_PHILOSOPHY.md`).

**Status:** draft · **Opened:** 2026-11-25 · **Owner:** @ofri-peretz

---

## What is wanted

Every failure a commit will hit for a reason known before the expensive hooks run is reported
first, in seconds, with the command that fixes it:

1. **The message is checked before `pre-commit`.** Lefthook runs `pre-commit` (affected tests,
   minutes under load) before `commit-msg` (commitlint and the `Verified-by` receipt, about one
   second). A bad scope or a missing receipt therefore costs a full `pre-commit` run first. A
   Claude Code `PreToolUse` hook on `git commit` (in `guard-bash`, or a hookset station) runs
   commitlint and the receipt check on the `-m`/`-F` message and denies the call with the fix.
2. **Stale build output is caught before a hook imports it.** Hooks that import a package's
   `dist/` (`case-registry`, `hookset-verify`'s typecheck) crashed on output older than the
   source (TS6305; `valueFollow` undefined). `check-stale-artifacts` runs but did not catch
   either. It must compare each workspace `dist/` that a hook imports against its `src/`, and
   fail with `npx turbo run build --filter=<pkg>`, or rebuild.

## Why now

Measured from the hook logs of one session, eslint#1795 (2026-11-25):

- 21 commit attempts; **7 failed (33%)**, plus 2 pushes that hung under machine load.
- Causes: **3 stale build output**, **3 message format** (commitlint scope, footer over 100
  characters, missing `Verified-by`), 2 the agent's own code (unused import, an unformatted
  file), 2 load or synced data.
- 6 of the 10 failures were knowable before any test ran.

The Claude Code best-practices guidance is to give the agent one fast check it can run. Here the
fast check exists but runs last.

## Affected users and systems

`.claude/hooks/guard-bash.mjs` (or a hookset station: the canonical copy is in burgee),
`scripts/check-stale-artifacts`, `lefthook.yml`. Every repo that vendors hookset gets item 1 once
it lands in burgee.

## Constraints

- Never `--no-verify`, and never move a check out of lefthook: this adds an earlier copy and does
  not replace the gate.
- The early message check must use the same commitlint config and receipt rule as `commit-msg`,
  so the two can never disagree.
- The stale-build check reads timestamps or hashes only and builds nothing on its own unless the
  rebuild finishes in under 30s.

## Success criteria

- A `git commit -m "ci(tools): x"` (an invalid scope) through Claude is denied in under 2 seconds,
  naming the valid scopes; a hook test feeds the call and asserts the deny.
- A commit message with no `Verified-by` is denied the same way.
- With `packages/eslint-devkit/dist` older than its `src`, `pre-commit` fails at the stale check
  with the rebuild command, before `case-registry` runs. This is proven by touching a source file
  in a lock test.
- Re-measured over the next 20 agent commits: failed attempts drop from 33% to under 10%, and no
  failure is caused by message format or stale output. The method: grep the hook logs, as above.
