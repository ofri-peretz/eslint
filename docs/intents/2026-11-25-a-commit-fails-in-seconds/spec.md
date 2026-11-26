**Accepted:** night loop, under the owner's delegation of 2026-11-26

# Spec — a commit that will fail, fails in seconds

Intent: [`intent.md`](./intent.md).

## Requirements

- **R1** A `git commit` through Claude whose message has an invalid commitlint scope is denied
  in under 2 seconds, naming the valid scopes. Same config as `commit-msg`, so the two cannot
  disagree.
- **R2** A commit message with no `Verified-by` trailer is denied the same way, by the same rule
  `commit-msg` applies.
- **R3** A workspace `dist/` that a hook imports and that is older than its own `src/` fails
  `pre-commit` at `stale-build-artifacts` with `npx turbo run build --filter=<pkg>`.
- **R4** A `dist/` lacking an export its source index has fails the same step (landed in #1810,
  assertion 3 of `scripts/check-stale-build-artifacts.ts`).
- **R5** Over the next 20 agent commits, failed attempts drop from 33% to under 10%, none caused
  by message format or stale output.

## Design

**R3 (this PR).** Assertion 4 in `scripts/check-stale-build-artifacts.ts`: for each package in
`HOOK_IMPORTED_DISTS` (today `eslint-devkit`, the only dist the hooks import: plugins load it by
name and its `main` is `./dist`), the newest file in `dist/` must not be older than the newest
`.ts` in `src/`. No dist at all is skipped, as assertions 2 and 3 do. Reads mtimes only and
builds nothing (Constraint 3). Plugins are not listed: the hooks load them from `src`, and making
every rule edit wait on a rebuild would get the step switched off.

**R1, R2 (next).** A `PreToolUse` station on `git commit` that runs `commitlint` on the `-m`/`-F`
message and the `Verified-by` check, and denies with the fix. The canonical copy is hookset in
burgee, and eslint vendors it (`.claude/hooks/guard-bash.mjs`); eslint#1813 is moving hookset
right now. So R1 and R2 land in burgee's hookset first and reach eslint through the next hookset
bump, not as a local edit that the bump would overwrite.

## Verification

- R3, R4: `npx vitest run --config scripts/__tests__/vitest.config.mts
scripts/__tests__/stale-dist-is-detected.lock.test.ts`. The new cases set mtimes on a fixture
  devkit (`utimesSync`): source newer than dist exits 1 with the rebuild command; dist newer exits
  0; a plugin with an older dist exits 0. The `@provenBy` mutation removes the push, and that
  case goes red (run 2026-11-26: 1 failed, 8 passed; restored: 9 passed).
- On the warm checkout's real tree, `tsx scripts/check-stale-build-artifacts.ts
../eslint/packages` exits 0 (a freshly built devkit is not flagged).
- R1, R2: a hook test in burgee feeds a `git commit -m "ci(tools): x"` call and asserts the deny.
- R5: grep the hook logs of the next 20 agent commits, as the intent measured.

## Risks

- **Ordering.** Lefthook runs `pre-commit` with `parallel: true`, so `case-registry` still starts
  beside the stale check. It no longer runs blind: the stale step fails within seconds and names
  the fix. Strict ordering (`piped`) would slow every commit, so it is not done.
- **mtime noise.** A `git switch` that rewrites a devkit source flags the dist. That is correct:
  the build no longer matches the tree. Switching away and back flags it once, and one rebuild
  clears it.
- **A forgotten list.** A new dist the hooks start importing is not checked until it is added to
  `HOOK_IMPORTED_DISTS`. The comment there says so.

## Out of scope

- Rebuilding automatically. Constraint 3 allows it under 30s, but a hook that writes `dist/`
  during a commit has raced a parallel step before. Reporting the command is enough.

## Owner steps

None for R3. R1 and R2 need a burgee hookset release, which this loop can open as its own PR.
