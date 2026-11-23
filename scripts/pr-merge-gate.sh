#!/usr/bin/env bash
# pr-merge-gate — the merge procedure as code, so no agent re-derives it from prose.
#
#   scripts/pr-merge-gate.sh <PR>           check only: exit 0 means safe to merge
#   scripts/pr-merge-gate.sh <PR> --merge   check, then squash-merge
#
# Exit codes: 0 ok · 1 refused (a check is not SUCCESS, or the branch is BEHIND/DIRTY) · 2 still pending.
# It asks GitHub once and never loops. Wait first with `gh pr checks <PR> --watch`.
# Locked by scripts/__tests__/merge-procedure.test.ts, which runs it against a fake `gh`.

set -euo pipefail

REPO="${PR_MERGE_GATE_REPO:-ofri-peretz/eslint}"
PR="${1:?usage: scripts/pr-merge-gate.sh <PR> [--merge]}"
MODE="${2:-}"

# A CheckRun carries .conclusion; a StatusContext (CodeRabbit) carries only .state; a required check
# GitHub has registered but not yet created carries none of the three. Reading `.conclusion // .status`
# alone turned a finished CodeRabbit into "", counted as pending, and the wait never ended. Both
# expressions read the same fields in the same order, and both end in a fallback: "" (pending) while
# waiting, "UNREPORTED" at the gate, where an unknown result is refused but not called a failure.
WAIT_JQ='[.statusCheckRollup[]? | select((.conclusion // .state // .status // "") as $s | $s == "IN_PROGRESS" or $s == "PENDING" or $s == "QUEUED" or $s == "")] | length'
GATE_JQ='[.statusCheckRollup[]? | select((.conclusion // .state // .status // "UNREPORTED") as $s | $s != "SUCCESS" and $s != "SKIPPED" and $s != "NEUTRAL") | "\(.conclusion // .state // .status // "UNREPORTED")  \(.name // .context)"] | .[]'

json=$(gh -R "$REPO" pr view "$PR" --json statusCheckRollup,mergeStateStatus,isDraft)

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
gh -R "$REPO" pr merge "$PR" --squash --delete-branch ${admin[@]+"${admin[@]}"}
