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

## 4. Wait, then merge through the gate

```bash
gh pr checks <PR> --watch                 # blocks until nothing is pending
scripts/pr-merge-gate.sh <PR> --merge     # refuses unless every check is SUCCESS
```

`--watch` returning means nothing is _pending_, not that everything passed. The gate script is
the merge procedure: it reads both check shapes (CheckRun and StatusContext), refuses any
non-success check (stricter than branch protection, deliberately), refuses `BEHIND` and `DIRTY`,
and uses `--admin` only for a fully green branch held up by a review. Its error names the fix.
`scripts/__tests__/merge-procedure.test.ts` runs it against a fake `gh`.

**Branch protection requires exactly three contexts.** `scripts/setup-branch-protection.sh`
declares them and `scripts/__tests__/claude-md-contract.test.ts` holds this list to it:

```text
oxlint (fast pass)     — the cheap loop, every push
Quality (Full) Gate    — the heavy gate, and the one that actually blocks
review                 — the automated reviewer (claude-code-review.yml)
```

`Quality (Full) Gate` runs on `ready_for_review`, `labeled` and `synchronize`: a draft without the
`run-full-ci` label never gets it, and the gate script says so.

### After the merge

`Quality (Full)` also runs on **push to `main`**, and a failure there opens a tracking issue
titled `main is red — the full quality gate failed after a merge`. That trigger is the
difference between "broken for one merge" and "broken until Sunday": the heavy gate is PR-scoped
for cost, so before it existed a merge could land broken and sit red until the weekly cron.

It is not theoretical. PR #745 landed having edited two rule `.md` sources without re-running the
generator, failed `rule-docs-sync-drift` on main's tip, and was found four days later by
accident — after every branch cut in between had inherited it.

If you see that issue, the merge that caused it is the head of `main`.

## 5. Confirm the deploy actually landed

Merging fires `auto-deploy.yml`, which computes turbo-affected workspaces and dispatches the
per-app deploy. **Don't claim "live"** until all three hold:

1. `gh run list --workflow=auto-deploy.yml --limit=1` → `completed success` for the merge commit
2. the dispatched per-app workflow also `completed success`
3. the production URL HEADs 2xx

`docs` → `deploy-docs.yml` → eslint.interlace.tools, the only app this repo deploys
(storybook and ds deploy from ofri-peretz/interlace).

If `auto-deploy.yml` ran but no per-app workflow did, nothing was turbo-affected (e.g. a
workflow-only or root-docs change). That is the expected silent path — confirm in the `affected`
job summary.

## 6. Verify the lock

Per the regression policy in CLAUDE.md: confirm the lock for this change would have caught the
bug pre-deploy.
