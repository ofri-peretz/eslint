#!/usr/bin/env bash
# pr-merge-gate — the merge procedure as code, so no agent re-derives it from prose.
#
#   scripts/pr-merge-gate.sh <PR>           check only: exit 0 means safe to merge
#   scripts/pr-merge-gate.sh <PR> --merge   check, then squash-merge
#
# Exit codes: 0 ok · 1 refused (a check is not SUCCESS, or the branch is BEHIND/DIRTY) · 2 still pending.
# It asks GitHub once and never loops. Wait first with `gh pr checks <PR> --watch`.
# Locked in ofri-peretz/eslint by scripts/__tests__/merge-procedure.test.ts, which runs it against a fake `gh`.

set -euo pipefail

# gh infers the repo from the checkout; PR_MERGE_GATE_REPO=owner/name overrides it. Same file in every
# Interlace repo.
repo=()
if [ -n "${PR_MERGE_GATE_REPO:-}" ]; then repo=(-R "$PR_MERGE_GATE_REPO"); fi
PR="${1:?usage: scripts/pr-merge-gate.sh <PR> [--merge]}"
MODE="${2:-}"

# A CheckRun carries .conclusion; a StatusContext (CodeRabbit) carries only .state; a required check
# GitHub has registered but not yet created carries none of the three. Reading `.conclusion // .status`
# alone turned a finished CodeRabbit into "", counted as pending, and the wait never ended. Both
# expressions read the same fields in the same order, and both end in a fallback: "" (pending) while
# waiting, "UNREPORTED" at the gate, where an unknown result is refused but not called a failure.
WAIT_JQ='[.statusCheckRollup[]? | select((.conclusion // .state // .status // "") as $s | $s == "IN_PROGRESS" or $s == "PENDING" or $s == "QUEUED" or $s == "")] | length'
GATE_JQ='[.statusCheckRollup[]? | select((.conclusion // .state // .status // "UNREPORTED") as $s | $s != "SUCCESS" and $s != "SKIPPED" and $s != "NEUTRAL") | "\(.conclusion // .state // .status // "UNREPORTED")  \(.name // .context)"] | .[]'

# `gh pr view` and `gh pr merge` go through GraphQL, which Claude Code cloud sessions cannot reach.
# When it fails, the same rollup is rebuilt from REST (check runs + commit statuses), in the same
# shape, so both jq expressions below judge it identically.
rest=""
rest_repo() {
  if [ -n "${PR_MERGE_GATE_REPO:-}" ]; then echo "$PR_MERGE_GATE_REPO"; return; fi
  git remote get-url origin | sed -E 's#\.git$##; s#.*[/:]([^/:]+/[^/:]+)$#\1#'
}
rest_view() {
  local r pr sha
  r=$(rest_repo)
  pr=$(gh api "repos/$r/pulls/$PR") || exit 1
  sha=$(jq -r .head.sha <<<"$pr")
  jq -n \
    --argjson pr "$pr" \
    --argjson runs "$(gh api --paginate "repos/$r/commits/$sha/check-runs?per_page=100" --jq '.check_runs[] | {name, status: (.status | ascii_upcase), conclusion: ((.conclusion // "") | ascii_upcase)}' | jq -s .)" \
    --argjson statuses "$(gh api "repos/$r/commits/$sha/status" --jq '[.statuses[] | {context, state: (.state | ascii_upcase)}]')" \
    '{statusCheckRollup: ($runs + $statuses), mergeStateStatus: ($pr.mergeable_state | ascii_upcase), isDraft: $pr.draft, headRefName: $pr.head.ref}'
}
if ! json=$(gh ${repo[@]+"${repo[@]}"} pr view "$PR" --json statusCheckRollup,mergeStateStatus,isDraft 2>&1); then
  # Only an unreachable GraphQL earns the fallback. A wrong PR number or broken auth is reported as is.
  if ! grep -qi graphql <<<"$json"; then
    echo "$json" >&2
    exit 1
  fi
  rest=1
  json=$(rest_view) || exit 1
fi

pending=$(jq -r "$WAIT_JQ" <<<"$json")
if [ "$pending" != "0" ]; then
  echo "pr-merge-gate: $pending check(s) still pending on PR $PR. Wait with: gh pr checks $PR --watch" >&2
  if [ "$(jq -r .isDraft <<<"$json")" = "true" ]; then
    echo "pr-merge-gate: PR $PR is a draft. Quality (Full) Gate never runs on a draft without the run-full-ci label: mark it ready for review." >&2
  fi
  exit 2
fi

failed=$(jq -r "$GATE_JQ" <<<"$json")
if [ -n "$failed" ]; then
  echo "pr-merge-gate: PR $PR has non-success checks; not merging:" >&2
  echo "$failed" >&2
  if grep -q '^UNREPORTED' <<<"$failed"; then
    echo "pr-merge-gate: UNREPORTED means a check registered after the wait finished. Wait again; nothing is broken." >&2
  fi
  exit 1
fi

# Every check is SUCCESS. That, and only that, is what authorises --admin: a green branch held up by a
# required review is the case the flag exists for. Never for a failing, pending or BEHIND branch.
state=$(jq -r .mergeStateStatus <<<"$json")
admin=()
case "$state" in
  CLEAN | HAS_HOOKS | UNSTABLE) ;;
  BLOCKED) admin=(--admin) ;;
  BEHIND)
    echo "pr-merge-gate: PR $PR is BEHIND main. Run git fetch origin main && git merge origin/main, push, and let CI re-run against what will land." >&2
    exit 1
    ;;
  DIRTY)
    echo "pr-merge-gate: PR $PR conflicts with main. Merge origin/main and resolve; do not rebase across unrelated changes." >&2
    exit 1
    ;;
  *)
    echo "pr-merge-gate: PR $PR has mergeStateStatus $state; not merging." >&2
    exit 1
    ;;
esac

echo "pr-merge-gate: every check on PR $PR is SUCCESS (mergeStateStatus $state)."
[ "$MODE" = "--merge" ] || exit 0
if [ -n "$rest" ]; then
  # REST has no --admin flag: an admin's merge call bypasses a pending review on its own. The gate
  # above already refused every case where that bypass is not allowed.
  r=$(rest_repo)
  gh api -X PUT "repos/$r/pulls/$PR/merge" -f merge_method=squash >/dev/null
  gh api -X DELETE "repos/$r/git/refs/heads/$(jq -r .headRefName <<<"$json")" >/dev/null 2>&1 ||
    echo "pr-merge-gate: merged, but could not delete the head branch." >&2
  echo "pr-merge-gate: merged PR $PR."
  exit 0
fi
gh ${repo[@]+"${repo[@]}"} pr merge "$PR" --squash --delete-branch ${admin[@]+"${admin[@]}"}
