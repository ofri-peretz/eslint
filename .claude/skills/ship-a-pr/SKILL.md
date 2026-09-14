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

Prefer this for waiting. Hand-rolled polling cost 111 hours across 3,627 local transcripts, and
193 of those loops were killed by the harness timeout — the turn ends having learned nothing, so
the next one starts over.

`--watch` returning means nothing is still _pending_. It does **not** mean everything passed.
Run the validation gate below before merging, always.

**Branch protection requires exactly two contexts.** Not six, and not the ones CLAUDE.md listed
until 2026-08-30 — five of those six names had never existed as job names at all, so an agent
polling for `Playwright (e2e + a11y)` waited for something that could not arrive:

```text
oxlint (fast pass)     — the cheap loop, every push
Quality (Full) Gate    — the heavy gate, and the one that actually blocks
```

`Quality (Full) Gate` is the important one, because of **when it runs**:
`pull_request: types: [ready_for_review, labeled, synchronize]`. A DRAFT PR without the
`run-full-ci` label never receives it, so the PR sits `BLOCKED` forever on a check nobody is
running. Mark the PR ready for review, or add the label. This is also why `main` can be red
without any PR having gone red — see the note in `quality-full.yml`.

Everything else on the PR — `Plugin Taxonomy`, `Unit Tests + Coverage (N/10)`, `Build (N/4)`,
`Typecheck (whole-graph tsgo)`, `Script & Repo-Config Locks`, `CodeQL`, `CodeRabbit` and the
rest — is informative, not required. They still have to be green before merging: the validation
gate below refuses on _any_ non-success check, which is stricter than branch protection and
deliberately so.

### The procedure, executed by `scripts/__tests__/merge-procedure.test.ts`

`.state` is not optional. A CheckRun carries `.conclusion`; a StatusContext (CodeRabbit) carries
only `.state`. Reading `.conclusion // .status` alone resolves a finished StatusContext to `""`,
which counts as pending — the loop then runs forever, and it reads as slow CI, so the natural
response is to wait longer. That defect shipped for months.

```bash
PR=<#>

# 1. Wait until every required check has a terminal state.
#
# `.state` is not optional here. A CHECK RUN carries `.conclusion`; a STATUS
# CONTEXT — CodeRabbit is one — carries only `.state`. Without `.state` in the
# fallback a finished CodeRabbit resolves to "", which this select counts as
# pending, and the loop never terminates. It reads as a slow CI run, so the
# usual response is to wait longer. Both jq expressions below read the same
# three fields in the same order for exactly this reason.
until [ "$(gh -R ofri-peretz/eslint pr view "$PR" \
  --json statusCheckRollup \
  --jq '[.statusCheckRollup[]? | select((.conclusion // .state // .status // "") as $s | $s == "IN_PROGRESS" or $s == "PENDING" or $s == "QUEUED" or $s == "")] | length')" = "0" ]; do
  sleep 20
done

# 2. Validation gate — refuse to merge unless EVERY required check is SUCCESS.
#
# The `// "UNREPORTED"` is the same requirement as the wait loop's `// ""`, and
# is needed for the same reason: an entry can carry none of the three fields.
# GitHub registers a required check before it creates it, so a branch update
# re-registers checks and the rollup briefly lists them with nothing set. The
# gate must still refuse — an unknown result is not a pass — but it must not
# call it a FAILURE. Without the fallback such an entry prints as a blank
# status, reads as a failing test, and sends the reader hunting one that does
# not exist. Reaching this line with UNREPORTED means a check registered after
# step 1 finished: re-run step 1, do not go looking for a break.
FAILED=$(gh -R ofri-peretz/eslint pr view "$PR" \
  --json statusCheckRollup \
  --jq '[.statusCheckRollup[]? | select((.conclusion // .state // .status // "UNREPORTED") as $s | $s != "SUCCESS" and $s != "SKIPPED" and $s != "NEUTRAL") | "\(.conclusion // .state // .status // "UNREPORTED")  \(.name // .context)"] | .[]')
if [ -n "$FAILED" ]; then
  echo "::error::PR $PR has non-success checks; not merging:"
  echo "$FAILED"
  exit 1
fi

gh -R ofri-peretz/eslint pr view "$PR" --json mergeable,mergeStateStatus,statusCheckRollup
```

If `mergeStateStatus == "DIRTY"` there's a conflict with `main`. Resolve
via `git fetch origin main && git merge origin/main`; do not rebase
blindly across unrelated changes.

If `mergeStateStatus == "BLOCKED"` **after step 2 has confirmed every check
is `SUCCESS`**, branch protection is waiting on a required review or an
unresolved thread (see CODEOWNERS / repository ruleset). **`--admin` is
authorised there — always, without asking.** A green branch held up by a
review requirement is the case the flag exists for.

What `--admin` is never for:

- a check reporting `FAILURE`, `CANCELLED` or `TIMED_OUT`;
- a check still pending — which is why the `.state` fix above matters: a poll
  that never terminates is the thing that tempts someone to skip step 2;
- `mergeStateStatus == "BEHIND"` — merge `origin/main` first and let CI re-run
  against what will actually land.

Step 2 is the authorisation. It is not a formality before it: it is the
entire basis on which the bypass is allowed.

## 5. Merge

```bash
gh -R ofri-peretz/eslint pr merge <PR> --squash --delete-branch
```

### After the merge

`Quality (Full)` also runs on **push to `main`**, and a failure there opens a tracking issue
titled `main is red — the full quality gate failed after a merge`. That trigger is the
difference between "broken for one merge" and "broken until Sunday": the heavy gate is PR-scoped
for cost, so before it existed a merge could land broken and sit red until the weekly cron.

It is not theoretical. PR #745 landed having edited two rule `.md` sources without re-running the
generator, failed `rule-docs-sync-drift` on main's tip, and was found four days later by
accident — after every branch cut in between had inherited it.

If you see that issue, the merge that caused it is the head of `main`.

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
