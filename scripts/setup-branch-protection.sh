#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────
# Setup Branch Protection for main
#
# What this configures:
#   - "Quality Gate" (the aggregate job in .github/workflows/quality.yml)
#     is the SINGLE required status check. New gates added under quality.yml
#     auto-propagate via the aggregate's `needs:` list — you do not need to
#     update this script when adding a new check.
#   - Force-push and branch deletion are blocked, even for admins.
#   - Linear history required (squash/rebase only) — keeps `git log` clean
#     for changesets-driven CHANGELOGs.
#   - 1 PR review required, with stale review dismissal on new commits.
#
# Run: ./scripts/setup-branch-protection.sh
# Re-run safe: idempotent — overwrites existing rules on each run.
# ─────────────────────────────────────────────────────────────────────────

REPO_OWNER="${GITHUB_REPOSITORY_OWNER:-ofri-peretz}"
REPO_NAME="${GITHUB_REPOSITORY_NAME:-eslint}"
BRANCH="main"

# The single aggregate check from quality.yml. Match the job's `name:` field
# exactly — GitHub's required-checks API matches on the displayed name.
REQUIRED_CHECK="Quality Gate"

echo "🔒 Setting up branch protection for '$BRANCH'"
echo "   Repo:           $REPO_OWNER/$REPO_NAME"
echo "   Required check: $REQUIRED_CHECK"
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
  | jq -r '"  required_checks: \(.required_status_checks.contexts // [] | join(", "))\n  enforce_admins: \(.enforce_admins.enabled)\n  allow_force_pushes: \(.allow_force_pushes.enabled)"' \
  2>/dev/null || echo "  (no rules yet)"
echo ""

echo "🔧 Applying protection rules..."

# Build the JSON payload via heredoc + jq for robustness (avoids shell-quote
# gymnastics on nested objects).
PAYLOAD=$(jq -n --arg check "$REQUIRED_CHECK" '{
  required_status_checks: {
    strict: true,
    contexts: [$check]
  },
  enforce_admins: true,
  required_pull_request_reviews: {
    dismiss_stale_reviews: true,
    require_code_owner_reviews: true,
    required_approving_review_count: 1
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

   Required check:   $REQUIRED_CHECK
   Enforce admins:   ON
   Force pushes:     OFF
   Deletions:        OFF
   Linear history:   ON
   PR reviews:       1 (with CODEOWNERS + stale-dismiss)
   Conversations:    must resolve before merge
EOF
        exit 1
      }

echo ""
echo "✅ Branch protection applied:"
echo "   • Required:        '$REQUIRED_CHECK' (aggregate gate from quality.yml)"
echo "   • Reviews:         1 approving review + CODEOWNERS"
echo "   • Force-push:      blocked (even admins)"
echo "   • Deletion:        blocked"
echo "   • Linear history:  enforced (squash/rebase only)"
echo ""
echo "💡 Adding a new gate? Edit quality.yml, add to the aggregate's"
echo "   \`needs:\` list — branch protection updates automatically."
