#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────
# Setup Branch Protection for main
#
# Declares the protection that is live on GitHub. Re-checked against
# `gh api repos/ofri-peretz/eslint/branches/main/protection` on 2026-11-07.
# A declaration that disagrees with GitHub is worse than none, so change
# this file in the same PR as the setting.
#
#   - Required checks: "oxlint (fast pass)" (quality.yml), "Quality (Full)
#     Gate" (quality-full.yml) and "review" (claude-code-review.yml).
#   - `strict: false`: a PR need not be up to date with main. The push-to-main
#     run of Quality (Full) is the backstop that turns a semantically broken
#     merge red (ADR 0012). No merge queue.
#   - No required human approval (0 reviews). The `review` check is the
#     automated reviewer; conversations must be resolved before merge.
#   - Enforce admins, linear history, no force-push, no deletion.
#
# Run: ./scripts/setup-branch-protection.sh
# Re-run safe: idempotent — overwrites existing rules on each run.
# ─────────────────────────────────────────────────────────────────────────

REPO_OWNER="${GITHUB_REPOSITORY_OWNER:-ofri-peretz}"
REPO_NAME="${GITHUB_REPOSITORY_NAME:-eslint}"
BRANCH="main"

# Match each job's displayed `name:` exactly — the required-checks API
# matches on the displayed name.
REQUIRED_CHECKS='["oxlint (fast pass)","Quality (Full) Gate","review"]'

echo "🔒 Setting up branch protection for '$BRANCH'"
echo "   Repo:            $REPO_OWNER/$REPO_NAME"
echo "   Required checks: $REQUIRED_CHECKS"
echo ""

if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) is not installed → https://cli.github.com/"
  exit 1
fi
if ! gh auth status &> /dev/null; then
  echo "❌ Not authenticated → run: gh auth login"
  exit 1
fi

echo "📋 Current protection state:"
gh api "repos/$REPO_OWNER/$REPO_NAME/branches/$BRANCH/protection" 2>/dev/null \
  | jq -r '"  required_checks: \(.required_status_checks.contexts // [] | join(", "))\n  strict: \(.required_status_checks.strict)\n  enforce_admins: \(.enforce_admins.enabled)\n  allow_force_pushes: \(.allow_force_pushes.enabled)"' \
  2>/dev/null || echo "  (no rules yet)"
echo ""

echo "🔧 Applying protection rules..."

PAYLOAD=$(jq -n --argjson checks "$REQUIRED_CHECKS" '{
  required_status_checks: {
    strict: false,
    contexts: $checks
  },
  enforce_admins: true,
  required_pull_request_reviews: {
    dismiss_stale_reviews: false,
    require_code_owner_reviews: false,
    required_approving_review_count: 0
  },
  restrictions: null,
  allow_force_pushes: false,
  allow_deletions: false,
  required_linear_history: true,
  required_conversation_resolution: true,
  lock_branch: false,
  allow_fork_syncing: false
}')

echo "$PAYLOAD" \
  | gh api "repos/$REPO_OWNER/$REPO_NAME/branches/$BRANCH/protection" \
      --method PUT \
      --input - \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" >/dev/null || {
        cat <<EOF

⚠️  API call failed — fall back to manual configuration:
   https://github.com/$REPO_OWNER/$REPO_NAME/settings/branches

   Required checks:  $REQUIRED_CHECKS (strict: off)
   Enforce admins:   ON
   Force pushes:     OFF
   Deletions:        OFF
   Linear history:   ON
   PR reviews:       0 required
   Conversations:    must resolve before merge
EOF
        exit 1
      }

echo ""
echo "✅ Branch protection applied (strict: off, backstop: push-to-main Quality (Full))."
