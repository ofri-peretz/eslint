---
name: ship-a-pr
description: The PR flow for this repo — branch, commit convention, CI gate, merge, and the post-merge auto-deploy verification. Use when opening, checking or merging a PR here, or when confirming a deploy reached production.
---

# Shipping a change

`git push origin main` is blocked by branch protection. The loop is
**branch → commit → push → PR → checks → merge → auto-deploy → confirm production**.

## 1. Branch from main

```bash
git fetch origin main && git checkout -b <type>/<short-slug> origin/main
```

Prefixes the linter accepts: `feat/ fix/ chore/ ci/ docs/ refactor/`.

## 2. Commit

Subject `<type>(<scope>): <subject>`; scope required, one of
`packages apps tools ci deps release docs workspace`. Body via HEREDOC, Claude co-author trailer.

Commit runs lefthook and takes time. A commitlint rejection is a **message** problem — fix the
subject, don't touch the source.

## 3. Push and open the PR

```bash
git push origin <branch>
gh -R ofri-peretz/eslint pr create --base main --head <branch> --title "..." --body "..."
```

Body: `## Summary` (one bullet per logical change), `## Test plan` (commands run and their
outcome; name any lock added), `## After merge`.

## 4. Wait for the gate

```bash
gh pr checks <PR> --watch
```

**Do not hand-roll `until … gh pr view --json statusCheckRollup … sleep`.** Measured across
3,627 local transcripts, loops of that shape cost 111 hours and 193 were killed by the harness
timeout, ending with nothing learned.

Required checks: oxlint, Prettier, TypeScript, Vitest, Playwright, Build. Then confirm every one
is `SUCCESS` — `--watch` returning only means nothing is still pending.

`mergeStateStatus == DIRTY` → conflict; `git fetch origin main && git merge origin/main`, don't
rebase blindly. `BLOCKED` with all checks green → branch protection wants a review. **Don't
`--admin` past it without asking.**

## 5. Merge

```bash
gh -R ofri-peretz/eslint pr merge <PR> --squash --delete-branch
```

## 6. Confirm the deploy actually landed

Merging fires `auto-deploy.yml`, which computes turbo-affected workspaces and dispatches the
per-app deploy. **Don't claim "live"** until all three hold:

1. `gh run list --workflow=auto-deploy.yml --limit=1` → `completed success` for the merge commit
2. the dispatched per-app workflow also `completed success`
3. the production URL HEADs 2xx

`docs` → `deploy-docs.yml` → eslint.interlace.tools · `storybook`/`registry` → `deploy.yml` →
storybook.interlace.tools / ds.interlace.tools

If `auto-deploy.yml` ran but no per-app workflow did, nothing was turbo-affected (e.g. a
workflow-only or root-docs change). That is the expected silent path — confirm in the `affected`
job summary.

## 7. Verify the lock

Per the regression policy in CLAUDE.md: confirm the lock for this change would have caught the
bug pre-deploy.
